import "server-only";
import { obterIdentidadeVerificada } from "@/bibliotecas/autenticacao";
import { obterBanco } from "@/bibliotecas/banco";
import { ErroAcessoEmpresa } from "@/bibliotecas/contexto-empresa";
import type { Prisma } from "@/gerado/prisma/client";

export async function obterAdministradorPlataforma() {
  const idSupabase = await obterIdentidadeVerificada();
  if (!idSupabase) throw new ErroAcessoEmpresa(401);
  const administrador = await obterBanco().adminPlataforma.findUnique({
    where: { idSupabase },
    select: { idAdmin: true, nome: true, ativo: true },
  });
  if (!administrador?.ativo) throw new ErroAcessoEmpresa(403);
  return { idAdmin: administrador.idAdmin, nome: administrador.nome };
}
export async function executarComoAdministrador<T>(
  operacao: (
    banco: Prisma.TransactionClient,
    administrador: { idAdmin: string; nome: string },
  ) => Promise<T>,
): Promise<T> {
  const administrador = await obterAdministradorPlataforma();
  return obterBanco().$transaction(
    async (banco) => {
      const atual = await banco.adminPlataforma.findUnique({
        where: { idAdmin: administrador.idAdmin },
      });
      if (!atual?.ativo) throw new ErroAcessoEmpresa(403);
      return operacao(banco, administrador);
    },
    { timeout: 15000 },
  );
}
