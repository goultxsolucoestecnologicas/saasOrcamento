import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterAdministradorPlataforma } from "@/bibliotecas/admin-autorizacao";
import { ErroAcessoEmpresa } from "@/bibliotecas/contexto-empresa";
import { EstruturaAdmin } from "@/componentes/admin/estrutura-admin";
import "@/componentes/admin/admin.css";

export const metadata: Metadata = {
  title: "Administração · OrçaFácil",
  robots: { index: false, follow: false },
};
export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await obterAdministradorPlataforma();
  } catch (erro) {
    if (erro instanceof ErroAcessoEmpresa) {
      if (erro.status === 401) redirect("/entrar");
      return (
        <main className="admin-conteudo">
          <section className="admin-painel admin-pagina">
            <h1>Acesso restrito</h1>
            <p>Esta área exige autorização de administrador da plataforma.</p>
            <a href="/entrar">Voltar ao acesso</a>
          </section>
        </main>
      );
    }
    throw erro;
  }
  return <EstruturaAdmin>{children}</EstruturaAdmin>;
}
