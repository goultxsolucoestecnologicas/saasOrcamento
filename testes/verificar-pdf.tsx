import React from "react";
import sharp from "sharp";
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
  const logo =
    "data:image/png;base64," +
    (
      await sharp(
        Buffer.from(
          ' <svg xmlns="http://www.w3.org/2000/svg" width="420" height="220"><rect x="6" y="6" width="408" height="208" rx="8" fill="white" stroke="#171717" stroke-width="6"/><path d="M35 160V65h70v95zM120 160V35h40v125z" fill="#555"/><text x="185" y="100" font-family="sans-serif" font-size="42" font-weight="bold">DEMO</text><text x="185" y="135" font-family="sans-serif" font-size="18">SERVIÇOS</text></svg> ',
        ),
      )
        .png()
        .toBuffer()
    ).toString("base64");
  const empresaCompleta = {
    nome: "Empresa Fictícia Demonstração",
    telefone: "(00) 00000-0000",
    descricaoAtividade: "Instalação e acabamento de pisos",
    nomeResponsavel: "Responsável fictício",
    cidade: "Cidade Exemplo",
    estado: "RS",
    instagram: "@empresa.ficticia",
    facebook: "Empresa Fictícia",
    slogan: "Qualidade em cada acabamento.",
    logo,
  };
  for (const [nome, orcamento] of [
    ["orcamento-teste.pdf", amostraPdf],
    ["orcamento-extenso.pdf", amostraExtensaPdf],
    ["orcamento-cem-itens-curtos.pdf", amostraCemItensCurtosPdf],
    [
      "pedido-completo-logo.pdf",
      {
        ...amostraPdf,
        tipoDocumento: "PEDIDO",
        dataEmissao: "2026-10-14T00:00:00Z",
        clienteEndereco: "Rua de teste",
        clienteNumeroEndereco: "240",
        clienteInscricaoEstadual: "ISENTO",
      },
    ],
    [
      "orcamento-simples-sem-logo.pdf",
      {
        ...amostraPdf,
        observacoes: null,
        clienteDocumento: null,
        clienteTelefone: null,
        clienteEndereco: null,
        clienteCidade: null,
        validadeDias: null,
        descontoValor: 0,
        subtotalCentavos: 157500,
        totalCentavos: 157500,
        itens: [amostraPdf.itens[0]],
      },
    ],
    [
      "orcamento-varios-itens-logo.pdf",
      {
        ...amostraCemItensCurtosPdf,
        itens: amostraCemItensCurtosPdf.itens.slice(0, 12),
        subtotalCentavos: 54000,
        totalCentavos: 54000,
        descontoValor: 0,
      },
    ],
    [
      "orcamento-quebras-extremas.pdf",
      {
        ...amostraPdf,
        observacoes: "A\n".repeat(1999) + "AB",
        itens: [
          { ...amostraPdf.itens[0], descricao: "W".repeat(500) },
          { ...amostraPdf.itens[1], descricao: "X\n".repeat(249) + "X" },
        ],
      },
    ],
  ] as Array<[string, DadosDocumentoOrcamento]>) {
    const buffer = await renderToBuffer(
      <DocumentoOrcamento
        orcamento={orcamento}
        empresa={
          nome.includes("logo") && !nome.includes("sem-logo")
            ? empresaCompleta
            : { nome: "Empresa Fictícia Demonstração" }
        }
      />,
    );
    if (buffer.subarray(0, 4).toString() !== "%PDF")
      throw new Error("PDF inválido");
    await writeFile(resolve(diretorio, nome), buffer);
    console.log(`${nome}: ${buffer.length} bytes`);
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/verificar-pdf.tsx"))
  await gerarAmostrasPdf(
    process.argv.includes("--evidencias")
      ? resolve("docs/pdf/exemplos")
      : resolve(".tmp"),
  );
