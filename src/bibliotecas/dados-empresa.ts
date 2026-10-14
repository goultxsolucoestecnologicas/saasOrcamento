import "server-only";
import type { Prisma } from "@/gerado/prisma/client";
import { obterBanco } from "@/bibliotecas/banco";
import {
  ErroAcessoEmpresa,
  executarNaEmpresa,
} from "@/bibliotecas/contexto-empresa";

export type ContextoEmpresa = Readonly<{
  idEmpresa: string;
  idUsuario: string;
}>;

// Somente serviços internos recebem a transação. O idEmpresa vem do contexto confiável,
// nunca da entrada do navegador; cada consulta deve incluir este identificador.
export async function executarComDadosDaEmpresa<T>(
  operacao: (
    transacao: Prisma.TransactionClient,
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
      return operacao(transacao, contexto);
    }),
  );
}
