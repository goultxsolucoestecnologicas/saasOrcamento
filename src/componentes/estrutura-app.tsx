"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { obterAutenticacaoCliente } from "@/bibliotecas/autenticacao-cliente";
import { FileText, Plus, Settings, LogOut } from "lucide-react";
import { EmpresaUi, requisitar } from "@/bibliotecas/api-cliente";
import { Button } from "@/componentes/ui/button";
export function EstruturaApp({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  const [empresa, setEmpresa] = useState<EmpresaUi>();
  const [erro, setErro] = useState("");
  const [saindo, setSaindo] = useState(false);
  useEffect(() => {
    let ativo = true;
    const atualizar = () =>
      requisitar<EmpresaUi>("/api/empresa")
        .then((valor) => {
          if (ativo) {
            setEmpresa(valor);
            setErro("");
          }
        })
        .catch((e) => {
          if (ativo) setErro(e.message);
        });
    void atualizar();
    window.addEventListener("empresa-atualizada", atualizar);
    return () => {
      ativo = false;
      window.removeEventListener("empresa-atualizada", atualizar);
    };
  }, [caminho]);
  return (
    <div className="estrutura">
      <a className="pular" href="#conteudo">
        Ir para conteúdo
      </a>
      <aside className="lateral">
        <Link className="marca" href="/orcamentos">
          {empresa?.logoChave && (
            // Imagem privada exige cookie; não passar pelo otimizador.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/empresa/logo?v=${encodeURIComponent(empresa.logoChave)}`}
              alt=""
              width="40"
              height="40"
            />
          )}
          <span title={empresa?.nome}>{empresa?.nome || "Orçamentos"}</span>
        </Link>
        <nav aria-label="Navegação principal">
          {[
            { href: "/orcamentos/novo", texto: "Novo orçamento", Icone: Plus },
            { href: "/orcamentos", texto: "Orçamentos", Icone: FileText },
            { href: "/configuracoes", texto: "Configurações", Icone: Settings },
          ].map(({ href, texto, Icone }) => (
            <Link
              key={href}
              href={href}
              aria-current={caminho === href ? "page" : undefined}
            >
              <Icone size={18} />
              {texto}
            </Link>
          ))}
        </nav>
        <Button
          variant="ghost"
          className="sair"
          disabled={saindo}
          onClick={async () => {
            setSaindo(true);
            try {
              const resultado = await obterAutenticacaoCliente().auth.signOut();
              if (resultado.error) throw new Error("Não foi possível sair.");
              // Recarrega a aplicação após encerrar a sessão, descartando estado privado.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign("/entrar");
            } catch {
              setErro("Não foi possível sair.");
            } finally {
              setSaindo(false);
            }
          }}
        >
          <LogOut />
          {saindo ? "Saindo…" : "Sair"}
        </Button>
      </aside>
      <main id="conteudo" className="conteudo">
        {erro && (
          <p role="alert" className="erro">
            {erro}
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
