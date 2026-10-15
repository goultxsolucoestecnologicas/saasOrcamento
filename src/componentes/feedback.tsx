"use client";
import * as React from "react";
import * as AlertDialog from "@/componentes/ui/alert-dialog";
import { LoaderCircle, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
export { Skeleton } from "@/componentes/ui/skeleton";
import { cn } from "@/bibliotecas/utilitarios";

type CampoErro = { campo: string; mensagem: string };
export function LoadingButton({
  ocupado,
  textoOcupado = "Salvando…",
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & {
  ocupado?: boolean;
  textoOcupado?: string;
}) {
  return (
    <Button
      {...props}
      disabled={disabled || ocupado}
      aria-busy={ocupado || undefined}
    >
      {ocupado && (
        <LoaderCircle className="icone-carregando" aria-hidden="true" />
      )}
      {ocupado ? textoOcupado : children}
    </Button>
  );
}
export function CampoFormulario({
  id,
  rotulo,
  erro,
  obrigatorio,
  children,
  className,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  obrigatorio?: boolean;
  children: React.ReactElement;
  className?: string;
}) {
  const campo = React.cloneElement(
    children as React.ReactElement<Record<string, unknown>>,
    {
      id,
      "aria-required": obrigatorio || undefined,
      "aria-invalid": erro ? true : undefined,
      "aria-describedby": erro ? id + "-erro" : undefined,
    },
  );
  return (
    <div className={cn("campo", className)}>
      <label htmlFor={id}>
        {rotulo}
        {obrigatorio && <span aria-hidden="true"> *</span>}
      </label>
      {campo}
      {erro && (
        <p id={id + "-erro"} className="erro-campo">
          {erro}
        </p>
      )}
    </div>
  );
}
export function ErrorAlertDialog({
  aberto,
  titulo,
  mensagem,
  campos = [],
  aoFechar,
  aposFechar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  campos?: CampoErro[];
  aoFechar: () => void;
  aposFechar?: () => void;
}) {
  // Guarda a intenção antes de o pai limpar o estado de erro ao fechar.
  const focoAposFechar = React.useRef<(() => void) | undefined>(undefined);
  return (
    <AlertDialog.Root
      open={aberto}
      onOpenChange={(v) => {
        if (!v) {
          focoAposFechar.current = aposFechar;
          aoFechar();
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content
          className="dialog-conteudo"
          onCloseAutoFocus={(e) => {
            const focar = focoAposFechar.current ?? aposFechar;
            focoAposFechar.current = undefined;
            if (focar) {
              e.preventDefault();
              requestAnimationFrame(focar);
            }
          }}
        >
          <AlertDialog.Title className="dialog-titulo">
            {titulo}
          </AlertDialog.Title>
          <AlertDialog.Description className="dialog-descricao">
            {mensagem}
          </AlertDialog.Description>
          {!!campos.length && (
            <ul className="dialog-erros">
              {campos.map((c, i) => (
                <li key={c.campo + String(i)}>{c.mensagem}</li>
              ))}
            </ul>
          )}
          <div className="dialog-acoes">
            <AlertDialog.Cancel asChild>
              <Button>
                {campos.length ? "Corrigir informações" : "Entendi"}
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
export function ConfirmActionDialog({
  aberto,
  titulo,
  mensagem,
  ocupado,
  aoCancelar,
  aoConfirmar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  ocupado?: boolean;
  aoCancelar: () => void;
  aoConfirmar: () => void;
}) {
  return (
    <AlertDialog.Root
      open={aberto}
      onOpenChange={(v) => {
        if (!v && !ocupado) aoCancelar();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content
          className="dialog-conteudo"
          onEscapeKeyDown={(e) => {
            if (ocupado) e.preventDefault();
          }}
        >
          <AlertDialog.Title className="dialog-titulo">
            {titulo}
          </AlertDialog.Title>
          <AlertDialog.Description className="dialog-descricao">
            {mensagem}
          </AlertDialog.Description>
          <div className="dialog-acoes">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={ocupado}>
                Cancelar
              </Button>
            </AlertDialog.Cancel>
            <LoadingButton
              variant="destructive"
              ocupado={ocupado}
              textoOcupado="Excluindo…"
              onClick={aoConfirmar}
            >
              Confirmar exclusão
            </LoadingButton>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
export function PageHeader({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="cabecalho">
      <div>
        <h1>{titulo}</h1>
        {descricao && <p className="texto-secundario">{descricao}</p>}
      </div>
      {children}
    </header>
  );
}
export function EmptyState({
  titulo,
  mensagem,
  children,
}: {
  titulo: string;
  mensagem: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="estado-vazio">
      <FileText size={28} aria-hidden="true" />
      <h2>{titulo}</h2>
      <p>{mensagem}</p>
      {children}
    </section>
  );
}
export function EstadoErro({
  mensagem,
  tentarNovamente,
}: {
  mensagem: string;
  tentarNovamente?: () => void;
}) {
  return (
    <section className="estado-erro" role="alert">
      <h2>Não foi possível carregar</h2>
      <p>{mensagem}</p>
      {tentarNovamente && (
        <Button variant="outline" onClick={tentarNovamente}>
          <RefreshCw aria-hidden="true" />
          Tentar novamente
        </Button>
      )}
    </section>
  );
}
export function PageSkeleton({
  tipo = "formulario",
  cabecalho = true,
}: {
  tipo?: "formulario" | "lista" | "configuracoes";
  cabecalho?: boolean;
}) {
  return (
    <div
      className={"page-skeleton skeleton-" + tipo}
      role="status"
      aria-label="Carregando conteúdo"
    >
      <span className="sr-only">Carregando conteúdo…</span>
      {cabecalho && <Skeleton className="skeleton-titulo" />}
      {tipo === "lista" ? (
        <>
          {cabecalho && <Skeleton className="skeleton-busca" />}
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="skeleton-linha" />
          ))}
        </>
      ) : (
        <section className="painel">
          <Skeleton className="skeleton-titulo" />
          <div className="campos-grade">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="skeleton-campo" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
