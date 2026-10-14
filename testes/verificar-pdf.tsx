import React from "react";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  DocumentoOrcamento,
  type DadosDocumentoOrcamento,
} from "../src/funcionalidades/pdf/documento-orcamento";

export const amostraPdf: DadosDocumentoOrcamento = {
  numero: 128,
  dataCriacao: "2026-10-14T15:00:00Z",
  situacao: "RASCUNHO",
  clienteNome: "Cliente de teste",
  clienteDocumento: "Documento de teste",
  clienteTelefone: "Telefone de teste",
  clienteEndereco: "Rua de teste, 240",
  clienteCidade: "Cidade de teste",
  observacoes: "Aplicação conforme proposta. Materiais não inclusos.",
  validadeDias: 15,
  descontoTipo: "FIXO",
  descontoValor: 7900,
  subtotalCentavos: 207900,
  totalCentavos: 200000,
  itens: [
    {
      descricao: "Instalação de piso vinílico",
      unidade: "m²",
      quantidadeMilesimos: 35000,
      valorUnitarioCentavos: 4500,
      subtotalCentavos: 157500,
    },
    {
      descricao: "Instalação de rodapé",
      unidade: "m",
      quantidadeMilesimos: 28000,
      valorUnitarioCentavos: 1800,
      subtotalCentavos: 50400,
    },
  ],
};

export const amostraExtensaPdf: DadosDocumentoOrcamento = {
  ...amostraPdf,
  numero: 129,
  descontoTipo: "PERCENTUAL",
  descontoValor: 1000,
  subtotalCentavos: 450000,
  totalCentavos: 405000,
  observacoes:
    "Observação livre de teste com acentos e instruções para execução. "
      .repeat(70)
      .slice(0, 4000),
  itens: Array.from({ length: 100 }, (_, indice) => ({
    descricao:
      `Serviço ${indice + 1}: ${"Descrição extensa de teste com detalhes da aplicação e acabamento. ".repeat(8)}`.slice(
        0,
        500,
      ),
    unidade: "m²",
    quantidadeMilesimos: 1234,
    valorUnitarioCentavos: 3647,
    subtotalCentavos: 4500,
  })),
};

export const amostraCemItensCurtosPdf: DadosDocumentoOrcamento = {
  ...amostraExtensaPdf,
  observacoes: "Amostra de paginação com cem serviços curtos.",
  itens: amostraExtensaPdf.itens.map((item, indice) => ({
    ...item,
    descricao: `Serviço de teste ${indice + 1}`,
  })),
};

export async function gerarAmostrasPdf(diretorio = resolve(".tmp")) {
  await mkdir(diretorio, { recursive: true });
  for (const [nome, orcamento] of [
    ["orcamento-teste.pdf", amostraPdf],
    ["orcamento-extenso.pdf", amostraExtensaPdf],
    ["orcamento-cem-itens-curtos.pdf", amostraCemItensCurtosPdf],
  ] as const) {
    const buffer = await renderToBuffer(
      <DocumentoOrcamento
        orcamento={orcamento}
        empresa={{ nome: "Empresa de teste", telefone: "Telefone de teste" }}
      />,
    );
    if (buffer.subarray(0, 4).toString() !== "%PDF")
      throw new Error("PDF inválido");
    await writeFile(resolve(diretorio, nome), buffer);
    console.log(`${nome}: ${buffer.length} bytes`);
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/verificar-pdf.tsx"))
  await gerarAmostrasPdf();
