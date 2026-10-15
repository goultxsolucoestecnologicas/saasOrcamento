"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { FileText, Plus, Settings, LogOut, Menu, X } from "lucide-react";
import { obterAutenticacaoCliente } from "@/bibliotecas/autenticacao-cliente";
import { EmpresaUi, requisitar } from "@/bibliotecas/api-cliente";
import { Button } from "@/componentes/ui/button";
import { ErrorAlertDialog, LoadingButton } from "@/componentes/feedback";
export function EstruturaApp({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  const [empresa, setEmpresa] = useState<EmpresaUi>();
  const [erro, setErro] = useState("");
  const [menu, setMenu] = useState(false);
  const [saindo, setSaindo] = useState(false);
  useEffect(() => {
    let ativo = true;
    const atualizar = () =>
      requisitar<EmpresaUi>("/api/empresa")
        .then((e) => {
          if (ativo) setEmpresa(e);
        })
        .catch(() => {
          if (ativo)
            setErro(
              "Não foi possível carregar os dados da empresa. Atualize a página para tentar novamente.",
            );
        });
    void atualizar();
    window.addEventListener("empresa-atualizada", atualizar);
    return () => {
      ativo = false;
      window.removeEventListener("empresa-atualizada", atualizar);
    };
  }, [caminho]);
  useEffect(() => {
    const m = window.matchMedia("(min-width:1024px)");
    const fechar = () => {
      if (m.matches) setMenu(false);
    };
    m.addEventListener("change", fechar);
    return () => m.removeEventListener("change", fechar);
  }, []);
  const marca = (
    <Link className="marca" href="/orcamentos" onClick={() => setMenu(false)}>
      {empresa?.logoChave && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/empresa/logo?v=${encodeURIComponent(empresa.logoChave)}`}
          alt=""
          width={32}
          height={32}
        />
      )}
      <span title={empresa?.nome}>{empresa?.nome || "Orçamentos"}</span>
    </Link>
  );
  const links = (
    <nav className="menu-links" aria-label="Navegação principal">
      {[
        { href: "/orcamentos/novo", texto: "Novo orçamento", Icone: Plus },
        { href: "/orcamentos", texto: "Orçamentos", Icone: FileText },
        { href: "/configuracoes", texto: "Configurações", Icone: Settings },
      ].map(({ href, texto, Icone }) => {
        const ativo =
          href === "/orcamentos"
            ? caminho.startsWith(href) && caminho !== "/orcamentos/novo"
            : caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            onClick={() => setMenu(false)}
          >
            <Icone size={18} aria-hidden="true" />
            {texto}
          </Link>
        );
      })}
    </nav>
  );
  const sair = (
    <LoadingButton
      variant="ghost"
      className="sair"
      ocupado={saindo}
      textoOcupado="Saindo…"
      onClick={async () => {
        if (saindo) return;
        setSaindo(true);
        try {
          const r = await obterAutenticacaoCliente().auth.signOut();
          if (r.error) throw new Error();
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/entrar");
        } catch {
          setErro("Não foi possível sair. Tente novamente.");
        } finally {
          setSaindo(false);
        }
      }}
    >
      <LogOut aria-hidden="true" />
      Sair
    </LoadingButton>
  );
  return (
    <div className="estrutura">
      <a className="pular" href="#conteudo">
        Ir para conteúdo
      </a>
      <div className="mobile-header">
        {marca}
        <Dialog.Root open={menu} onOpenChange={setMenu}>
          <Dialog.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir navegação">
              <Menu aria-hidden="true" />
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="menu-conteudo">
              <div className="menu-cabecalho">
                <Dialog.Title className="dialog-titulo">Navegação</Dialog.Title>
                <Dialog.Close asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Fechar navegação"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="menu-descricao">
                {empresa?.nome || "Orçamentos"}
              </Dialog.Description>
              {links}
              {sair}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <aside className="lateral">
        {marca}
        {links}
        {sair}
      </aside>
      <main id="conteudo" className="conteudo" tabIndex={-1}>
        {children}
      </main>
      <ErrorAlertDialog
        aberto={!!erro}
        titulo="Acesso à empresa"
        mensagem={erro}
        aoFechar={() => setErro("")}
      />
    </div>
  );
}
