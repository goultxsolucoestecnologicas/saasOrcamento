import "server-only";
import {
  criarEscopoEmpresa,
  type TransacaoEmpresa,
} from "@/bibliotecas/escopo-empresa";
import { obterBanco } from "@/bibliotecas/banco";
import {
  ErroAcessoEmpresa,
  executarNaEmpresa,
} from "@/bibliotecas/contexto-empresa";

export type ContextoEmpresa = Readonly<{
  idEmpresa: string;
  idUsuario: string;
}>;
export type { TransacaoEmpresa } from "@/bibliotecas/escopo-empresa";

// Somente delegates de domínio com escopo automático são entregues aos serviços.
export async function executarComDadosDaEmpresa<T>(
  operacao: (
    transacao: TransacaoEmpresa,
    contexto: ContextoEmpresa,
  ) => Promise<T>,
): Promise<T> {
  return executarNaEmpresa(async (contexto) =>
    obterBanco().$transaction(async (transacao) => {
      // Revalidação na transação: uma suspensão após a leitura da sessão impede a operação.
      const usuario = await transacao.usuario.findFirst({
        where: {
          id: contexto.idUsuario,
          idEmpresa: contexto.idEmpresa,
          ativo: true,
        },
        select: {
          empresa: {
            select: { ativa: true, assinatura: { select: { situacao: true } } },
          },
        },
      });
      if (
        !usuario?.empresa.ativa ||
        usuario.empresa.assinatura?.situacao !== "ATIVA"
      ) {
        throw new ErroAcessoEmpresa(403);
      }
      return operacao(
        criarEscopoEmpresa(transacao, contexto.idEmpresa),
        contexto,
      );
    }),
  );
}
