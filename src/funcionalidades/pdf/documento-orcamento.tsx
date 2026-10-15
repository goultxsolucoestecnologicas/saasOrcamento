import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

import { metricasHelvetica } from "./metricas-helvetica";
export interface DadosDocumentoOrcamento {
  numero: number;
  dataCriacao: Date | string;
  dataEmissao?: Date | string | null;
  tipoDocumento?: "PEDIDO" | "ORCAMENTO";
  situacao: "RASCUNHO" | "ENVIADO" | "APROVADO" | "RECUSADO" | "CANCELADO";
  clienteNome: string;
  clienteDocumento?: string | null;
  clienteTelefone?: string | null;
  clienteEndereco?: string | null;
  clienteNumeroEndereco?: string | null;
  clienteCidade?: string | null;
  clienteInscricaoEstadual?: string | null;
  observacoes?: string | null;
  validadeDias?: number | null;
  descontoTipo: "FIXO" | "PERCENTUAL";
  descontoValor: number;
  subtotalCentavos: number;
  totalCentavos: number;
  itens: Array<{
    descricao: string;
    unidade: string;
    quantidadeMilesimos: number;
    valorUnitarioCentavos: number;
    subtotalCentavos: number;
  }>;
}
export interface EmpresaDocumento {
  nome: string;
  telefone?: string | null;
  logo?: string | null;
  descricaoAtividade?: string | null;
  nomeResponsavel?: string | null;
  cidade?: string | null;
  estado?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  slogan?: string | null;
}
export function formatarReaisPdf(centavos: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}
export function formatarQuantidadePdf(milesimos: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
    milesimos / 1000,
  );
}
export function formatarDataPdf(
  documento: Pick<DadosDocumentoOrcamento, "dataEmissao" | "dataCriacao">,
) {
  // DATE is serialized at UTC midnight. Legacy timestamps retain their original local calendar day.
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: documento.dataEmissao ? "UTC" : "America/Sao_Paulo",
  }).format(new Date(documento.dataEmissao ?? documento.dataCriacao));
}

export function quebrarLinhasPdf(
  texto: string,
  largura: number,
  tamanho = 8,
  negrito = false,
): string[] {
  const metricas: Record<string, number> =
    metricasHelvetica[negrito ? "Helvetica-Bold" : "Helvetica"];
  const medir = (valor: string) =>
    (Array.from(valor).reduce((s, c) => s + (metricas[c] ?? 1000), 0) *
      tamanho) /
    1000;
  const resultado: string[] = [];
  for (const paragrafo of texto.replaceAll("\r\n", "\n").split("\n")) {
    let linha = "";
    for (const caractere of paragrafo) {
      if (linha && medir(linha + caractere) > largura - 2) {
        // Prefer word boundaries; long unbroken words are split without discarding characters.
        const espaco = linha.lastIndexOf(" ");
        if (espaco > 0) {
          resultado.push(linha.slice(0, espaco));
          linha = linha.slice(espaco + 1);
        } else {
          resultado.push(linha);
          linha = "";
        }
      }
      linha += caractere;
    }
    resultado.push(linha);
  }
  return resultado;
}
const LARGURA = 523.28;
const ALTURA_LINHA = 11;
const COLUNAS = [
  LARGURA * 0.12,
  LARGURA * 0.54,
  LARGURA * 0.17,
  LARGURA * 0.17,
];
const estilos = StyleSheet.create({
  pagina: {
    height: 841.89,
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#171717",
    lineHeight: 1.2,
  },
  cabecalho: {
    borderWidth: 0.8,
    borderColor: "#333333",
    borderRadius: 4,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logo: { width: 108, height: 80, objectFit: "contain" },
  linhaCliente: {
    flexDirection: "row",
    borderBottomWidth: 0.45,
    borderColor: "#777777",
    paddingTop: 3,
    paddingBottom: 3,
  },
  selecao: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 7,
    marginTop: 6,
    marginBottom: 7,
    fontSize: 10,
  },
  caixa: {
    width: 11,
    height: 11,
    borderWidth: 0.7,
    borderColor: "#333333",
    textAlign: "center",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  tabela: {
    borderTopWidth: 0.65,
    borderLeftWidth: 0.65,
    borderColor: "#555555",
    position: "relative",
  },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 0.65,
    borderColor: "#555555",
  },
  celula: {
    borderRightWidth: 0.65,
    borderColor: "#555555",
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  marca: {
    position: "absolute",
    width: 275,
    height: 200,
    left: (LARGURA - 275) / 2,
    opacity: 0.09,
    objectFit: "contain",
  },
  rodape: {
    position: "absolute",
    left: 36,
    right: 36,
    top: 741,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  assinatura: {
    width: 265,
    borderTopWidth: 0.65,
    borderColor: "#555555",
    textAlign: "center",
    paddingTop: 5,
    fontSize: 8,
  },
  total: {
    borderWidth: 0.8,
    borderColor: "#333333",
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
});
type LinhaItem = {
  item: DadosDocumentoOrcamento["itens"][number];
  linhas: string[];
  continuacao: boolean;
  quantidade: string[];
  preco: string[];
  total: string[];
  altura: number;
};
type PaginaPlanejada = {
  observacoes: string[];
  itens: LinhaItem[];
  primeira: boolean;
  yTabela: number;
  alturaTabela: number;
};
function linhasEmpresa(empresa: EmpresaDocumento) {
  return [
    empresa.nome,
    empresa.descricaoAtividade,
    [empresa.telefone, empresa.nomeResponsavel].filter(Boolean).join("  |  "),
    [empresa.cidade, empresa.estado].filter(Boolean).join(" - "),
    empresa.instagram && `Instagram: ${empresa.instagram}`,
    empresa.facebook && `Facebook: ${empresa.facebook}`,
    empresa.slogan,
  ]
    .filter((v): v is string => !!v)
    .flatMap((v, indice) =>
      quebrarLinhasPdf(
        v,
        empresa.logo ? 375 : 501,
        indice === 0 ? 14 : 8.5,
        indice === 0,
      ).map((texto) => ({ texto, principal: indice === 0 })),
    );
}
function linhasCliente(orcamento: DadosDocumentoOrcamento) {
  return [
    [
      { rotulo: "Data", valor: formatarDataPdf(orcamento) },
      { rotulo: "Nº", valor: String(orcamento.numero).padStart(5, "0") },
    ],
    [{ rotulo: "Nome", valor: orcamento.clienteNome }],
    [
      { rotulo: "End.", valor: orcamento.clienteEndereco ?? "" },
      { rotulo: "Nº", valor: orcamento.clienteNumeroEndereco ?? "" },
    ],
    [
      { rotulo: "Cidade", valor: orcamento.clienteCidade ?? "" },
      { rotulo: "Fone", valor: orcamento.clienteTelefone ?? "" },
    ],
    [
      { rotulo: "CPF/CNPJ", valor: orcamento.clienteDocumento ?? "" },
      { rotulo: "Insc. Est.", valor: orcamento.clienteInscricaoEstadual ?? "" },
    ],
  ].map((campos, indice) =>
    campos.map((campo, i) => ({
      ...campo,
      largura:
        campos.length === 1
          ? LARGURA
          : indice === 2
            ? i === 0
              ? LARGURA * 0.8
              : LARGURA * 0.2
            : LARGURA / 2,
      linhas: quebrarLinhasPdf(
        `${campo.rotulo}: ${campo.valor}`,
        campos.length === 1
          ? LARGURA - 8
          : indice === 2
            ? i === 0
              ? LARGURA * 0.8 - 8
              : LARGURA * 0.2 - 8
            : LARGURA / 2 - 8,
      ),
    })),
  );
}
export function planejarDocumentoPdf(
  orcamento: DadosDocumentoOrcamento,
  empresa: EmpresaDocumento,
) {
  const identidade = linhasEmpresa(empresa);
  const alturaCabecalho = Math.max(
    empresa.logo ? 98 : 52,
    identidade.reduce((s, l) => s + (l.principal ? 18 : 12), 0) + 18,
  );
  const clientes = linhasCliente(orcamento);
  const alturaCliente = clientes.reduce(
    (s, campos) =>
      s + Math.max(...campos.map((c) => c.linhas.length)) * ALTURA_LINHA + 6,
    0,
  );
  const base = 36 + alturaCabecalho + 31;
  const paginas: PaginaPlanejada[] = [];
  const nova = (): PaginaPlanejada => ({
    observacoes: [],
    itens: [],
    primeira: paginas.length === 0,
    yTabela: base + (paginas.length === 0 ? alturaCliente : 18),
    alturaTabela: 0,
  });
  let pagina = nova();
  paginas.push(pagina);
  if (orcamento.observacoes) {
    const linhas = quebrarLinhasPdf(
      `Obs.: ${orcamento.observacoes}`,
      LARGURA - 10,
    );
    while (linhas.length) {
      const capacidade = Math.max(
        1,
        Math.floor((710 - pagina.yTabela - 34) / ALTURA_LINHA),
      );
      pagina.observacoes = linhas.splice(0, capacidade);
      pagina.yTabela += pagina.observacoes.length * ALTURA_LINHA + 7;
      if (linhas.length) {
        pagina = nova();
        paginas.push(pagina);
      }
    }
  }
  for (const item of orcamento.itens) {
    const linhas = quebrarLinhasPdf(item.descricao, COLUNAS[1] - 10);
    const quantidade = quebrarLinhasPdf(
      `${formatarQuantidadePdf(item.quantidadeMilesimos)} ${item.unidade}`,
      COLUNAS[0] - 10,
    );
    const preco = quebrarLinhasPdf(
      formatarReaisPdf(item.valorUnitarioCentavos),
      COLUNAS[2] - 10,
    );
    const total = quebrarLinhasPdf(
      formatarReaisPdf(item.subtotalCentavos),
      COLUNAS[3] - 10,
    );
    const alturaInteira = Math.max(
      23,
      Math.max(linhas.length, quantidade.length, preco.length, total.length) *
        ALTURA_LINHA +
        8,
    );
    const disponivelAtual =
      720 -
      pagina.yTabela -
      23 -
      pagina.itens.reduce((s, l) => s + l.altura, 0);
    const disponivelNova = 720 - (base + 18) - 23;
    if (alturaInteira > disponivelAtual && alturaInteira <= disponivelNova) {
      pagina = nova();
      paginas.push(pagina);
    }
    let continuacao = false;
    while (linhas.length) {
      const ocupado = pagina.itens.reduce((s, l) => s + l.altura, 0);
      const capacidade = Math.floor(
        (720 -
          pagina.yTabela -
          23 -
          ocupado -
          8 -
          (continuacao ? ALTURA_LINHA : 0)) /
          ALTURA_LINHA,
      );
      const minimoOutrasColunas = continuacao
        ? 1
        : Math.max(quantidade.length, preco.length, total.length);
      if (
        capacidade < minimoOutrasColunas ||
        720 - pagina.yTabela - 23 - ocupado < 23
      ) {
        pagina = nova();
        paginas.push(pagina);
        continue;
      }
      const trecho = linhas.splice(0, capacidade);
      pagina.itens.push({
        item,
        linhas: trecho,
        continuacao,
        quantidade: continuacao ? [] : quantidade,
        preco: continuacao ? [] : preco,
        total: continuacao ? [] : total,
        altura: Math.max(
          23,
          Math.max(trecho.length, minimoOutrasColunas) * ALTURA_LINHA +
            8 +
            (continuacao ? ALTURA_LINHA : 0),
        ),
      });
      continuacao = true;
      if (linhas.length) {
        pagina = nova();
        paginas.push(pagina);
      }
    }
  }
  for (const p of paginas)
    p.alturaTabela = p.itens.length ? 720 - p.yTabela : 0;
  return { paginas, identidade, alturaCabecalho, clientes };
}
/** Compatibility helper groups whole items; the document planner also supports oversized row continuations. */
export function paginarItensPdf(itens: DadosDocumentoOrcamento["itens"]) {
  const paginas: DadosDocumentoOrcamento["itens"][] = [[]];
  let ocupado = 0;
  for (const item of itens) {
    const altura = Math.max(
      23,
      quebrarLinhasPdf(item.descricao, COLUNAS[1] - 10).length * ALTURA_LINHA +
        8,
    );
    if (ocupado + altura > 440 && paginas.at(-1)!.length) {
      paginas.push([]);
      ocupado = 0;
    }
    paginas.at(-1)!.push(item);
    ocupado += altura;
  }
  return paginas;
}
function LinhasTexto({
  linhas,
  negrito = false,
}: {
  linhas: string[];
  negrito?: boolean;
}) {
  return (
    <View>
      {linhas.map((linha, indice) => (
        <Text
          key={indice}
          style={{
            height: ALTURA_LINHA,
            fontFamily: negrito ? "Helvetica-Bold" : "Helvetica",
          }}
        >
          {linha || " "}
        </Text>
      ))}
    </View>
  );
}
// Monetary figures below are formatted only from authoritative persisted values.
export function DocumentoOrcamento({
  orcamento,
  empresa,
}: {
  orcamento: DadosDocumentoOrcamento;
  empresa: EmpresaDocumento;
}) {
  const { paginas, identidade, alturaCabecalho, clientes } =
    planejarDocumentoPdf(orcamento, empresa);
  const titulo = orcamento.tipoDocumento === "PEDIDO" ? "Pedido" : "Orçamento";
  const numero = String(orcamento.numero).padStart(5, "0");
  return (
    <Document
      title={`${titulo} ${numero}`}
      author={empresa.nome}
      language="pt-BR"
    >
      {paginas.map((pagina, indice) => (
        <Page key={indice} size="A4" style={estilos.pagina}>
          <View style={[estilos.cabecalho, { height: alturaCabecalho }]}>
            {empresa.logo && <Image src={empresa.logo} style={estilos.logo} />}
            <View style={{ flex: 1 }}>
              {identidade.map((linha, i) => (
                <Text
                  key={i}
                  style={{
                    height: linha.principal ? 18 : 12,
                    fontSize: linha.principal ? 14 : 8.5,
                    fontFamily: linha.principal
                      ? "Helvetica-Bold"
                      : "Helvetica",
                    textAlign: empresa.logo ? "center" : "left",
                  }}
                >
                  {linha.texto}
                </Text>
              ))}
            </View>
          </View>
          <View style={estilos.selecao}>
            <View style={estilos.caixa}>
              <Text>{orcamento.tipoDocumento === "PEDIDO" ? "X" : " "}</Text>
            </View>
            <Text>PEDIDO</Text>
            <View style={estilos.caixa}>
              <Text>{orcamento.tipoDocumento !== "PEDIDO" ? "X" : " "}</Text>
            </View>
            <Text>ORÇAMENTO</Text>
          </View>
          {pagina.primeira ? (
            clientes.map((campos, i) => (
              <View key={i} style={estilos.linhaCliente}>
                {campos.map((campo, j) => (
                  <View
                    key={j}
                    style={{ width: campo.largura, paddingHorizontal: 4 }}
                  >
                    <LinhasTexto linhas={campo.linhas} />
                  </View>
                ))}
              </View>
            ))
          ) : (
            <Text style={{ height: 18 }}>
              {titulo} Nº {numero} - {formatarDataPdf(orcamento)}
            </Text>
          )}
          {pagina.observacoes.length > 0 && (
            <View
              style={{ paddingHorizontal: 5, marginTop: 3, marginBottom: 4 }}
            >
              <LinhasTexto linhas={pagina.observacoes} />
            </View>
          )}
          {pagina.itens.length > 0 && (
            <View
              style={[
                estilos.tabela,
                {
                  position: "absolute",
                  top: pagina.yTabela,
                  left: 36,
                  width: LARGURA,
                  height: pagina.alturaTabela,
                },
              ]}
            >
              {empresa.logo && (
                <Image
                  src={empresa.logo}
                  style={[
                    estilos.marca,
                    {
                      height: Math.min(
                        200,
                        Math.max(0, pagina.alturaTabela - 31),
                      ),
                      top:
                        23 +
                        (pagina.alturaTabela -
                          23 -
                          Math.min(
                            200,
                            Math.max(0, pagina.alturaTabela - 31),
                          )) /
                          2,
                    },
                  ]}
                />
              )}
              <View
                style={[
                  estilos.linha,
                  { height: 23, backgroundColor: "#e8e8e8" },
                ]}
              >
                {["Quant.", "Descrição do Serviço", "P. Unit.", "TOTAL"].map(
                  (texto, i) => (
                    <Text
                      key={texto}
                      style={[
                        estilos.celula,
                        {
                          width: COLUNAS[i],
                          fontFamily: "Helvetica-Bold",
                          textAlign: i >= 2 ? "right" : "center",
                        },
                      ]}
                    >
                      {texto}
                    </Text>
                  ),
                )}
              </View>
              {pagina.itens.map((linha, i) => (
                <View key={i} style={[estilos.linha, { height: linha.altura }]}>
                  <View style={[estilos.celula, { width: COLUNAS[0] }]}>
                    <LinhasTexto linhas={linha.quantidade} />
                  </View>
                  <View style={[estilos.celula, { width: COLUNAS[1] }]}>
                    {linha.continuacao && (
                      <Text
                        style={{
                          height: ALTURA_LINHA,
                          fontSize: 7,
                          color: "#555555",
                        }}
                      >
                        Continuação do serviço
                      </Text>
                    )}
                    <LinhasTexto linhas={linha.linhas} />
                  </View>
                  <View
                    style={[
                      estilos.celula,
                      { width: COLUNAS[2], textAlign: "right" },
                    ]}
                  >
                    <LinhasTexto linhas={linha.preco} />
                  </View>
                  <View
                    style={[
                      estilos.celula,
                      { width: COLUNAS[3], textAlign: "right" },
                    ]}
                  >
                    <LinhasTexto linhas={linha.total} />
                  </View>
                </View>
              ))}
              {(() => {
                const restante =
                  pagina.alturaTabela -
                  23 -
                  pagina.itens.reduce((s, l) => s + l.altura, 0);
                const n = Math.max(1, Math.floor(restante / 23));
                return Array.from({ length: n }, (_, i) => (
                  <View
                    key={`vazia-${i}`}
                    style={[estilos.linha, { height: restante / n }]}
                  >
                    {COLUNAS.map((largura, j) => (
                      <View
                        key={j}
                        style={{
                          width: largura,
                          borderRightWidth: 0.65,
                          borderColor: "#555555",
                        }}
                      />
                    ))}
                  </View>
                ));
              })()}
            </View>
          )}
          {indice === paginas.length - 1 && (
            <View style={estilos.rodape}>
              <View>
                <View style={estilos.assinatura}>
                  <Text>ASSINATURA</Text>
                </View>
                {orcamento.validadeDias != null && (
                  <Text style={{ marginTop: 7, fontSize: 7 }}>
                    Validade: {orcamento.validadeDias} dias a partir da emissão.
                  </Text>
                )}
              </View>
              <View style={{ width: 210 }}>
                {orcamento.descontoValor > 0 && (
                  <Text
                    style={{ fontSize: 8, textAlign: "right", marginBottom: 5 }}
                  >
                    Subtotal: {formatarReaisPdf(orcamento.subtotalCentavos)} |
                    Desconto:{" "}
                    {orcamento.descontoTipo === "FIXO"
                      ? formatarReaisPdf(orcamento.descontoValor)
                      : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(orcamento.descontoValor / 100)}%`}
                  </Text>
                )}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>
                    TOTAL R$
                  </Text>
                  <Text style={estilos.total}>
                    {formatarReaisPdf(orcamento.totalCentavos).replace(
                      /^R\$\s*/,
                      "",
                    )}
                  </Text>
                </View>
              </View>
            </View>
          )}
          <Text
            style={{
              position: "absolute",
              bottom: 22,
              left: 36,
              right: 36,
              fontSize: 7,
              textAlign: "center",
              color: "#555555",
            }}
          >
            {titulo} Nº {numero} - Página {indice + 1} de {paginas.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
}
