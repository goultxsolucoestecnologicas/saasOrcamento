"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import * as AlertDialog from "@/componentes/ui/alert-dialog";
import { Button } from "@/componentes/ui/button";
import {
  CampoFormulario,
  ErrorAlertDialog,
  EstadoErro,
  LoadingButton,
  PageSkeleton,
} from "@/componentes/feedback";
import { ErroRequisicao, requisitar } from "@/bibliotecas/api-cliente";

export const dataCurta = (valor: string | null | undefined) =>
  valor
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }).format(
        new Date(valor.length === 10 ? `${valor}T12:00:00-03:00` : valor),
      )
    : "Não definido";

function informarResultado(resultado: unknown) {
  if (resultado && typeof resultado === "object") {
    const retorno = resultado as {
      enviado?: boolean;
      aviso?: unknown;
      convite?: { enviado?: boolean; aviso?: unknown };
    };
    const convite = retorno.convite ?? retorno;
    if (convite.enviado === false) {
      toast.warning(
        typeof convite.aviso === "string"
          ? convite.aviso
          : "O cadastro foi preservado, mas o convite ainda não foi enviado. Verifique a configuração de envio e tente reenviar.",
        { duration: 12000 },
      );
      return;
    }
  }
  toast.success("Operação concluída com sucesso.");
}
export function Selo({ situacao }: { situacao: string }) {
  const nomes: Record<string, string> = {
    ATIVA: "Ativa",
    SUSPENSA: "Suspensa",
    CANCELADA: "Cancelada",
    PENDENTE: "Pendente",
    PAGA: "Paga",
    VENCIDA: "Vencida",
    ATIVO: "Ativo",
    INATIVO: "Inativo",
  };
  return (
    <span className={`admin-selo admin-selo-${situacao.toLowerCase()}`}>
      {nomes[situacao] || situacao}
    </span>
  );
}
export function CabecalhoAdmin({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: ReactNode;
}) {
  return (
    <header className="admin-cabecalho">
      <div>
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {children && <div className="admin-acoes">{children}</div>}
    </header>
  );
}
export function VazioAdmin({
  titulo = "Nenhum registro encontrado",
  mensagem = "Tente ajustar os filtros ou cadastre o primeiro registro.",
  children,
}: {
  titulo?: string;
  mensagem?: string;
  children?: ReactNode;
}) {
  return (
    <section className="admin-painel admin-vazio">
      <h2>{titulo}</h2>
      <p className="admin-secundario">{mensagem}</p>
      {children}
    </section>
  );
}
export function DadosAdmin({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className="admin-dados">
      {itens.map(([nome, valor]) => (
        <div key={nome}>
          <dt>{nome}</dt>
          <dd>{valor ?? "Não informado"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function useDadosAdmin<T>(url: string) {
  const [estado, setEstado] = useState<{
    url: string;
    dados?: T;
    erro?: string;
  }>({ url });
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const controlador = new AbortController();
    requisitar<T>(url, { signal: controlador.signal })
      .then((dados) => setEstado({ url, dados }))
      .catch((erro: unknown) => {
        if (!controlador.signal.aborted)
          setEstado({
            url,
            erro:
              erro instanceof Error
                ? erro.message
                : "Não foi possível carregar os dados.",
          });
      });
    return () => controlador.abort();
  }, [url, versao]);
  return {
    dados: estado.url === url ? estado.dados : undefined,
    erro: estado.url === url ? estado.erro : undefined,
    atualizar: () => {
      setEstado({ url });
      setVersao((v) => v + 1);
    },
  };
}
export function EsperaAdmin({
  erro,
  atualizar,
}: {
  erro?: string;
  atualizar: () => void;
}) {
  return erro ? (
    <EstadoErro mensagem={erro} tentarNovamente={atualizar} />
  ) : (
    <PageSkeleton tipo="lista" />
  );
}

export type CampoAdmin = {
  nome: string;
  rotulo: string;
  tipo?: string;
  obrigatorio?: boolean;
  descricao?: string;
  opcoes?: { valor: string; texto: string }[];
  valor?: string | number;
  total?: boolean;
  min?: string | number;
  max?: string | number;
  passo?: string | number;
};
export function FormularioAdmin({
  campos,
  texto = "Salvar alterações",
  enviar,
  aoSalvar,
  aviso,
}: {
  campos: CampoAdmin[];
  texto?: string;
  enviar: (dados: Record<string, string>) => Promise<unknown>;
  aoSalvar?: (resultado: unknown) => void;
  aviso?: string;
}) {
  const identificador = useId();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<ErroRequisicao>();
  const [dialogo, setDialogo] = useState(false);
  return (
    <>
      <form
        className="admin-formulario"
        noValidate
        onSubmit={async (evento) => {
          evento.preventDefault();
          if (ocupado) return;
          const formulario = evento.currentTarget;
          const dados = Object.fromEntries(
            new FormData(formulario).entries(),
          ) as Record<string, string>;
          setOcupado(true);
          setErro(undefined);
          try {
            const resultado = await enviar(dados);
            informarResultado(resultado);
            aoSalvar?.(resultado);
          } catch (falha) {
            const falhaValidada =
              falha instanceof ErroRequisicao
                ? falha
                : new ErroRequisicao(
                    falha instanceof Error
                      ? falha.message
                      : "Não foi possível salvar. Tente novamente.",
                  );
            setErro(falhaValidada);
            setDialogo(true);
          } finally {
            setOcupado(false);
          }
        }}
      >
        <div className="admin-grade">
          {campos.map((c) => (
            <CampoFormulario
              key={c.nome}
              id={`${identificador}-${c.nome}`}
              rotulo={c.rotulo}
              obrigatorio={c.obrigatorio}
              descricao={c.descricao}
              erro={erro?.campos.find((e) => e.campo === c.nome)?.mensagem}
              className={c.total ? "admin-largura-total" : undefined}
            >
              {c.opcoes ? (
                <select name={c.nome} defaultValue={c.valor ?? ""}>
                  {c.opcoes.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.texto}
                    </option>
                  ))}
                </select>
              ) : c.tipo === "textarea" ? (
                <textarea
                  name={c.nome}
                  defaultValue={c.valor}
                  maxLength={2000}
                />
              ) : (
                <input
                  name={c.nome}
                  type={c.tipo || "text"}
                  defaultValue={c.valor}
                  min={c.min}
                  max={c.max}
                  step={c.passo}
                  autoComplete={c.tipo === "email" ? "email" : "off"}
                />
              )}
            </CampoFormulario>
          ))}
        </div>
        {aviso && <p className="admin-aviso">{aviso}</p>}
        <div className="admin-formulario-rodape">
          <LoadingButton type="submit" ocupado={ocupado}>
            {texto}
          </LoadingButton>
        </div>
      </form>
      <ErrorAlertDialog
        aberto={dialogo}
        titulo="Confira as informações"
        mensagem={erro?.message || ""}
        campos={erro?.campos}
        aoFechar={() => setDialogo(false)}
        aposFechar={() => {
          const primeiro = erro?.campos[0]?.campo;
          if (primeiro)
            document.getElementById(`${identificador}-${primeiro}`)?.focus();
        }}
      />
    </>
  );
}

export function AcaoConfirmada({
  texto,
  titulo,
  mensagem,
  executar,
  aoConcluir,
  perigosa = false,
}: {
  texto: string;
  titulo: string;
  mensagem: string;
  executar: () => Promise<unknown>;
  aoConcluir: () => void;
  perigosa?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  return (
    <>
      <AlertDialog.Root
        open={aberto}
        onOpenChange={(v) => {
          if (!ocupado) setAberto(v);
        }}
      >
        <AlertDialog.Trigger asChild>
          <Button variant={perigosa ? "destructive" : "outline"}>
            {texto}
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content
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
                  Voltar
                </Button>
              </AlertDialog.Cancel>
              <LoadingButton
                ocupado={ocupado}
                textoOcupado="Confirmando…"
                variant={perigosa ? "destructive" : "default"}
                onClick={async () => {
                  setOcupado(true);
                  try {
                    const resultado = await executar();
                    setAberto(false);
                    informarResultado(resultado);
                    aoConcluir();
                  } catch (falha) {
                    setAberto(false);
                    setErro(
                      falha instanceof Error
                        ? falha.message
                        : "Não foi possível concluir a operação.",
                    );
                  } finally {
                    setOcupado(false);
                  }
                }}
              >
                Confirmar
              </LoadingButton>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <ErrorAlertDialog
        aberto={!!erro}
        titulo="Não foi possível concluir"
        mensagem={erro}
        aoFechar={() => setErro("")}
      />
    </>
  );
}

export const jsonAdmin = (dados: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(dados),
});
