"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowRight, FileText, UserRound } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import {
  calcularOrcamento,
  calcularSubtotalItem,
} from "@/funcionalidades/orcamentos/calculos";
import { esquemaOrcamento } from "@/validacoes/orcamento";
import {
  decimalInteiro,
  decimalTexto,
  OrcamentoUi,
  reais,
  requisitar,
} from "@/bibliotecas/api-cliente";
type ItemFormulario = {
  chave: string;
  descricao: string;
  unidade: string;
  quantidade: string;
  valor: string;
};
const novoItem = (): ItemFormulario => ({
  chave: crypto.randomUUID(),
  descricao: "",
  unidade: "m²",
  quantidade: "1",
  valor: "0,00",
});
export function FormularioOrcamento({ id }: { id?: string }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(0);
  const [carregando, setCarregando] = useState(!!id);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
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
  const [situacao, setSituacao] = useState("RASCUNHO");
  const [descontoTipo, setDescontoTipo] = useState<"FIXO" | "PERCENTUAL">(
    "FIXO",
  );
  const [desconto, setDesconto] = useState("0,00");
  useEffect(() => {
    if (!id) return;
    requisitar<OrcamentoUi>(`/api/orcamentos/${id}`)
      .then((o) => {
        setCliente({
          clienteNome: o.clienteNome,
          clienteTelefone: o.clienteTelefone || "",
          clienteEndereco: o.clienteEndereco || "",
          clienteCidade: o.clienteCidade || "",
          clienteDocumento: o.clienteDocumento || "",
          observacoes: o.observacoes || "",
          validadeDias: o.validadeDias?.toString() || "",
        });
        setSituacao(o.situacao);
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
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id]);
  function entrada() {
    if (!cliente.clienteNome.trim())
      throw new Error("Informe o nome do cliente.");
    if (!itens.length) throw new Error("Adicione pelo menos um serviço.");
    const descontoValor = decimalInteiro(desconto, 2);
    if (descontoTipo === "PERCENTUAL" && descontoValor > 10000)
      throw new Error("O desconto não pode exceder 100%.");
    if (
      cliente.validadeDias &&
      (!Number.isInteger(Number(cliente.validadeDias)) ||
        Number(cliente.validadeDias) < 1 ||
        Number(cliente.validadeDias) > 365)
    )
      throw new Error("A validade deve ser de 1 a 365 dias.");
    return {
      ...cliente,
      validadeDias: cliente.validadeDias ? Number(cliente.validadeDias) : null,
      situacao,
      descontoTipo,
      descontoValor,
      itens: itens.map((i) => {
        if (!i.descricao.trim())
          throw new Error("Informe a descrição dos serviços.");
        const quantidadeMilesimos = decimalInteiro(i.quantidade, 3);
        if (!quantidadeMilesimos)
          throw new Error("A quantidade deve ser maior que zero.");
        return {
          descricao: i.descricao,
          unidade: i.unidade,
          quantidadeMilesimos,
          valorUnitarioCentavos: decimalInteiro(i.valor, 2),
        };
      }),
    };
  }
  function avancar() {
    try {
      if (etapa === 0 && !cliente.clienteNome.trim())
        throw new Error("Informe o nome do cliente.");
      if (etapa === 1) entrada();
      setErro("");
      setEtapa(etapa + 1);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Confira os campos.");
    }
  }
  async function salvar(pdf: boolean) {
    setOcupado(true);
    setErro("");
    try {
      const dados = entrada();
      const salvo = await requisitar<OrcamentoUi>(
        id ? `/api/orcamentos/${id}` : "/api/orcamentos",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        },
      );
      router.push(`/orcamentos/${salvo.idOrcamento}${pdf ? "?pdf=1" : ""}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setOcupado(false);
    }
  }
  let subtotal = 0;
  let total = 0;
  try {
    const valores = calcularOrcamento(esquemaOrcamento.parse(entrada()));
    subtotal = valores.subtotalCentavos;
    total = valores.totalCentavos;
  } catch {
    // Campos incompletos não exibem estimativas que o servidor recusaria.
  }
  function alterarItem(
    chave: string,
    campo: keyof ItemFormulario,
    valor: string,
  ) {
    setItens(
      itens.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)),
    );
  }
  if (carregando) return <p role="status">Carregando orçamento…</p>;
  return (
    <>
      <header className="cabecalho">
        <h1>{id ? "Editar orçamento" : "Novo orçamento"}</h1>
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
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      <div className="formulario-grade">
        <div>
          <section
            className={`painel etapa etapa-${etapa === 0 ? "visivel" : "oculta"}`}
          >
            <h2>
              <UserRound size={19} />
              Dados do cliente
            </h2>
            <div className="campos-grade">
              {[
                { campo: "clienteNome", rotulo: "Nome", obrigatorio: true },
                {
                  campo: "clienteTelefone",
                  rotulo: "Telefone",
                  obrigatorio: false,
                },
                {
                  campo: "clienteEndereco",
                  rotulo: "Endereço",
                  obrigatorio: false,
                },
                {
                  campo: "clienteCidade",
                  rotulo: "Cidade",
                  obrigatorio: false,
                },
                {
                  campo: "clienteDocumento",
                  rotulo: "CPF/CNPJ",
                  obrigatorio: false,
                },
              ].map(({ campo, rotulo, obrigatorio }) => (
                <label key={campo}>
                  {rotulo}
                  {obrigatorio ? " *" : ""}
                  <input
                    required={obrigatorio}
                    value={cliente[campo as keyof typeof cliente]}
                    onChange={(e) =>
                      setCliente({ ...cliente, [campo]: e.target.value })
                    }
                    maxLength={
                      campo === "clienteNome"
                        ? 150
                        : campo === "clienteEndereco"
                          ? 300
                          : campo === "clienteCidade"
                            ? 120
                            : 30
                    }
                    autoComplete={
                      campo === "clienteNome"
                        ? "name"
                        : campo === "clienteTelefone"
                          ? "tel"
                          : undefined
                    }
                  />
                </label>
              ))}
              <label>
                Validade em dias
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={cliente.validadeDias}
                  onChange={(e) =>
                    setCliente({ ...cliente, validadeDias: e.target.value })
                  }
                />
              </label>
              <label className="campo-largo">
                Observações
                <textarea
                  rows={3}
                  maxLength={4000}
                  value={cliente.observacoes}
                  onChange={(e) =>
                    setCliente({ ...cliente, observacoes: e.target.value })
                  }
                />
              </label>
            </div>
          </section>
          <section
            className={`painel etapa etapa-${etapa === 1 ? "visivel" : "oculta"}`}
          >
            <h2>
              <FileText size={19} />
              Itens do orçamento
            </h2>
            {itens.map((i, n) => (
              <div className="item-servico" key={i.chave}>
                <div className="item-topo">
                  <label>
                    Descrição do serviço {n + 1}
                    <input
                      value={i.descricao}
                      maxLength={500}
                      onChange={(e) =>
                        alterarItem(i.chave, "descricao", e.target.value)
                      }
                      required
                    />
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remover serviço ${n + 1}`}
                    onClick={() =>
                      setItens(itens.filter((j) => j.chave !== i.chave))
                    }
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
                <div className="campos-grade">
                  <label>
                    Quantidade
                    <input
                      inputMode="decimal"
                      value={i.quantidade}
                      onChange={(e) =>
                        alterarItem(i.chave, "quantidade", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Unidade
                    <select
                      value={i.unidade}
                      onChange={(e) =>
                        alterarItem(i.chave, "unidade", e.target.value)
                      }
                    >
                      {["m²", "m", "un", "h", "dia", "serviço"].map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Valor unitário (R$)
                    <input
                      inputMode="decimal"
                      value={i.valor}
                      onChange={(e) =>
                        alterarItem(i.chave, "valor", e.target.value)
                      }
                    />
                  </label>
                  <div className="item-total">
                    <span>Total</span>
                    <strong>
                      {(() => {
                        try {
                          return reais(
                            calcularSubtotalItem(
                              decimalInteiro(i.quantidade, 3),
                              decimalInteiro(i.valor, 2),
                            ),
                          );
                        } catch {
                          return "—";
                        }
                      })()}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="adicionar"
              onClick={() => setItens([...itens, novoItem()])}
            >
              <Plus />
              Adicionar serviço
            </Button>
            <div className="campos-grade desconto">
              <label>
                Tipo de desconto
                <select
                  value={descontoTipo}
                  onChange={(e) =>
                    setDescontoTipo(e.target.value as "FIXO" | "PERCENTUAL")
                  }
                >
                  <option value="FIXO">Valor em reais</option>
                  <option value="PERCENTUAL">Percentual</option>
                </select>
              </label>
              <label>
                Desconto {descontoTipo === "FIXO" ? "(R$)" : "(%)"}
                <input
                  inputMode="decimal"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                />
              </label>
            </div>
          </section>
          <section
            className={`painel etapa revisao-mobile etapa-${etapa === 2 ? "visivel" : "oculta"}`}
          >
            <h2>Resumo do orçamento</h2>
            <p>
              <strong>{cliente.clienteNome || "Nome do cliente"}</strong>
            </p>
            <p>{cliente.clienteEndereco}</p>
            <p>{cliente.clienteCidade}</p>
            <p>{cliente.clienteTelefone}</p>
            <p>{cliente.clienteDocumento}</p>
            <hr />
            {itens.map((i) => (
              <div className="linha-resumo" key={i.chave}>
                <span>
                  {i.descricao}
                  <small>
                    {i.quantidade} {i.unidade} × R$ {i.valor}
                  </small>
                </span>
              </div>
            ))}
            {cliente.observacoes && (
              <p className="observacoes">{cliente.observacoes}</p>
            )}
            <label>
              Situação
              <select
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
              >
                {[
                  "RASCUNHO",
                  "ENVIADO",
                  "APROVADO",
                  "RECUSADO",
                  "CANCELADO",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <div className="total">
              <span>Total do orçamento</span>
              <strong>{reais(total)}</strong>
            </div>
          </section>
        </div>
        <aside className="painel resumo-desktop">
          <h2>Resumo do orçamento</h2>
          <label>
            Situação
            <select
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
            >
              {["RASCUNHO", "ENVIADO", "APROVADO", "RECUSADO", "CANCELADO"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s.toLowerCase()}
                  </option>
                ),
              )}
            </select>
          </label>
          <p>{cliente.clienteNome || "Preencha os dados do cliente"}</p>
          <div className="linha-resumo">
            <span>Subtotal</span>
            <strong>{reais(subtotal)}</strong>
          </div>
          <div className="total">
            <span>Total</span>
            <strong>{reais(total)}</strong>
          </div>
          <p className="texto-secundario">
            Prévia. O total será validado ao salvar.
          </p>
        </aside>
      </div>
      <footer className="acoes-formulario">
        {etapa > 0 && (
          <Button
            type="button"
            variant="outline"
            className="voltar-mobile"
            onClick={() => setEtapa(etapa - 1)}
          >
            Voltar
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={ocupado}
          onClick={() => salvar(false)}
        >
          Salvar orçamento
        </Button>
        {etapa < 2 ? (
          <Button type="button" className="proximo-mobile" onClick={avancar}>
            Próximo
            <ArrowRight />
          </Button>
        ) : (
          <Button
            type="button"
            className="gerar-mobile"
            disabled={ocupado}
            onClick={() => salvar(true)}
          >
            <FileText />
            {ocupado ? "Salvando…" : "Gerar PDF"}
          </Button>
        )}
        <Button
          type="button"
          className="gerar-desktop"
          disabled={ocupado}
          onClick={() => salvar(true)}
        >
          <FileText />
          Gerar PDF
        </Button>
      </footer>
    </>
  );
}
