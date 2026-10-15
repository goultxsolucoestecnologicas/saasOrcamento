import "server-only";
import { esquemaEmpresa } from "@/validacoes/empresa";
import { executarComDadosDaEmpresa } from "@/bibliotecas/dados-empresa";
import { ErroDominio } from "@/bibliotecas/erro-dominio";
import { traduzirErrosValidacao } from "@/validacoes/mensagens-validacao";

const selecaoEmpresa = {
  idEmpresa: true,
  nome: true,
  telefone: true,
  logoChave: true,
  descricaoAtividade: true,
  nomeResponsavel: true,
  cidade: true,
  estado: true,
  instagram: true,
  facebook: true,
  slogan: true,
} as const;
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
      "Confira os dados e limites dos campos da empresa.",
      400,
      traduzirErrosValidacao(resultado.error.issues),
    );
  return executarComDadosDaEmpresa((transacao, contexto) =>
    transacao.empresa.update({
      where: { idEmpresa: contexto.idEmpresa },
      data: {
        ...resultado.data,
        telefone: resultado.data.telefone ?? null,
      },
      select: selecaoEmpresa,
    }),
  );
}
