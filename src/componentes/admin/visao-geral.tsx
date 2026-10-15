"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { ResumoAdmin } from "@/bibliotecas/admin-contratos";
import { reais } from "@/bibliotecas/api-cliente";
import { Button } from "@/componentes/ui/button";
import {
  CabecalhoAdmin,
  DadosAdmin,
  dataCurta,
  EsperaAdmin,
  Selo,
  useDadosAdmin,
  VazioAdmin,
} from "./compartilhados";

export function VisaoGeralAdmin() {
  const { dados, erro, atualizar } =
    useDadosAdmin<ResumoAdmin>("/api/admin/resumo");
  if (!dados) return <EsperaAdmin erro={erro} atualizar={atualizar} />;
  const indicadores: [string, string | number, string?][] = [
    ["Empresas cadastradas", dados.totalEmpresas],
    ["Assinaturas ativas", dados.empresasAtivas],
    ["Assinaturas suspensas", dados.empresasSuspensas],
    ["Empresas em atraso", dados.empresasEmAtraso],
    [
      "Receita mensal contratada",
      reais(dados.mrrCentavos),
      "MRR das assinaturas ativas",
    ],
    [
      "Recebido neste mês",
      reais(dados.recebidoMesCentavos),
      "Somente pagamentos confirmados",
    ],
    [
      "Pendente de recebimento",
      reais(dados.pendenteCentavos),
      "Cobranças em aberto",
    ],
  ];
  return (
    <div className="admin-pagina">
      <CabecalhoAdmin
        titulo="Visão geral"
        descricao="Acompanhe os assinantes e o controle financeiro da plataforma."
      >
        <Button asChild>
          <Link href="/admin/assinantes/novo">
            <Plus aria-hidden="true" />
            Cadastrar empresa
          </Link>
        </Button>
      </CabecalhoAdmin>
      <section
        className="admin-metricas"
        aria-label="Indicadores da plataforma"
      >
        {indicadores.map(([nome, valor, detalhe], i) => (
          <article
            key={nome}
            className={`admin-painel admin-metrica ${i >= 4 ? "admin-metrica-financeira" : ""}`}
          >
            <p>{nome}</p>
            <strong>{valor}</strong>
            {detalhe && <small>{detalhe}</small>}
          </article>
        ))}
      </section>
      <section className="admin-painel">
        <h2>Ações rápidas</h2>
        <div className="admin-acoes">
          <Button asChild variant="outline">
            <Link href="/admin/cobrancas">Registrar pagamento</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/assinantes">Consultar assinantes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/cobrancas?situacao=VENCIDA">
              Cobranças atrasadas
            </Link>
          </Button>
        </div>
      </section>
      <section className="admin-pagina" aria-labelledby="proximos-titulo">
        <div className="admin-cabecalho">
          <h2 id="proximos-titulo">Próximos vencimentos</h2>
          <Button asChild variant="ghost">
            <Link href="/admin/vencimentos">Ver todos</Link>
          </Button>
        </div>
        {dados.proximosVencimentos.length ? (
          <div className="admin-lista">
            {dados.proximosVencimentos.map((c) => (
              <article className="admin-registro" key={c.idCobranca}>
                <div className="admin-registro-topo">
                  <h3>
                    <Link href={`/admin/assinantes/${c.idEmpresa}`}>
                      {c.nomeEmpresa}
                    </Link>
                  </h3>
                  <Selo situacao={c.situacao} />
                </div>
                <DadosAdmin
                  itens={[
                    ["Valor", reais(c.valorCentavos)],
                    ["Vencimento", dataCurta(c.dataVencimento)],
                    [
                      "Prazo",
                      c.dias === 0
                        ? "Vence hoje"
                        : c.dias < 0
                          ? `${Math.abs(c.dias)} dias em atraso`
                          : `Em ${c.dias} dias`,
                    ],
                  ]}
                />
                <Button asChild variant="outline">
                  <Link href={`/admin/cobrancas?idEmpresa=${c.idEmpresa}`}>
                    Ver cobrança
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <VazioAdmin
            titulo="Nenhum vencimento próximo"
            mensagem="As próximas cobranças aparecerão aqui quando forem registradas."
          />
        )}
      </section>
    </div>
  );
}
