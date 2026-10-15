"use client";
import { useState } from "react";
import Link from "next/link";
import type {
  AssinanteAdmin,
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
  AcaoConfirmada,
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

function RegistroCobranca({
  cobranca: c,
  atualizar,
}: {
  cobranca: CobrancaAdmin;
  atualizar: () => void;
}) {
  const [detalhe, setDetalhe] = useState(false);
  return (
    <article className="admin-painel admin-pagina">
      <div className="admin-cabecalho">
        <div>
          <h2>
            <Link href={`/admin/assinantes/${c.idEmpresa}`}>
              {c.nomeEmpresa || "Empresa sem nome"}
            </Link>
          </h2>
          <p className="admin-secundario">Cobrança {c.idCobranca}</p>
        </div>
        <Selo situacao={c.situacao} />
      </div>
      <DadosAdmin
        itens={[
          [
            "Valor",
            <span key="valor" className="admin-valor">
              {reais(c.valorCentavos)}
            </span>,
          ],
          ["Vencimento", dataCurta(c.dataVencimento)],
          ["Acesso até", dataCurta(c.acessoAte)],
          ["Emissão", dataCurta(c.dataEmissao)],
          ["Pagamento", dataCurta(c.pagamento?.dataPagamento)],
          [
            "Confirmação",
            c.pagamento
              ? `${c.pagamento.nomeAdministrador} · ${dataCurta(c.pagamento.dataConfirmacao)}`
              : "Aguardando confirmação",
          ],
        ]}
      />
      {c.elegivelSuspensao && (
        <p className="admin-aviso">
          Prazo de tolerância encerrado. A empresa está elegível à suspensão
          manual.
        </p>
      )}
      <div className="admin-acoes">
        <Button
          variant="outline"
          onClick={() => setDetalhe(!detalhe)}
          aria-expanded={detalhe}
        >
          {detalhe ? "Fechar detalhes" : "Detalhes e ações"}
        </Button>
      </div>
      {detalhe && (
        <div className="admin-pagina">
          <section>
            <h3 className="admin-secundario">Observações administrativas</h3>
            <FormularioAdmin
              campos={[
                {
                  nome: "observacoes",
                  rotulo: "Observações",
                  tipo: "textarea",
                  valor: c.observacoes || "",
                  total: true,
                },
              ]}
              texto="Salvar observações"
              enviar={(d) =>
                requisitar(
                  `/api/admin/cobrancas/${c.idCobranca}`,
                  jsonAdmin(d, "PATCH"),
                )
              }
              aoSalvar={atualizar}
            />
          </section>
          {!c.pagamento && c.situacao !== "CANCELADA" && (
            <>
              <section className="admin-painel">
                <h2>Confirmar pagamento manual</h2>
                <p className="admin-secundario">
                  Confirme apenas após conferir o recebimento do Pix. Esta ação
                  registra o pagamento e atualiza o direito de acesso.
                </p>
                <ConfirmarPagamento cobranca={c} atualizar={atualizar} />
              </section>
              <AcaoConfirmada
                texto="Cancelar cobrança"
                titulo="Cancelar esta cobrança?"
                mensagem="A cobrança deixará de ser exigível. O histórico será preservado. Não é possível cancelar por esta ação um pagamento confirmado."
                perigosa
                executar={() =>
                  requisitar(
                    `/api/admin/cobrancas/${c.idCobranca}`,
                    jsonAdmin({ cancelar: true, confirmar: true }, "PATCH"),
                  )
                }
                aoConcluir={atualizar}
              />
            </>
          )}
        </div>
      )}
    </article>
  );
}

function ConfirmarPagamento({
  cobranca: c,
  atualizar,
}: {
  cobranca: CobrancaAdmin;
  atualizar: () => void;
}) {
  const [dataPagamento, setDataPagamento] = useState("");
  return (
    <div className="admin-formulario">
      <CampoFormulario
        id={`pagamento-${c.idCobranca}`}
        rotulo="Data do pagamento recebido"
        obrigatorio
      >
        <input
          type="date"
          value={dataPagamento}
          onChange={(e) => setDataPagamento(e.target.value)}
        />
      </CampoFormulario>
      {dataPagamento ? (
        <div>
          <AcaoConfirmada
            texto="Confirmar recebimento"
            titulo="O pagamento foi recebido?"
            mensagem={`Confirma o recebimento de ${reais(c.valorCentavos)} via Pix em ${dataCurta(dataPagamento)}? Essa confirmação será registrada em auditoria.`}
            executar={() =>
              requisitar(
                `/api/admin/cobrancas/${c.idCobranca}/pagamento`,
                jsonAdmin({
                  dataPagamento,
                  formaPagamento: "PIX",
                  confirmar: true,
                }),
              )
            }
            aoConcluir={atualizar}
          />
        </div>
      ) : (
        <p className="admin-secundario">
          Informe a data para confirmar o recebimento.
        </p>
      )}
    </div>
  );
}
export function CobrancasPainel({
  situacaoInicial = "",
  idEmpresaInicial = "",
}: {
  situacaoInicial?: string;
  idEmpresaInicial?: string;
}) {
  const [situacao, setSituacao] = useState(situacaoInicial);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [nova, setNova] = useState(false);
  const { dados, erro, atualizar } = useDadosAdmin<CobrancaAdmin[]>(
    `/api/admin/cobrancas?${new URLSearchParams({ situacao, inicio, fim, idEmpresa: idEmpresaInicial })}`,
  );
  return (
    <div className="admin-pagina">
      <CabecalhoAdmin
        titulo="Cobranças"
        descricao="Controle manual de cobranças e pagamentos via Pix."
      >
        <Button onClick={() => setNova(!nova)} aria-expanded={nova}>
          {nova ? "Fechar cadastro" : "Registrar cobrança"}
        </Button>
      </CabecalhoAdmin>
      {nova && (
        <NovaCobrancaAdmin
          idEmpresa={idEmpresaInicial}
          aoSalvar={() => {
            setNova(false);
            atualizar();
          }}
        />
      )}
      <section
        className="admin-painel admin-filtros"
        aria-label="Filtros de cobranças"
      >
        <CampoFormulario id="filtro-cobranca-situacao" rotulo="Situação">
          <select
            value={situacao}
            onChange={(e) => setSituacao(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="VENCIDA">Vencidas</option>
            <option value="PAGA">Pagas</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </CampoFormulario>
        <CampoFormulario
          id="filtro-cobranca-inicio"
          rotulo="Vencimento a partir de"
        >
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </CampoFormulario>
        <CampoFormulario id="filtro-cobranca-fim" rotulo="Vencimento até">
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
          titulo="Nenhuma cobrança encontrada"
          mensagem="Registre uma cobrança ou ajuste os filtros para consultar o histórico."
        />
      ) : (
        <div className="admin-lista">
          {dados.map((c) => (
            <RegistroCobranca
              key={c.idCobranca}
              cobranca={c}
              atualizar={atualizar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NovaCobrancaAdmin({
  idEmpresa,
  aoSalvar,
}: {
  idEmpresa: string;
  aoSalvar: () => void;
}) {
  const empresas = useDadosAdmin<AssinanteAdmin[]>("/api/admin/assinantes");
  const config = useDadosAdmin<ConfiguracaoAdmin>("/api/admin/configuracoes");
  if (!empresas.dados)
    return <EsperaAdmin erro={empresas.erro} atualizar={empresas.atualizar} />;
  if (!config.dados)
    return <EsperaAdmin erro={config.erro} atualizar={config.atualizar} />;
  return (
    <section className="admin-painel">
      <h2>Nova cobrança</h2>
      <FormularioAdmin
        campos={[
          {
            nome: "idEmpresa",
            rotulo: "Empresa",
            valor: idEmpresa,
            obrigatorio: true,
            opcoes: [
              { valor: "", texto: "Selecione a empresa" },
              ...empresas.dados.map((e) => ({
                valor: e.idEmpresa,
                texto: e.nome || "Empresa sem nome",
              })),
            ],
            total: true,
          },
          {
            nome: "valorCentavos",
            rotulo: "Valor (R$)",
            valor: decimalTexto(config.dados.valorMensalCentavos, 2),
            obrigatorio: true,
          },
          {
            nome: "dataVencimento",
            rotulo: "Vencimento",
            tipo: "date",
            obrigatorio: true,
          },
          {
            nome: "acessoAte",
            rotulo: "Direito de acesso até",
            tipo: "date",
            obrigatorio: true,
            descricao:
              "Período de acesso que será liberado após a confirmação do pagamento.",
          },
          {
            nome: "observacoes",
            rotulo: "Observações administrativas",
            tipo: "textarea",
            total: true,
          },
        ]}
        texto="Registrar cobrança"
        aviso="Registrar a cobrança não confirma pagamento. Valores de cobranças emitidas são preservados quando o preço do plano mudar."
        enviar={(d) =>
          requisitar(
            "/api/admin/cobrancas",
            jsonAdmin({
              ...d,
              valorCentavos: decimalInteiro(d.valorCentavos, 2),
            }),
          )
        }
        aoSalvar={aoSalvar}
      />
    </section>
  );
}
