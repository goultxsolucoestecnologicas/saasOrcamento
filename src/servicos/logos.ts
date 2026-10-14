import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import sharp from "sharp";
import { obterAmbiente } from "@/bibliotecas/ambiente";
import { executarComDadosDaEmpresa } from "@/bibliotecas/dados-empresa";
import { ErroDominio } from "@/bibliotecas/erro-dominio";

const limiteLogo = 2 * 1024 * 1024;
function estaDentro(diretorio: string, caminho: string) {
  const diferenca = relative(diretorio, caminho);
  return (
    diferenca === "" || (!diferenca.startsWith("..") && !isAbsolute(diferenca))
  );
}

function obterDiretorioLogos() {
  const diretorio = resolve(obterAmbiente().ARMAZENAMENTO_LOCAL_DIRETORIO);
  if (
    estaDentro(resolve("public"), diretorio) ||
    estaDentro(resolve("src"), diretorio)
  )
    throw new Error("Diretório privado de armazenamento inválido.");
  return diretorio;
}

export function resolverCaminhoLogo(
  diretorio: string,
  idEmpresa: string,
  chave: string,
): string {
  const partes = chave.split("/");
  if (
    partes.length !== 2 ||
    partes[0] !== idEmpresa ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/i.test(
      partes[1],
    ) ||
    !/^[0-9a-f-]{36}$/i.test(idEmpresa)
  )
    throw new ErroDominio("Logo não encontrada.", 404);
  const base = resolve(diretorio);
  const caminho = resolve(base, ...partes);
  if (!estaDentro(base, caminho))
    throw new ErroDominio("Logo não encontrada.", 404);
  return caminho;
}

export async function normalizarLogo(arquivo: File): Promise<Buffer> {
  if (arquivo.size === 0 || arquivo.size > limiteLogo)
    throw new ErroDominio("A logo deve possuir até 2 MB.", 413);
  if (arquivo.type !== "image/png" && arquivo.type !== "image/jpeg")
    throw new ErroDominio("A logo deve ser uma imagem PNG ou JPEG.", 415);
  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  const png = conteudo
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg =
    conteudo.length >= 3 &&
    conteudo[0] === 255 &&
    conteudo[1] === 216 &&
    conteudo[2] === 255;
  if (
    (arquivo.type === "image/png" && !png) ||
    (arquivo.type === "image/jpeg" && !jpeg)
  )
    throw new ErroDominio(
      "O conteúdo do arquivo não corresponde ao tipo da imagem.",
    );
  try {
    const imagem = sharp(conteudo, {
      limitInputPixels: 16_000_000,
      failOn: "error",
    });
    const metadados = await imagem.metadata();
    if (
      !metadados.width ||
      !metadados.height ||
      metadados.width * metadados.height > 16_000_000 ||
      (metadados.pages ?? 1) > 1 ||
      !["png", "jpeg"].includes(metadados.format ?? "")
    )
      throw new Error();
    return await imagem.rotate().png().toBuffer();
  } catch {
    throw new ErroDominio(
      "Imagem inválida ou maior que o limite de 16 milhões de pixels.",
    );
  }
}

export async function salvarLogoEmpresa(arquivo: File) {
  // O processamento só começa depois da autenticação e autorização da empresa.
  let arquivoNovo: string | undefined;
  let arquivoCriado = false;
  try {
    return await executarComDadosDaEmpresa(async (transacao, contexto) => {
      const conteudo = await normalizarLogo(arquivo);
      const chave = `${contexto.idEmpresa}/${randomUUID()}.png`;
      arquivoNovo = resolverCaminhoLogo(
        obterDiretorioLogos(),
        contexto.idEmpresa,
        chave,
      );
      await mkdir(resolve(arquivoNovo, ".."), { recursive: true });
      await writeFile(arquivoNovo, conteudo, { flag: "wx", mode: 0o600 });
      arquivoCriado = true;
      return transacao.empresa.update({
        where: { idEmpresa: contexto.idEmpresa },
        data: { logoChave: chave },
        select: {
          idEmpresa: true,
          nome: true,
          telefone: true,
          logoChave: true,
        },
      });
    });
  } catch (erro) {
    // Apenas o arquivo exclusivo criado por esta chamada pode ser removido.
    if (arquivoCriado && arquivoNovo)
      await unlink(arquivoNovo).catch(() => undefined);
    throw erro;
  }
}

export async function buscarLogoEmpresa(): Promise<{
  conteudo: Buffer;
  tipo: "image/png";
} | null> {
  return executarComDadosDaEmpresa(async (transacao, contexto) => {
    const empresa = await transacao.empresa.findUnique({
      where: { idEmpresa: contexto.idEmpresa },
      select: { logoChave: true },
    });
    if (!empresa?.logoChave) return null;
    const caminho = resolverCaminhoLogo(
      obterDiretorioLogos(),
      contexto.idEmpresa,
      empresa.logoChave,
    );
    try {
      return { conteudo: await readFile(caminho), tipo: "image/png" };
    } catch (erro) {
      if (
        typeof erro === "object" &&
        erro !== null &&
        "code" in erro &&
        erro.code === "ENOENT"
      )
        return null;
      throw erro;
    }
  });
}
