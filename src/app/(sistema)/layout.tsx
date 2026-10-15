import { EstruturaApp } from "@/componentes/estrutura-app";
import { redirect } from "next/navigation";
import {
  ErroAcessoEmpresa,
  executarNaEmpresa,
} from "@/bibliotecas/contexto-empresa";
export default async function LayoutSistema({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await executarNaEmpresa(async () => undefined);
  } catch (erro) {
    if (erro instanceof ErroAcessoEmpresa)
      redirect(erro.status === 401 ? "/entrar" : "/assinatura-indisponivel");
    throw erro;
  }
  return <EstruturaApp>{children}</EstruturaApp>;
}
