import "server-only";
import { z } from "zod";
import { executarComDadosDaEmpresa } from "@/bibliotecas/dados-empresa";
import { ErroDominio } from "@/bibliotecas/erro-dominio";
import { traduzirErrosValidacao } from "@/validacoes/mensagens-validacao";

const selecaoEmpresa = {
  idEmpresa: true,
  nome: true,
  telefone: true,
  logoChave: true,
} as const;
const esquemaEmpresa = z
  .object({
    nome: z.string().trim().min(1).max(150),
    telefone: z.string().trim().max(30).nullable().optional(),
  })
  .strict();

export async function buscarEmpresa() {
  return executarComDadosDaEmpresa(async (transacao, contexto) => {
    const empresa = await transacao.empresa.findUnique({
      where: { idEmpresa: contexto.idEmpresa },
      select: selecaoEmpresa,
    });
    if (!empresa) throw new ErroDominio("Empresa não encontrada.", 404);
    return empresa;
  });
}

export async function atualizarEmpresa(entrada: unknown) {
  const resultado = esquemaEmpresa.safeParse(entrada);
  if (!resultado.success)
    throw new ErroDominio(
      "Informe um nome válido e telefone com até 30 caracteres.",
      400,
      traduzirErrosValidacao(resultado.error.issues),
    );
  return executarComDadosDaEmpresa((transacao, contexto) =>
    transacao.empresa.update({
      where: { idEmpresa: contexto.idEmpresa },
      data: {
        nome: resultado.data.nome,
        telefone: resultado.data.telefone ?? null,
      },
      select: selecaoEmpresa,
    }),
  );
}
