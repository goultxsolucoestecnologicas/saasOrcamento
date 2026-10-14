import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export interface DadosDocumentoOrcamento {
  numero: number;
  dataCriacao: Date | string;
  situacao: "RASCUNHO" | "ENVIADO" | "APROVADO" | "RECUSADO" | "CANCELADO";
  clienteNome: string;
  clienteDocumento?: string | null;
  clienteTelefone?: string | null;
  clienteEndereco?: string | null;
  clienteCidade?: string | null;
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
}

const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 130,
    paddingBottom: 52,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111111",
    lineHeight: 1.45,
  },
  cabecalho: {
    position: "absolute",
    top: 30,
    left: 36,
    right: 36,
    height: 94,
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 4,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  logo: { width: 90, height: 66, objectFit: "contain" },
  identidade: { flex: 1 },
  empresa: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  identificacao: { width: 135, textAlign: "right" },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 13, marginBottom: 4 },
  campo: {
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#b0b0b0",
  },
  rotulo: { fontFamily: "Helvetica-Bold" },
  secao: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginTop: 14,
    marginBottom: 6,
  },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#999999",
    borderLeftWidth: 0.5,
    borderLeftColor: "#999999",
  },
  tabelaCabecalho: {
    height: 22,
    position: "absolute",
    top: 128,
    left: 36,
    right: 36,
    flexDirection: "row",
    backgroundColor: "#eeeeee",
    borderWidth: 0.5,
    borderColor: "#999999",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  celula: {
    flexShrink: 0,
    padding: 5,
    borderRightWidth: 0.5,
    borderRightColor: "#999999",
  },
  quantidade: { width: "16%" },
  descricao: { width: "48%" },
  preco: { width: "18%", textAlign: "right" },
  totais: { width: 230, alignSelf: "flex-end", marginTop: 14 },
  totalLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 5,
  },
  totalDestaque: {
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginTop: 4,
  },
  rodape: {
    position: "absolute",
    bottom: 23,
    height: 18,
    lineHeight: 1,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#555555",
    textAlign: "center",
  },
});

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

const situacoes = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
  CANCELADO: "Cancelado",
};

/** Conservative layout estimate only; no business values are calculated here. */
export function paginarItensPdf(itens: DadosDocumentoOrcamento["itens"]) {
  const paginas: DadosDocumentoOrcamento["itens"][] = [[]];
  let ocupado = 0;
  let limite = 230;
  for (const item of itens) {
    // Explicit newlines and uninterrupted words also consume estimated lines.
    const linhas = item.descricao
      .split("\n")
      .reduce(
        (total, trecho) => total + Math.max(1, Math.ceil(trecho.length / 40)),
        0,
      );
    const altura = 16 + 10 * linhas;
    if (ocupado + altura > limite && paginas.at(-1)!.length > 0) {
      paginas.push([]);
      ocupado = 0;
      limite = 480;
    }
    paginas.at(-1)!.push(item);
    ocupado += altura;
  }
  return paginas;
}

// The document only formats authoritative, persisted monetary values.
export function DocumentoOrcamento({
  orcamento,
  empresa,
}: {
  orcamento: DadosDocumentoOrcamento;
  empresa: EmpresaDocumento;
}) {
  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(orcamento.dataCriacao));
  const desconto =
    orcamento.descontoTipo === "FIXO"
      ? formatarReaisPdf(orcamento.descontoValor)
      : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(orcamento.descontoValor / 100)}%`;
  const paginas = paginarItensPdf(orcamento.itens);
  return (
    <Document
      title={`Orçamento ${orcamento.numero}`}
      author={empresa.nome}
      language="pt-BR"
    >
      {paginas.map((itensPagina, paginaIndice) => (
        <Page key={paginaIndice} size="A4" style={estilos.pagina} wrap>
          <View style={estilos.cabecalho} fixed>
            {empresa.logo && <Image src={empresa.logo} style={estilos.logo} />}
            <View style={estilos.identidade}>
              <Text style={estilos.empresa}>{empresa.nome}</Text>
              {empresa.telefone && <Text>Telefone: {empresa.telefone}</Text>}
            </View>
            <View style={estilos.identificacao}>
              <Text style={estilos.titulo}>ORÇAMENTO</Text>
              <Text>Nº {String(orcamento.numero).padStart(5, "0")}</Text>
              <Text>{data}</Text>
              <Text>{situacoes[orcamento.situacao]}</Text>
            </View>
          </View>
          {paginaIndice === 0 && (
            <>
              <Text style={estilos.secao}>Dados do cliente</Text>
              <Text style={estilos.campo}>
                <Text style={estilos.rotulo}>Nome: </Text>
                {orcamento.clienteNome}
              </Text>
              {orcamento.clienteDocumento && (
                <Text style={estilos.campo}>
                  <Text style={estilos.rotulo}>CPF/CNPJ: </Text>
                  {orcamento.clienteDocumento}
                </Text>
              )}
              {orcamento.clienteTelefone && (
                <Text style={estilos.campo}>
                  <Text style={estilos.rotulo}>Telefone: </Text>
                  {orcamento.clienteTelefone}
                </Text>
              )}
              {orcamento.clienteEndereco && (
                <Text style={estilos.campo}>
                  <Text style={estilos.rotulo}>Endereço: </Text>
                  {orcamento.clienteEndereco}
                </Text>
              )}
              {orcamento.clienteCidade && (
                <Text style={estilos.campo}>
                  <Text style={estilos.rotulo}>Cidade: </Text>
                  {orcamento.clienteCidade}
                </Text>
              )}
            </>
          )}
          <Text style={estilos.secao}>Itens do orçamento</Text>
          <View
            style={[
              estilos.linha,
              {
                backgroundColor: "#eeeeee",
                fontFamily: "Helvetica-Bold",
                fontSize: 8,
              },
            ]}
            wrap={false}
          >
            <Text style={[estilos.celula, estilos.quantidade]}>
              Quant. / unid.
            </Text>
            <Text style={[estilos.celula, estilos.descricao]}>
              Descrição do serviço
            </Text>
            <Text style={[estilos.celula, estilos.preco]}>P. unitário</Text>
            <Text style={[estilos.celula, estilos.preco]}>Total</Text>
          </View>
          {itensPagina.map((item, indice) => (
            <View key={indice} style={estilos.linha} wrap={false}>
              <Text style={[estilos.celula, estilos.quantidade]}>
                {formatarQuantidadePdf(item.quantidadeMilesimos)} {item.unidade}
              </Text>
              <Text style={[estilos.celula, estilos.descricao]}>
                {item.descricao}
              </Text>
              <Text style={[estilos.celula, estilos.preco]}>
                {formatarReaisPdf(item.valorUnitarioCentavos)}
              </Text>
              <Text style={[estilos.celula, estilos.preco]}>
                {formatarReaisPdf(item.subtotalCentavos)}
              </Text>
            </View>
          ))}
          {paginaIndice === paginas.length - 1 && (
            <>
              <View style={estilos.totais} wrap={false}>
                <View style={estilos.totalLinha}>
                  <Text>Subtotal</Text>
                  <Text>{formatarReaisPdf(orcamento.subtotalCentavos)}</Text>
                </View>
                <View style={estilos.totalLinha}>
                  <Text>Desconto</Text>
                  <Text>{desconto}</Text>
                </View>
                <View style={[estilos.totalLinha, estilos.totalDestaque]}>
                  <Text>TOTAL</Text>
                  <Text>{formatarReaisPdf(orcamento.totalCentavos)}</Text>
                </View>
              </View>
              {orcamento.validadeDias != null && (
                <Text style={estilos.campo}>
                  Validade: {orcamento.validadeDias} dias a partir da emissão.
                </Text>
              )}
              {orcamento.observacoes && (
                <>
                  <Text style={estilos.secao}>Observações</Text>
                  <Text>{orcamento.observacoes}</Text>
                </>
              )}
            </>
          )}
          <Text
            fixed
            style={{
              position: "absolute",
              top: 807,
              left: 36,
              width: 523,
              fontSize: 8,
              textAlign: "center",
            }}
            render={({ pageNumber, totalPages }) =>
              `Orçamento Nº ${String(orcamento.numero).padStart(5, "0")} · Página ${pageNumber} de ${totalPages}`
            }
          />
        </Page>
      ))}
    </Document>
  );
}
