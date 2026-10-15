import "server-only";
import { obterIdentidadeVerificada } from "@/bibliotecas/autenticacao";
import { obterBanco } from "@/bibliotecas/banco";
import { ErroAcessoEmpresa } from "@/bibliotecas/contexto-empresa";

export async function obterDestinoAcesso() {
  const idSupabase = await obterIdentidadeVerificada();
  if (!idSupabase) throw new ErroAcessoEmpresa(401);
  const banco = obterBanco();
  const admin = await banco.adminPlataforma.findUnique({
    where: { idSupabase },
    select: { ativo: true },
  });
  if (admin?.ativo) return { destino: "/admin" as const };
  const usuario = await banco.usuario.findUnique({
    where: { idAutenticacaoSupabase: idSupabase },
    select: {
      ativo: true,
      empresa: {
        select: { ativa: true, assinatura: { select: { situacao: true } } },
      },
    },
  });
  if (!usuario?.ativo) throw new ErroAcessoEmpresa(403);
  return {
    destino:
      usuario.empresa.ativa && usuario.empresa.assinatura?.situacao === "ATIVA"
        ? ("/orcamentos" as const)
        : ("/assinatura-indisponivel" as const),
  };
}
