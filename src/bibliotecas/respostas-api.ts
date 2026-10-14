import "server-only";
import { obterAmbiente } from "@/bibliotecas/ambiente";
import { ErroAcessoEmpresa } from "@/bibliotecas/contexto-empresa";
import { ErroDominio } from "@/bibliotecas/erro-dominio";

export const cabecalhosPrivados = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export function responderErroApi(erro: unknown): Response {
  if (erro instanceof ErroAcessoEmpresa || erro instanceof ErroDominio)
    return Response.json(
      { erro: erro.message },
      { status: erro.status, headers: cabecalhosPrivados },
    );
  return Response.json(
    { erro: "Não foi possível concluir a operação. Tente novamente." },
    { status: 500, headers: cabecalhosPrivados },
  );
}

export async function responderApi(
  operacao: () => Promise<unknown>,
  status = 200,
): Promise<Response> {
  try {
    return Response.json(
      { dados: await operacao() },
      { status, headers: cabecalhosPrivados },
    );
  } catch (erro) {
    return responderErroApi(erro);
  }
}

export function verificarOrigem(requisicao: Request): void {
  if (
    requisicao.headers.get("origin") !== new URL(obterAmbiente().APP_URL).origin
  )
    throw new ErroAcessoEmpresa(403);
}

export async function lerCorpoLimitado(
  requisicao: Request,
  limite: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const comprimento = requisicao.headers.get("content-length");
  if (
    comprimento !== null &&
    (!/^\d+$/.test(comprimento) || Number(comprimento) > limite)
  )
    throw new ErroDominio(
      "O conteúdo enviado ultrapassa o tamanho permitido.",
      413,
    );
  if (!requisicao.body)
    throw new ErroDominio("Conteúdo da requisição ausente.");
  const leitor = requisicao.body.getReader();
  const partes: Uint8Array[] = [];
  let tamanho = 0;
  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      tamanho += value.byteLength;
      if (tamanho > limite) {
        await leitor.cancel();
        throw new ErroDominio(
          "O conteúdo enviado ultrapassa o tamanho permitido.",
          413,
        );
      }
      partes.push(value);
    }
  } finally {
    leitor.releaseLock();
  }
  const corpo = new Uint8Array(tamanho);
  let posicao = 0;
  for (const parte of partes) {
    corpo.set(parte, posicao);
    posicao += parte.byteLength;
  }
  return corpo;
}

export async function lerJsonLimitado(requisicao: Request): Promise<unknown> {
  if (
    requisicao.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
    throw new ErroDominio("Envie o conteúdo como JSON.", 415);
  const corpo = await lerCorpoLimitado(requisicao, 128 * 1024);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(corpo));
  } catch {
    throw new ErroDominio("Conteúdo JSON inválido.");
  }
}

export async function lerLogoMultipart(requisicao: Request): Promise<File> {
  const tipo = requisicao.headers.get("content-type");
  if (!tipo?.toLowerCase().startsWith("multipart/form-data;"))
    throw new ErroDominio("Envie a logo como multipart/form-data.", 415);
  const corpo = await lerCorpoLimitado(requisicao, 3 * 1024 * 1024);
  let formulario: FormData;
  try {
    formulario = await new Response(corpo, {
      headers: { "content-type": tipo },
    }).formData();
  } catch {
    throw new ErroDominio("Formulário de upload inválido.");
  }
  const valores = [...formulario.entries()];
  if (
    valores.length !== 1 ||
    valores[0][0] !== "logo" ||
    !(valores[0][1] instanceof File)
  )
    throw new ErroDominio("Envie apenas um arquivo no campo logo.");
  return valores[0][1];
}
