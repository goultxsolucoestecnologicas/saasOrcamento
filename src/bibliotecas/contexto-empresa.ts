import "server-only";
import { obterIdentidadeVerificada } from "@/bibliotecas/autenticacao";
import { obterBanco } from "@/bibliotecas/banco";

export class ErroAcessoEmpresa extends Error {
  constructor(public readonly status: 401 | 403) {
    super(
      status === 401
        ? "Autenticação necessária."
        : "Acesso à empresa indisponível.",
    );
  }
}

// O contexto é reconstruído do banco em toda operação; não aceita idEmpresa do cliente.
export async function executarNaEmpresa<T>(
  operacao: (
    contexto: Readonly<{ idEmpresa: string; idUsuario: string }>,
  ) => Promise<T>,
): Promise<T> {
  const idAutenticacaoSupabase = await obterIdentidadeVerificada();
  if (!idAutenticacaoSupabase) throw new ErroAcessoEmpresa(401);

  const usuario = await obterBanco().usuario.findUnique({
    where: { idAutenticacaoSupabase },
    select: {
      id: true,
      idEmpresa: true,
      ativo: true,
      empresa: {
        select: { ativa: true, assinatura: { select: { situacao: true } } },
      },
    },
  });
  if (
    !usuario?.ativo ||
    !usuario.empresa.ativa ||
    usuario.empresa.assinatura?.situacao !== "ATIVA"
  )
    throw new ErroAcessoEmpresa(403);

  return operacao(
    Object.freeze({ idEmpresa: usuario.idEmpresa, idUsuario: usuario.id }),
  );
}
