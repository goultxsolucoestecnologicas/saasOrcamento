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
import { Button } from "@/componentes/ui/button";
export default function Orcamentos() {
  const [lista, setLista] = useState<OrcamentoUi[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [proximoNumero, setProximoNumero] = useState<number | null>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const geracao = useRef(0);
  useEffect(() => {
    ++geracao.current;
    let ativo = true;
    const controle = new AbortController();
    const temporizador = setTimeout(() => {
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
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(temporizador);
      controle.abort();
    };
  }, [busca]);
  return (
    <>
      <header className="cabecalho">
        <h1>Orçamentos</h1>
        <Button asChild>
          <Link href="/orcamentos/novo">
            <Plus />
            Novo orçamento
          </Link>
        </Button>
      </header>
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
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      {carregando ? (
        <p role="status">Carregando orçamentos…</p>
      ) : lista.length === 0 ? (
        <div className="painel vazio">
          <h2>
            {busca ? "Nenhum resultado" : "Seu primeiro orçamento começa aqui"}
          </h2>
          <p className="texto-secundario">
            {busca
              ? "Tente outro nome ou número."
              : "Cadastre o cliente e adicione os serviços para gerar seu PDF."}
          </p>
        </div>
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
                  {o.situacao.toLowerCase()}
                </span>
                <strong>{reais(o.totalCentavos)}</strong>
              </div>
              <ChevronRight size={18} />
            </Link>
          ))}
        </div>
      )}
      {!carregando && proximoNumero !== null && (
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
              setErro(
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
    </>
  );
}
