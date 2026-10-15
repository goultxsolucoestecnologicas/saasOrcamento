"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, FileText, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/componentes/ui/button";
import {
  CampoFormulario,
  ErrorAlertDialog,
  LoadingButton,
  PageSkeleton,
} from "@/componentes/feedback";
import { calcularOrcamento } from "@/funcionalidades/orcamentos/calculos";
import {
  esquemaOrcamento,
  type OrcamentoEntrada,
} from "@/validacoes/orcamento";
import { traduzirErrosValidacao } from "@/validacoes/mensagens-validacao";
import {
  decimalInteiro,
  decimalTexto,
  ErroRequisicao,
  type OrcamentoUi,
  reais,
  requisitar,
} from "@/bibliotecas/api-cliente";
import {
  idCampoItem,
  ItemOrcamentoEditor,
  type ItemFormulario,
  subtotalItemFormulario,
} from "@/componentes/item-orcamento-editor";
import {
  calcularPreviaOrcamento,
  ResumoOrcamento,
} from "@/componentes/resumo-orcamento";

type ErroCampo = { campo: string; mensagem: string };
const camposCliente = [
  {
    campo: "clienteNome",
    rotulo: "Nome",
    obrigatorio: true,
    limite: 150,
    autoComplete: "name",
  },
  {
    campo: "clienteTelefone",
    rotulo: "Telefone",
    obrigatorio: false,
    limite: 30,
    autoComplete: "tel",
  },
  {
    campo: "clienteEndereco",
    rotulo: "Endereço",
    obrigatorio: false,
    limite: 300,
    autoComplete: "street-address",
  },
  {
    campo: "clienteCidade",
    rotulo: "Cidade",
    obrigatorio: false,
    limite: 120,
    autoComplete: "address-level2",
  },
  {
    campo: "clienteDocumento",
    rotulo: "CPF/CNPJ",
    obrigatorio: false,
    limite: 30,
    autoComplete: "off",
  },
] as const;
const situacoes = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
  CANCELADO: "Cancelado",
};
const novoItem = (): ItemFormulario => ({
  chave: crypto.randomUUID(),
  descricao: "",
  unidade: "m²",
  quantidade: "1",
  valor: "0,00",
});
function inteiroOuInvalido(texto: string, casas: number) {
  try {
    return decimalInteiro(texto, casas);
  } catch {
    return Number.NaN;
  }
}

export function FormularioOrcamento({ id }: { id?: string }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(0);
  const [carregando, setCarregando] = useState(!!id);
  const [erroCarga, setErroCarga] = useState("");
  const [tentativaCarga, setTentativaCarga] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const enviando = useRef(false);
  const [acaoPendente, setAcaoPendente] = useState<"salvar" | "pdf" | null>(
    null,
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [dialogo, setDialogo] = useState<{
    mensagem: string;
    campos: ErroCampo[];
  } | null>(null);
  const focoErro = useRef<string | null>(null);
  const [cliente, setCliente] = useState({
    clienteNome: "",
    clienteTelefone: "",
    clienteEndereco: "",
    clienteCidade: "",
    clienteDocumento: "",
    observacoes: "",
    validadeDias: "",
  });
  const [itens, setItens] = useState<ItemFormulario[]>(
    id
      ? []
      : [
          {
            chave: "primeiro",
            descricao: "",
            unidade: "m²",
            quantidade: "1",
            valor: "0,00",
          },
        ],
  );
  const [situacao, setSituacao] =
    useState<OrcamentoEntrada["situacao"]>("RASCUNHO");
  const [descontoTipo, setDescontoTipo] = useState<"FIXO" | "PERCENTUAL">(
    "FIXO",
  );
  const [desconto, setDesconto] = useState("0,00");

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    requisitar<OrcamentoUi>(`/api/orcamentos/${id}`, {
      signal: controller.signal,
    })
      .then((o) => {
        if (controller.signal.aborted) return;
        setCliente({
          clienteNome: o.clienteNome,
          clienteTelefone: o.clienteTelefone || "",
          clienteEndereco: o.clienteEndereco || "",
          clienteCidade: o.clienteCidade || "",
          clienteDocumento: o.clienteDocumento || "",
          observacoes: o.observacoes || "",
          validadeDias: o.validadeDias?.toString() || "",
        });
        setSituacao(o.situacao as OrcamentoEntrada["situacao"]);
        setDescontoTipo(o.descontoTipo);
        setDesconto(decimalTexto(o.descontoValor, 2));
        setItens(
          o.itens.map((i) => ({
            chave: crypto.randomUUID(),
            descricao: i.descricao,
            unidade: i.unidade,
            quantidade: decimalTexto(i.quantidadeMilesimos, 3),
            valor: decimalTexto(i.valorUnitarioCentavos, 2),
          })),
        );
        setErroCarga("");
      })
      .catch((erro: unknown) => {
        if (controller.signal.aborted) return;
        const mensagem =
          erro instanceof ErroRequisicao
            ? erro.message
            : "Não conseguimos carregar este orçamento. Tente novamente.";
        setErroCarga(mensagem);
        setDialogo({ mensagem, campos: [] });
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [id, tentativaCarga]);

  function entradaBruta() {
    return {
      ...cliente,
      validadeDias: cliente.validadeDias.trim()
        ? Number(cliente.validadeDias)
        : null,
      situacao,
      descontoTipo,
      descontoValor: inteiroOuInvalido(desconto, 2),
      itens: itens.map((i) => ({
        descricao: i.descricao,
        unidade: i.unidade,
        quantidadeMilesimos: inteiroOuInvalido(i.quantidade, 3),
        valorUnitarioCentavos: inteiroOuInvalido(i.valor, 2),
      })),
    };
  }
  function errosValidacao() {
    const validacao = esquemaOrcamento.safeParse(entradaBruta());
    const campos = validacao.success
      ? []
      : traduzirErrosValidacao(validacao.error.issues);
    if (validacao.success) {
      try {
        calcularOrcamento(validacao.data);
      } catch (erro) {
        campos.push({
          campo: "descontoValor",
          mensagem:
            erro instanceof Error
              ? erro.message
              : "Confira os valores do orçamento.",
        });
      }
    }
    return { validacao, campos };
  }
  function idCampo(campo: string) {
    if (campo === "situacao" && window.matchMedia("(min-width:1024px)").matches)
      return "orcamento-situacao-desktop";
    const partes = campo.match(/^itens\.(\d+)\.(.+)$/);
    if (partes) {
      const item = itens[Number(partes[1])];
      return item ? idCampoItem(item.chave, partes[2]) : "adicionar-servico";
    }
    return campo === "itens" ? "adicionar-servico" : `orcamento-${campo}`;
  }
  function exibirErro(
    campos: ErroCampo[],
    mensagem = "Encontramos algumas informações que precisam ser corrigidas.",
  ) {
    setErros(
      Object.fromEntries(
        campos.map(({ campo, mensagem }) => [campo, mensagem]),
      ),
    );
    focoErro.current = campos[0]?.campo ?? null;
    setDialogo({ mensagem, campos });
  }
  function focarPrimeiroErro() {
    const campo = focoErro.current;
    if (!campo) return;
    const etapaCampo =
      campo.startsWith("itens") || campo.startsWith("desconto")
        ? 1
        : campo === "situacao"
          ? 2
          : 0;
    setEtapa(etapaCampo);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const elemento = document.getElementById(idCampo(campo));
        elemento?.focus({ preventScroll: true });
        elemento?.scrollIntoView({ block: "center", behavior: "instant" });
      }),
    );
    focoErro.current = null;
  }
  function limparErro(campo: string) {
    setErros((atuais) => {
      const novos = { ...atuais };
      delete novos[campo];
      return novos;
    });
  }
  function validarCampo(campo: string) {
    const mensagem = errosValidacao().campos.find(
      (erro) => erro.campo === campo,
    )?.mensagem;
    setErros((atuais) => {
      const novos = { ...atuais };
      if (mensagem) novos[campo] = mensagem;
      else delete novos[campo];
      return novos;
    });
  }
  function avancar() {
    if (enviando.current) return;
    const { campos } = errosValidacao();
    const relevantes =
      etapa === 0
        ? campos.filter(
            ({ campo }) =>
              !campo.startsWith("itens") &&
              !campo.startsWith("desconto") &&
              campo !== "situacao",
          )
        : campos;
    if (relevantes.length) {
      exibirErro(relevantes);
      return;
    }
    setEtapa((atual) => Math.min(atual + 1, 2));
    requestAnimationFrame(() =>
      document
        .getElementById(`titulo-etapa-${Math.min(etapa + 1, 2)}`)
        ?.focus({ preventScroll: true }),
    );
  }
  async function salvar(pdf: boolean) {
    if (enviando.current || carregando || erroCarga) return;
    const { validacao, campos } = errosValidacao();
    if (!validacao.success || campos.length) {
      exibirErro(campos);
      return;
    }
    enviando.current = true;
    setOcupado(true);
    setAcaoPendente(pdf ? "pdf" : "salvar");
    try {
      const salvo = await requisitar<OrcamentoUi>(
        id ? `/api/orcamentos/${id}` : "/api/orcamentos",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validacao.data),
        },
      );
      toast.success(id ? "Orçamento atualizado." : "Orçamento salvo.");
      router.push(`/orcamentos/${salvo.idOrcamento}${pdf ? "?pdf=1" : ""}`);
      // Bloqueie até sair da página para não criar outro orçamento.
    } catch (erro) {
      const mensagem =
        erro instanceof ErroRequisicao
          ? erro.message
          : "Não conseguimos salvar agora. Seus dados foram mantidos. Tente novamente.";
      exibirErro(erro instanceof ErroRequisicao ? erro.campos : [], mensagem);
      enviando.current = false;
      setOcupado(false);
      setAcaoPendente(null);
    }
  }
  const valores = calcularPreviaOrcamento(itens, descontoTipo, desconto);

  function alterarItem(
    chave: string,
    campo: keyof ItemFormulario,
    valor: string,
  ) {
    const indice = itens.findIndex((i) => i.chave === chave);
    const campoValidacao =
      campo === "quantidade"
        ? "quantidadeMilesimos"
        : campo === "valor"
          ? "valorUnitarioCentavos"
          : campo;
    limparErro(`itens.${indice}.${campoValidacao}`);
    setItens((atuais) =>
      atuais.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)),
    );
  }
  function focarDescricao(chave: string) {
    requestAnimationFrame(() =>
      document.getElementById(idCampoItem(chave, "descricao"))?.focus(),
    );
  }
  function adicionar() {
    if (itens.length >= 100 || ocupado) return;
    const item = novoItem();
    setItens((atuais) => [...atuais, item]);
    limparErro("itens");
    focarDescricao(item.chave);
  }
  function duplicar(indice: number) {
    if (itens.length >= 100 || ocupado) return;
    const item = { ...itens[indice], chave: crypto.randomUUID() };
    setItens((atuais) => [
      ...atuais.slice(0, indice + 1),
      item,
      ...atuais.slice(indice + 1),
    ]);
    setErros((atuais) =>
      Object.fromEntries(
        Object.entries(atuais).filter(([campo]) => !campo.startsWith("itens")),
      ),
    );
    focarDescricao(item.chave);
    toast.success("Serviço duplicado.");
  }
  function remover(indice: number) {
    if (ocupado) return;
    const destino = itens[indice + 1]?.chave ?? itens[indice - 1]?.chave;
    setItens((atuais) => atuais.filter((_, n) => n !== indice));
    setErros((atuais) =>
      Object.fromEntries(
        Object.entries(atuais).filter(([campo]) => !campo.startsWith("itens")),
      ),
    );
    requestAnimationFrame(() =>
      document
        .getElementById(
          destino ? idCampoItem(destino, "descricao") : "adicionar-servico",
        )
        ?.focus(),
    );
  }
  const dialogoErro = (
    <ErrorAlertDialog
      aberto={!!dialogo}
      titulo={
        erroCarga
          ? "Não foi possível carregar o orçamento"
          : "Não foi possível salvar o orçamento"
      }
      mensagem={dialogo?.mensagem ?? ""}
      campos={dialogo?.campos}
      aoFechar={() => setDialogo(null)}
      aposFechar={
        dialogo?.campos.some(({ campo }) => !!campo)
          ? focarPrimeiroErro
          : undefined
      }
    />
  );
  if (carregando) return <PageSkeleton tipo="formulario" />;
  if (erroCarga)
    return (
      <>
        <header className="cabecalho">
          <h1>Editar orçamento</h1>
        </header>
        <section className="painel estado-erro" role="alert">
          <h2>Não foi possível carregar</h2>
          <p>{erroCarga}</p>
          <Button
            onClick={() => {
              setCarregando(true);
              setErroCarga("");
              setDialogo(null);
              setTentativaCarga((n) => n + 1);
            }}
          >
            Tentar novamente
          </Button>
        </section>
        {dialogoErro}
      </>
    );

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        if (window.matchMedia("(max-width: 1023px)").matches && etapa < 2)
          avancar();
        else void salvar(false);
      }}
      aria-busy={ocupado}
    >
      <header className="cabecalho">
        <div>
          <h1>{id ? "Editar orçamento" : "Novo orçamento"}</h1>
          <p className="texto-secundario">
            Preencha os dados, adicione os serviços e confira o total.
          </p>
        </div>
        <span className="texto-secundario etapa-contador">
          Etapa {etapa + 1} de 3
        </span>
      </header>
      <ol className="etapas" aria-label="Etapas do orçamento">
        {["Cliente", "Itens", "Revisão"].map((nome, n) => (
          <li
            className={n === etapa ? "ativa" : ""}
            key={nome}
            aria-current={n === etapa ? "step" : undefined}
          >
            {n + 1}. {nome}
          </li>
        ))}
      </ol>
      <div className="formulario-grade">
        <div>
          <section
            className={`painel etapa etapa-${etapa === 0 ? "visivel" : "oculta"}`}
            aria-labelledby="titulo-etapa-0"
          >
            <h2 id="titulo-etapa-0" tabIndex={-1}>
              <UserRound size={19} aria-hidden="true" />
              Dados do cliente
            </h2>
            <div className="campos-grade">
              {camposCliente.map(
                ({ campo, rotulo, obrigatorio, limite, autoComplete }) => (
                  <div
                    key={campo}
                    className={
                      campo === "clienteEndereco" ? "campo-largo" : undefined
                    }
                  >
                    <CampoFormulario
                      id={`orcamento-${campo}`}
                      rotulo={rotulo}
                      obrigatorio={obrigatorio}
                      erro={erros[campo]}
                    >
                      <input
                        value={cliente[campo]}
                        disabled={ocupado}
                        onChange={(e) => {
                          setCliente((atual) => ({
                            ...atual,
                            [campo]: e.target.value,
                          }));
                          limparErro(campo);
                        }}
                        onBlur={() => validarCampo(campo)}
                        maxLength={limite}
                        autoComplete={autoComplete}
                        type={campo === "clienteTelefone" ? "tel" : "text"}
                        inputMode={
                          campo === "clienteDocumento" ? "numeric" : undefined
                        }
                      />
                    </CampoFormulario>
                  </div>
                ),
              )}
              <CampoFormulario
                id="orcamento-validadeDias"
                rotulo="Validade em dias"
                erro={erros.validadeDias}
              >
                <input
                  type="number"
                  min="1"
                  max="365"
                  inputMode="numeric"
                  value={cliente.validadeDias}
                  disabled={ocupado}
                  placeholder="Opcional"
                  onChange={(e) => {
                    setCliente((atual) => ({
                      ...atual,
                      validadeDias: e.target.value,
                    }));
                    limparErro("validadeDias");
                  }}
                  onBlur={() => validarCampo("validadeDias")}
                />
              </CampoFormulario>
              <div className="campo-largo">
                <CampoFormulario
                  id="orcamento-observacoes"
                  rotulo="Observações"
                  erro={erros.observacoes}
                >
                  <textarea
                    rows={3}
                    maxLength={4000}
                    value={cliente.observacoes}
                    disabled={ocupado}
                    onChange={(e) => {
                      setCliente((atual) => ({
                        ...atual,
                        observacoes: e.target.value,
                      }));
                      limparErro("observacoes");
                    }}
                  />
                </CampoFormulario>
              </div>
            </div>
          </section>
          <section
            className={`painel etapa etapa-${etapa === 1 ? "visivel" : "oculta"}`}
            aria-labelledby="titulo-etapa-1"
          >
            <h2 id="titulo-etapa-1" tabIndex={-1}>
              <FileText size={19} aria-hidden="true" />
              Itens do orçamento{" "}
              <span className="texto-secundario">({itens.length})</span>
            </h2>
            {itens.map((item, indice) => (
              <ItemOrcamentoEditor
                key={item.chave}
                item={item}
                indice={indice}
                erros={erros}
                ocupado={ocupado}
                podeDuplicar={itens.length < 100}
                aoAlterar={(campo, valor) =>
                  alterarItem(item.chave, campo, valor)
                }
                aoValidar={validarCampo}
                aoDuplicar={() => duplicar(indice)}
                aoRemover={() => remover(indice)}
              />
            ))}
            {!itens.length && (
              <p className="texto-secundario">
                Adicione o primeiro serviço para começar.
              </p>
            )}
            {erros.itens && (
              <p id="erro-itens" className="erro-campo" role="alert">
                {erros.itens}
              </p>
            )}
            <Button
              id="adicionar-servico"
              type="button"
              variant="outline"
              className="adicionar"
              disabled={ocupado || itens.length >= 100}
              aria-describedby={erros.itens ? "erro-itens" : undefined}
              onClick={adicionar}
            >
              <Plus />
              Adicionar serviço
            </Button>
            {itens.length >= 100 && (
              <p className="texto-secundario">
                Limite de 100 serviços por orçamento.
              </p>
            )}
            <div className="campos-grade desconto">
              <CampoFormulario
                id="orcamento-descontoTipo"
                rotulo="Tipo de desconto"
                erro={erros.descontoTipo}
              >
                <select
                  value={descontoTipo}
                  disabled={ocupado}
                  onChange={(e) => {
                    setDescontoTipo(e.target.value as "FIXO" | "PERCENTUAL");
                    limparErro("descontoValor");
                  }}
                >
                  <option value="FIXO">Valor em reais</option>
                  <option value="PERCENTUAL">Percentual</option>
                </select>
              </CampoFormulario>
              <CampoFormulario
                id="orcamento-descontoValor"
                rotulo={`Desconto ${descontoTipo === "FIXO" ? "(R$)" : "(%)"}`}
                erro={erros.descontoValor}
              >
                <input
                  inputMode="decimal"
                  value={desconto}
                  disabled={ocupado}
                  onChange={(e) => {
                    setDesconto(e.target.value);
                    limparErro("descontoValor");
                  }}
                  onBlur={() => validarCampo("descontoValor")}
                />
              </CampoFormulario>
            </div>
          </section>
          <section
            className={`painel etapa revisao-mobile etapa-${etapa === 2 ? "visivel" : "oculta"}`}
            aria-labelledby="titulo-etapa-2"
          >
            <h2 id="titulo-etapa-2" tabIndex={-1}>
              Resumo do orçamento
            </h2>
            <p>
              <strong>{cliente.clienteNome || "Nome do cliente"}</strong>
            </p>
            {[
              cliente.clienteEndereco,
              cliente.clienteCidade,
              cliente.clienteTelefone,
              cliente.clienteDocumento,
            ]
              .filter(Boolean)
              .map((texto, indice) => (
                <p key={indice}>{texto}</p>
              ))}
            <hr />
            {itens.map((item) => (
              <div className="linha-resumo" key={item.chave}>
                <span>
                  {item.descricao || "Serviço sem descrição"}
                  <small>
                    {item.quantidade} {item.unidade} × R$ {item.valor}
                  </small>
                </span>
                <strong>
                  {(() => {
                    const subtotal = subtotalItemFormulario(item);
                    return subtotal === null ? "—" : reais(subtotal);
                  })()}
                </strong>
              </div>
            ))}
            {cliente.observacoes && (
              <p className="observacoes">{cliente.observacoes}</p>
            )}
            <CampoFormulario
              id="orcamento-situacao"
              rotulo="Situação"
              erro={erros.situacao}
            >
              <select
                value={situacao}
                disabled={ocupado}
                onChange={(e) =>
                  setSituacao(e.target.value as OrcamentoEntrada["situacao"])
                }
              >
                {Object.entries(situacoes).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </CampoFormulario>
            <ResumoOrcamento valores={valores} />
          </section>
        </div>
        <aside
          className="painel resumo-desktop"
          aria-label="Resumo do orçamento"
        >
          <h2>Resumo do orçamento</h2>
          <p>{cliente.clienteNome || "Preencha os dados do cliente"}</p>
          <p className="texto-secundario">
            {itens.length} {itens.length === 1 ? "serviço" : "serviços"}
          </p>
          <CampoFormulario
            id="orcamento-situacao-desktop"
            rotulo="Situação"
            erro={erros.situacao}
          >
            <select
              value={situacao}
              disabled={ocupado}
              onChange={(e) =>
                setSituacao(e.target.value as OrcamentoEntrada["situacao"])
              }
            >
              {Object.entries(situacoes).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </CampoFormulario>
          <ResumoOrcamento valores={valores} />
        </aside>
      </div>
      <footer className="acoes-formulario">
        <ResumoOrcamento valores={valores} compacto />
        {etapa > 0 && (
          <Button
            type="button"
            variant="outline"
            className="voltar-mobile"
            disabled={ocupado}
            onClick={() => setEtapa((atual) => atual - 1)}
          >
            Voltar
          </Button>
        )}
        <LoadingButton
          type="button"
          variant="outline"
          ocupado={acaoPendente === "salvar"}
          textoOcupado="Salvando…"
          disabled={ocupado}
          onClick={() => void salvar(false)}
        >
          Salvar orçamento
        </LoadingButton>
        {etapa < 2 ? (
          <Button
            type="button"
            className="proximo-mobile"
            disabled={ocupado}
            onClick={avancar}
          >
            Próximo
            <ArrowRight />
          </Button>
        ) : (
          <LoadingButton
            type="button"
            className="gerar-mobile"
            ocupado={acaoPendente === "pdf"}
            textoOcupado="Salvando…"
            disabled={ocupado}
            onClick={() => void salvar(true)}
          >
            <FileText />
            Gerar PDF
          </LoadingButton>
        )}
        <LoadingButton
          type="button"
          className="gerar-desktop"
          ocupado={acaoPendente === "pdf"}
          textoOcupado="Salvando…"
          disabled={ocupado}
          onClick={() => void salvar(true)}
        >
          <FileText />
          Gerar PDF
        </LoadingButton>
      </footer>
      {dialogoErro}
    </form>
  );
}
