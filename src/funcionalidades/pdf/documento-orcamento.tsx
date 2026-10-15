import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Circle,
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
  LARGURA * 0.08,
  LARGURA * 0.59,
  LARGURA * 0.145,
  LARGURA * 0.185,
];
const LARGURA_CLIENTE = LARGURA - 22;
const estilos = StyleSheet.create({
  pagina: {
    height: 841.89,
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#111111",
    lineHeight: 1.2,
  },
  cabecalho: {
    borderWidth: 1.2,
    borderColor: "#111111",
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: { width: 145, height: 56, objectFit: "contain" },
  linhaCliente: { flexDirection: "row", alignItems: "flex-start", gap: 5 },
  selecao: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  caixa: {
    width: 17,
    height: 17,
    borderWidth: 1,
    borderColor: "#111111",
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  tabela: { borderTopWidth: 1, borderColor: "#111111", position: "relative" },
  linha: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#111111" },
  celula: {
    borderRightWidth: 1,
    borderColor: "#111111",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  marca: {
    position: "absolute",
    width: 310,
    height: 240,
    left: (LARGURA - 310) / 2,
    opacity: 0.14,
    objectFit: "contain",
  },
  assinatura: {
    position: "absolute",
    top: 765,
    left: 40,
    width: 310,
    borderTopWidth: 1,
    borderColor: "#111111",
    textAlign: "center",
    paddingTop: 4,
    fontSize: 9,
  },
  total: {
    width: 120,
    height: 31,
    borderWidth: 1.2,
    borderColor: "#111111",
    borderRadius: 7,
    backgroundColor: "#e4e4e4",
    paddingVertical: 7,
    paddingHorizontal: 6,
    textAlign: "right",
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
  const escala = Object.values(empresa).some(
    (v) => typeof v === "string" && !v.startsWith("data:") && v.length > 100,
  )
    ? 0.75
    : 1;
  const grupo = (
    valor: string | null | undefined,
    largura: number,
    tamanho: number,
    principal = false,
  ) =>
    valor
      ? quebrarLinhasPdf(valor, largura, tamanho * escala, principal).map(
          (texto) => ({
            escala,
            texto,
            principal,
          }),
        )
      : [];
  return {
    nome: grupo(empresa.nome, 145, 10, true),
    atividade: grupo(empresa.descricaoAtividade, 145, 7),
    telefone: grupo(empresa.telefone, 133, 12, true),
    responsavel: grupo(empresa.nomeResponsavel, 168, 12, true),
    local: grupo(
      [empresa.cidade, empresa.estado].filter(Boolean).join(" - "),
      168,
      8,
      true,
    ),
    facebook: grupo(empresa.facebook, 137, 9, true),
    instagram: grupo(empresa.instagram, 151, 9, true),
    slogan: grupo(empresa.slogan, 338, 14),
  };
}
function linhasCliente(orcamento: DadosDocumentoOrcamento) {
  return [
    [{ rotulo: "Nome", valor: orcamento.clienteNome, proporcao: 1 }],
    [
      {
        rotulo: "End.",
        valor: orcamento.clienteEndereco ?? "",
        proporcao: 0.87,
      },
      {
        rotulo: "Nº",
        valor: orcamento.clienteNumeroEndereco ?? "",
        proporcao: 0.13,
      },
    ],
    [
      {
        rotulo: "Cidade",
        valor: orcamento.clienteCidade ?? "",
        proporcao: 0.56,
      },
      {
        rotulo: "Fone",
        valor: orcamento.clienteTelefone ?? "",
        proporcao: 0.44,
      },
    ],
    [
      {
        rotulo: "CNPJ/CPF",
        valor: orcamento.clienteDocumento ?? "",
        proporcao: 0.61,
      },
      {
        rotulo: "Insc. Est.",
        valor: orcamento.clienteInscricaoEstadual ?? "",
        proporcao: 0.39,
      },
    ],
  ].map((campos) =>
    campos.map((campo) => {
      const largura =
        (LARGURA_CLIENTE - (campos.length - 1) * 5) * campo.proporcao;
      const larguraRotulo =
        (Array.from(`${campo.rotulo}:`).reduce(
          (soma, caractere) =>
            soma +
            ((metricasHelvetica["Helvetica-Bold"] as Record<string, number>)[
              caractere
            ] ?? 1000),
          0,
        ) *
          10) /
          1000 +
        4;
      return {
        ...campo,
        largura,
        larguraRotulo,
        linhas: quebrarLinhasPdf(campo.valor, largura - larguraRotulo - 2, 9),
      };
    }),
  );
}
export function planejarDocumentoPdf(
  orcamento: DadosDocumentoOrcamento,
  empresa: EmpresaDocumento,
) {
  const identidade = linhasEmpresa(empresa);
  const escala = identidade.nome[0]?.escala ?? 1;
  const alturaEsquerda =
    (empresa.logo ? 56 : 0) +
    identidade.nome.length * 12 * escala +
    identidade.atividade.length * 9 * escala;
  const alturaDireita =
    Math.max(
      identidade.telefone.length * 14 * escala,
      (identidade.responsavel.length * 14 + identidade.local.length * 10) *
        escala,
    ) +
    Math.max(identidade.facebook.length, identidade.instagram.length) *
      11 *
      escala +
    identidade.slogan.length * 17 * escala +
    14;
  const alturaCabecalho = Math.max(
    empresa.logo ? 98 : 52,
    alturaEsquerda + 16,
    alturaDireita + 16,
  );
  const clientes = linhasCliente(orcamento);
  const alturaCliente = clientes.reduce(
    (s, campos) =>
      s +
      Math.max(
        22,
        Math.max(...campos.map((c) => c.linhas.length)) * ALTURA_LINHA + 7,
      ),
    0,
  );
  const base = 36 + alturaCabecalho + 32;
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
  {
    const linhas = quebrarLinhasPdf(
      `Obs.: ${orcamento.observacoes ?? ""}`,
      LARGURA_CLIENTE - 2,
      9,
    );
    while (linhas.length) {
      const capacidade = Math.max(
        1,
        Math.floor((710 - pagina.yTabela - 34) / ALTURA_LINHA),
      );
      pagina.observacoes = linhas.splice(0, capacidade);
      pagina.yTabela += Math.max(
        22,
        pagina.observacoes.length * ALTURA_LINHA + 7,
      );
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
  return {
    paginas,
    identidade: Object.values(identidade).flat(),
    gruposIdentidade: identidade,
    alturaCabecalho,
    clientes,
  };
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
function BlocoIdentidade({
  linhas,
  tamanho,
  altura,
  italico = false,
  serifado = false,
}: {
  linhas: Array<{ texto: string; principal: boolean; escala?: number }>;
  tamanho: number;
  altura: number;
  italico?: boolean;
  serifado?: boolean;
}) {
  return (
    <View style={{ flexShrink: 1 }}>
      {linhas.map((linha, i) => (
        <Text
          key={i}
          style={{
            height: altura * (linha.escala ?? 1),
            fontSize: tamanho * (linha.escala ?? 1),
            lineHeight: 1,
            textAlign: "center",
            fontFamily: serifado
              ? "Times-Italic"
              : linha.principal
                ? italico
                  ? "Helvetica-BoldOblique"
                  : "Helvetica-Bold"
                : "Helvetica",
          }}
        >
          {linha.texto}
        </Text>
      ))}
    </View>
  );
}
function IconeContato({
  tipo,
}: {
  tipo: "facebook" | "instagram" | "whatsapp";
}) {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24">
      {tipo === "facebook" ? (
        <>
          <Rect x="1" y="1" width="22" height="22" rx="2" fill="#111111" />
          <Path
            d="M14 23V14h3l.5-4H14V8c0-1 .5-1.5 1.6-1.5H18V3h-3c-3.2 0-5 1.7-5 5v2H7v4h3v9"
            fill="white"
          />
        </>
      ) : tipo === "instagram" ? (
        <>
          <Rect
            x="2"
            y="2"
            width="20"
            height="20"
            rx="5"
            fill="none"
            stroke="#111111"
            strokeWidth="2"
          />
          <Circle
            cx="12"
            cy="12"
            r="5"
            fill="none"
            stroke="#111111"
            strokeWidth="2"
          />
          <Circle cx="18" cy="6" r="1.5" fill="#111111" />
        </>
      ) : (
        <>
          <Path
            d="M4 20l1-4a9 9 0 1 1 4 4z"
            fill="none"
            stroke="#111111"
            strokeWidth="1.7"
          />
          <Path d="M8 7c-2 3 3 8 6 9l2-2-3-2-1 1-3-3 1-1-2-2z" fill="#111111" />
        </>
      )}
    </Svg>
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
  const { paginas, gruposIdentidade, alturaCabecalho, clientes } =
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
            <View style={{ width: 145, alignItems: "center" }}>
              {empresa.logo && (
                <Image src={empresa.logo} style={estilos.logo} />
              )}
              <BlocoIdentidade
                linhas={gruposIdentidade.nome}
                tamanho={10}
                altura={12}
              />
              <BlocoIdentidade
                linhas={gruposIdentidade.atividade}
                tamanho={7}
                altura={9}
              />
            </View>
            <View style={{ flex: 1, gap: 7 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                {gruposIdentidade.telefone.length > 0 && (
                  <View style={{ width: 147, flexDirection: "row", gap: 4 }}>
                    <IconeContato tipo="whatsapp" />
                    <BlocoIdentidade
                      linhas={gruposIdentidade.telefone}
                      tamanho={12}
                      altura={14}
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <BlocoIdentidade
                    linhas={gruposIdentidade.responsavel}
                    tamanho={12}
                    altura={14}
                    italico
                  />
                  <BlocoIdentidade
                    linhas={gruposIdentidade.local}
                    tamanho={8}
                    altura={10}
                    italico
                  />
                </View>
              </View>
              {(empresa.facebook || empresa.instagram) && (
                <View
                  style={{ flexDirection: "row", gap: 9, alignItems: "center" }}
                >
                  {empresa.facebook && (
                    <View style={{ width: 151, flexDirection: "row", gap: 4 }}>
                      <IconeContato tipo="facebook" />
                      <BlocoIdentidade
                        linhas={gruposIdentidade.facebook}
                        tamanho={9}
                        altura={11}
                      />
                    </View>
                  )}
                  {empresa.instagram && (
                    <View style={{ flex: 1, flexDirection: "row", gap: 4 }}>
                      <IconeContato tipo="instagram" />
                      <BlocoIdentidade
                        linhas={gruposIdentidade.instagram}
                        tamanho={9}
                        altura={11}
                      />
                    </View>
                  )}
                </View>
              )}
              <BlocoIdentidade
                linhas={gruposIdentidade.slogan}
                tamanho={14}
                altura={17}
                serifado
              />
            </View>
          </View>
          <View
            style={{
              position: "absolute",
              top: 36 + alturaCabecalho,
              left: 36,
              width: LARGURA,
              height: 720 - 36 - alturaCabecalho,
              borderWidth: 1.2,
              borderColor: "#111111",
              borderRadius: 8,
            }}
          />
          <View
            style={{
              height: 32,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                width: 215,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 9 }}>Data:</Text>
              <Text
                style={{
                  borderBottomWidth: 0.6,
                  width: 175,
                  paddingBottom: 2,
                  fontSize: 9,
                }}
              >
                {formatarDataPdf(orcamento)}
              </Text>
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
          </View>
          {pagina.primeira ? (
            clientes.map((campos, i) => (
              <View
                key={i}
                style={[
                  estilos.linhaCliente,
                  {
                    paddingHorizontal: 11,
                    height: Math.max(
                      22,
                      Math.max(...campos.map((c) => c.linhas.length)) *
                        ALTURA_LINHA +
                        7,
                    ),
                  },
                ]}
              >
                {campos.map((campo, j) => (
                  <View
                    key={j}
                    style={{
                      width: campo.largura,
                      flexDirection: "row",
                      gap: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Helvetica-Bold",
                        width: campo.larguraRotulo,
                      }}
                    >
                      {campo.rotulo}:
                    </Text>
                    <View
                      style={{
                        flex: 1,
                        borderBottomWidth: 0.6,
                        borderColor: "#111111",
                        paddingBottom: 2,
                        fontSize: 9,
                      }}
                    >
                      <LinhasTexto linhas={campo.linhas} />
                    </View>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <Text style={{ height: 18, paddingHorizontal: 11 }}>
              {titulo} Nº {numero} — continuação
            </Text>
          )}
          {pagina.observacoes.length > 0 && (
            <View
              style={{
                paddingHorizontal: 11,
                height: Math.max(
                  22,
                  pagina.observacoes.length * ALTURA_LINHA + 7,
                ),
                fontSize: 9,
              }}
            >
              {pagina.observacoes.map((linha, i) => (
                <View
                  key={i}
                  style={{
                    height:
                      ALTURA_LINHA +
                      (i === pagina.observacoes.length - 1 ? 2 : 0),
                    flexDirection: "row",
                  }}
                >
                  {i === 0 && (
                    <Text style={{ width: 26, lineHeight: 1, fontSize: 9 }}>
                      {linha.startsWith("Obs.:") ? "Obs.:" : " "}
                    </Text>
                  )}
                  <Text
                    style={{
                      flex: 1,
                      lineHeight: 1,
                      fontSize: 9,
                      borderBottomWidth:
                        i === pagina.observacoes.length - 1 ? 0.6 : 0,
                      borderColor: "#111111",
                      paddingBottom: 0,
                    }}
                  >
                    {i === 0 && linha.startsWith("Obs.:")
                      ? linha.slice(5).trimStart()
                      : linha || " "}
                  </Text>
                </View>
              ))}
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
                        240,
                        Math.max(0, pagina.alturaTabela - 31),
                      ),
                      top:
                        23 +
                        (pagina.alturaTabela -
                          23 -
                          Math.min(
                            240,
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
                  { height: 23, backgroundColor: "#d8d8d8" },
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
                          textAlign: "center",
                          fontSize: i === 0 ? 8 : 10,
                          borderRightWidth: i === 3 ? 0 : 1,
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
                      {
                        width: COLUNAS[3],
                        textAlign: "right",
                        borderRightWidth: 0,
                      },
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
                const n = Math.max(0, Math.floor(restante / 23));
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
                          borderRightWidth: j === 3 ? 0 : 1,
                          borderColor: "#111111",
                        }}
                      />
                    ))}
                  </View>
                ));
              })()}
            </View>
          )}
          {indice === paginas.length - 1 && (
            <>
              <View
                style={{
                  position: "absolute",
                  top: 730,
                  right: 36,
                  alignItems: "flex-end",
                }}
              >
                {orcamento.descontoValor > 0 && (
                  <Text style={{ fontSize: 7, marginBottom: 4 }}>
                    Subtotal: {formatarReaisPdf(orcamento.subtotalCentavos)} |
                    Desconto:{" "}
                    {orcamento.descontoTipo === "FIXO"
                      ? formatarReaisPdf(orcamento.descontoValor)
                      : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(orcamento.descontoValor / 100)}%`}
                  </Text>
                )}
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
                >
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13 }}>
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
              <View style={estilos.assinatura}>
                <Text>ASSINATURA</Text>
              </View>
              {orcamento.validadeDias != null && (
                <Text
                  style={{
                    position: "absolute",
                    top: 790,
                    left: 40,
                    fontSize: 7,
                  }}
                >
                  Validade: {orcamento.validadeDias} dias a partir da emissão.
                </Text>
              )}
            </>
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
