"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight } from "lucide-react";
import {
  OrcamentoUi,
  PaginaOrcamentosUi,
  reais,
  requisitar,
} from "@/bibliotecas/api-cliente";
import {
  PageHeader,
  PageSkeleton,
  EmptyState,
  EstadoErro,
  ErrorAlertDialog,
} from "@/componentes/feedback";
import { Button } from "@/componentes/ui/button";
export default function Orcamentos() {
  const [lista, setLista] = useState<OrcamentoUi[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [proximoNumero, setProximoNumero] = useState<number | null>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [erroAcao, setErroAcao] = useState("");
  const geracao = useRef(0);
  useEffect(() => {
    ++geracao.current;
    let ativo = true;
    const controle = new AbortController();
    const temporizador = setTimeout(
      () => {
        setCarregando(true);
        setErro("");
        requisitar<PaginaOrcamentosUi>(
          `/api/orcamentos?${new URLSearchParams({ busca })}`,
          { signal: controle.signal },
        )
          .then((pagina) => {
            if (ativo) {
              setLista(pagina.orcamentos);
              setProximoNumero(pagina.proximoNumero);
            }
          })
          .catch((e) => {
            if (ativo && e.name !== "AbortError") setErro(e.message);
          })
          .finally(() => {
            if (ativo) setCarregando(false);
          });
      },
      busca ? 250 : 0,
    );
    return () => {
      ativo = false;
      clearTimeout(temporizador);
      controle.abort();
    };
  }, [busca, tentativa]);
  return (
    <>
      <PageHeader
        titulo="Orçamentos"
        descricao="Consulte, edite e compartilhe seus orçamentos."
      >
        <Button asChild>
          <Link href="/orcamentos/novo">
            <Plus />
            Novo orçamento
          </Link>
        </Button>
      </PageHeader>
      <div className="busca">
        <Search size={18} />
        <input
          aria-label="Buscar por nome ou número"
          placeholder="Buscar por nome ou número…"
          maxLength={150}
          value={busca}
          onChange={(e) => {
            setCarregando(true);
            setBusca(e.target.value);
          }}
        />
      </div>
      {erro && (
        <EstadoErro
          mensagem={erro}
          tentarNovamente={() => setTentativa((v) => v + 1)}
        />
      )}
      {carregando ? (
        <PageSkeleton tipo="lista" cabecalho={false} />
      ) : erro ? null : lista.length === 0 ? (
        <EmptyState
          titulo={
            busca ? "Nenhum resultado" : "Seu primeiro orçamento começa aqui"
          }
          mensagem={
            busca
              ? "Tente outro nome ou número."
              : "Cadastre o cliente e adicione os serviços para gerar seu PDF."
          }
        >
          {!busca && (
            <Button asChild>
              <Link href="/orcamentos/novo">Criar orçamento</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="lista-orcamentos">
          {lista.map((o) => (
            <Link
              className="card-orcamento"
              href={`/orcamentos/${o.idOrcamento}`}
              key={o.idOrcamento}
            >
              <div>
                <strong>#{String(o.numero).padStart(5, "0")}</strong>
                <p>{o.clienteNome}</p>
                <span className="texto-secundario">
                  {new Date(o.dataCriacao).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="card-direita">
                <span className={`status status-${o.situacao.toLowerCase()}`}>
                  {{
                    RASCUNHO: "Rascunho",
                    ENVIADO: "Enviado",
                    APROVADO: "Aprovado",
                    RECUSADO: "Recusado",
                    CANCELADO: "Cancelado",
                  }[o.situacao] || o.situacao}
                </span>
                <strong>{reais(o.totalCentavos)}</strong>
              </div>
              <ChevronRight size={18} />
            </Link>
          ))}
        </div>
      )}
      {!carregando && !erro && proximoNumero !== null && (
        <Button
          variant="outline"
          className="mt-6"
          disabled={carregandoMais}
          onClick={async () => {
            setCarregandoMais(true);
            const geracaoPedido = geracao.current;
            try {
              const pagina = await requisitar<PaginaOrcamentosUi>(
                `/api/orcamentos?${new URLSearchParams({ busca, antesDeNumero: String(proximoNumero) })}`,
              );
              if (geracaoPedido !== geracao.current) return;
              setLista((atual) => [...atual, ...pagina.orcamentos]);
              setProximoNumero(pagina.proximoNumero);
            } catch (e) {
              setErroAcao(
                e instanceof Error
                  ? e.message
                  : "Falha ao carregar a próxima página.",
              );
            } finally {
              setCarregandoMais(false);
            }
          }}
        >
          {carregandoMais ? "Carregando…" : "Carregar mais"}
        </Button>
      )}
      <ErrorAlertDialog
        aberto={!!erroAcao}
        titulo="Não foi possível carregar mais orçamentos"
        mensagem={erroAcao}
        aoFechar={() => setErroAcao("")}
      />
    </>
  );
}
