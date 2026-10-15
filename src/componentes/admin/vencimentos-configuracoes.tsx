"use client";
import { useState } from "react";
import Link from "next/link";
import type {
  CobrancaAdmin,
  ConfiguracaoAdmin,
} from "@/bibliotecas/admin-contratos";
import {
  decimalInteiro,
  decimalTexto,
  reais,
  requisitar,
} from "@/bibliotecas/api-cliente";
import { Button } from "@/componentes/ui/button";
import { CampoFormulario } from "@/componentes/feedback";
import {
  CabecalhoAdmin,
  DadosAdmin,
  dataCurta,
  EsperaAdmin,
  FormularioAdmin,
  jsonAdmin,
  Selo,
  useDadosAdmin,
  VazioAdmin,
} from "./compartilhados";

export function VencimentosAdmin() {
  const [grupo, setGrupo] = useState("HOJE");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const { dados, erro, atualizar } = useDadosAdmin<CobrancaAdmin[]>(
    `/api/admin/vencimentos?${new URLSearchParams({ grupo, inicio, fim })}`,
  );
  return (
    <div className="admin-pagina">
      <CabecalhoAdmin
        titulo="Vencimentos"
        descricao="Acompanhe os prazos no fuso de Brasília. Suspensões permanecem manuais."
      />
      <section
        className="admin-painel admin-filtros"
        aria-label="Filtros de vencimentos"
      >
        <CampoFormulario id="grupo-vencimentos" rotulo="Período">
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            <option value="HOJE">Vencem hoje</option>
            <option value="PROXIMOS">Próximos 7 dias</option>
            <option value="VENCIDOS">Vencidos</option>
            <option value="REGULARIZADOS">Regularizados</option>
          </select>
        </CampoFormulario>
        <CampoFormulario
          id="inicio-vencimentos"
          rotulo="Vencimento a partir de"
        >
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </CampoFormulario>
        <CampoFormulario id="fim-vencimentos" rotulo="Vencimento até">
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </CampoFormulario>
      </section>
      {!dados ? (
        <EsperaAdmin erro={erro} atualizar={atualizar} />
      ) : !dados.length ? (
        <VazioAdmin
          titulo="Nenhum vencimento neste período"
          mensagem="Selecione outro período para consultar as cobranças."
        />
      ) : (
        <div className="admin-lista">
          {dados.map((c) => (
            <article className="admin-registro" key={c.idCobranca}>
              <div className="admin-registro-topo">
                <h2>
                  <Link href={`/admin/assinantes/${c.idEmpresa}`}>
                    {c.nomeEmpresa || "Empresa sem nome"}
                  </Link>
                </h2>
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
                  [
                    "Suspensão",
                    c.elegivelSuspensao
                      ? "Elegível à suspensão manual"
                      : c.situacao === "PAGA"
                        ? "Pagamento regularizado"
                        : "Sem indicação de suspensão",
                  ],
                ]}
              />
              <div className="admin-acoes">
                <Button asChild variant="outline">
                  <Link href={`/admin/cobrancas?idEmpresa=${c.idEmpresa}`}>
                    Ver cobranças
                  </Link>
                </Button>
                {c.elegivelSuspensao && (
                  <Button asChild variant="outline">
                    <Link href={`/admin/assinantes/${c.idEmpresa}`}>
                      Revisar assinatura
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConfiguracoesAdmin() {
  const { dados, erro, atualizar } = useDadosAdmin<ConfiguracaoAdmin>(
    "/api/admin/configuracoes",
  );
  if (!dados) return <EsperaAdmin erro={erro} atualizar={atualizar} />;
  return (
    <div className="admin-pagina">
      <CabecalhoAdmin
        titulo="Configurações"
        descricao="Defina os parâmetros comerciais usados nos novos cadastros."
      />
      <section className="admin-painel">
        <h2>Plano e regras comerciais</h2>
        <FormularioAdmin
          key={JSON.stringify(dados)}
          campos={[
            {
              nome: "nomePlano",
              rotulo: "Nome do plano",
              valor: dados.nomePlano,
              obrigatorio: true,
            },
            {
              nome: "valorMensalCentavos",
              rotulo: "Mensalidade de referência (R$)",
              valor: decimalTexto(dados.valorMensalCentavos, 2),
              obrigatorio: true,
            },
            {
              nome: "limiteUsuariosAtivos",
              rotulo: "Limite padrão de usuários ativos",
              tipo: "number",
              valor: dados.limiteUsuariosAtivos,
              min: 2,
              max: 2,
              passo: 1,
              obrigatorio: true,
              descricao: "O MVP permite até dois usuários ativos por empresa.",
            },
            {
              nome: "toleranciaDias",
              rotulo: "Tolerância de inadimplência (dias corridos)",
              tipo: "number",
              valor: dados.toleranciaDias,
              min: 0,
              max: 30,
              passo: 1,
              obrigatorio: true,
            },
            {
              nome: "nomeComercial",
              rotulo: "Nome comercial do SaaS",
              valor: dados.nomeComercial,
              obrigatorio: true,
            },
            {
              nome: "contatoComercial",
              rotulo: "Contato comercial",
              valor: dados.contatoComercial || "",
            },
          ]}
          aviso="Alterações de plano se aplicam aos novos contratos. Valores de cobranças já emitidas não serão alterados. O prazo de tolerância indica a elegibilidade para suspensão manual; nenhuma suspensão automática será executada."
          enviar={(d) =>
            requisitar(
              "/api/admin/configuracoes",
              jsonAdmin(
                {
                  ...d,
                  valorMensalCentavos: decimalInteiro(d.valorMensalCentavos, 2),
                  limiteUsuariosAtivos: Number(d.limiteUsuariosAtivos),
                  toleranciaDias: Number(d.toleranciaDias),
                },
                "PUT",
              ),
            )
          }
          aoSalvar={atualizar}
        />
      </section>
    </div>
  );
}
