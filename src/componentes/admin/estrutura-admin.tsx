"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { ErrorAlertDialog, LoadingButton } from "@/componentes/feedback";
import { obterAutenticacaoCliente } from "@/bibliotecas/autenticacao-cliente";

const entradas = [
  { href: "/admin", nome: "Visão geral", Icone: LayoutDashboard },
  { href: "/admin/assinantes", nome: "Assinantes", Icone: Building2 },
  { href: "/admin/cobrancas", nome: "Cobranças", Icone: CreditCard },
  { href: "/admin/vencimentos", nome: "Vencimentos", Icone: CalendarDays },
  { href: "/admin/configuracoes", nome: "Configurações", Icone: Settings },
];

export function EstruturaAdmin({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  const [menu, setMenu] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState("");
  const marca = (
    <Link href="/admin" className="admin-marca" onClick={() => setMenu(false)}>
      <ShieldCheck aria-hidden="true" />
      <span>
        OrçaFácil<small>Administração da plataforma</small>
      </span>
    </Link>
  );
  const links = (
    <nav aria-label="Administração" className="admin-links">
      {entradas.map(({ href, nome, Icone }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (href === "/admin" ? caminho === href : caminho.startsWith(href))
              ? "page"
              : undefined
          }
          onClick={() => setMenu(false)}
        >
          <Icone size={18} aria-hidden="true" />
          {nome}
        </Link>
      ))}
    </nav>
  );
  const sair = (
    <LoadingButton
      variant="ghost"
      ocupado={saindo}
      textoOcupado="Saindo…"
      onClick={async () => {
        setSaindo(true);
        try {
          const resposta = await obterAutenticacaoCliente().auth.signOut();
          if (resposta.error) throw new Error();
          // Descarta o estado privado e o cache de navegação ao encerrar a sessão.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/entrar");
        } catch {
          setErro("Não foi possível encerrar a sessão. Tente novamente.");
          setSaindo(false);
        }
      }}
    >
      <LogOut aria-hidden="true" />
      Sair
    </LoadingButton>
  );
  return (
    <div className="admin-estrutura">
      <a className="pular" href="#admin-conteudo">
        Ir para conteúdo
      </a>
      <header className="admin-mobile">
        {marca}
        <Dialog.Root open={menu} onOpenChange={setMenu}>
          <Dialog.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir navegação administrativa"
            >
              <Menu />
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="admin-menu">
              <div className="admin-menu-topo">
                <Dialog.Title>Administração</Dialog.Title>
                <Dialog.Close asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Fechar navegação"
                  >
                    <X />
                  </Button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">
                Navegação do painel administrativo da plataforma.
              </Dialog.Description>
              {links}
              {sair}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>
      <aside className="admin-sidebar">
        {marca}
        {links}
        <div className="admin-sidebar-rodape">
          <p>Acesso restrito ao administrador da plataforma.</p>
          {sair}
        </div>
      </aside>
      <main id="admin-conteudo" className="admin-conteudo" tabIndex={-1}>
        {children}
      </main>
      <ErrorAlertDialog
        aberto={!!erro}
        titulo="Não foi possível sair"
        mensagem={erro}
        aoFechar={() => setErro("")}
      />
    </div>
  );
}
