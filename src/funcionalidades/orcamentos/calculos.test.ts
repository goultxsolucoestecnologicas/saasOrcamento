import { describe, expect, it } from "vitest";
import { calcularOrcamento, calcularSubtotalItem } from "./calculos";
import {
  esquemaOrcamento,
  type OrcamentoEntrada,
} from "@/validacoes/orcamento";

function entrada(dados: Partial<OrcamentoEntrada> = {}): OrcamentoEntrada {
  return {
    clienteNome: "Cliente",
    situacao: "RASCUNHO",
    descontoTipo: "FIXO",
    descontoValor: 0,
    itens: [
      {
        descricao: "Serviço",
        unidade: "un",
        quantidadeMilesimos: 1000,
        valorUnitarioCentavos: 100,
      },
    ],
    ...dados,
  };
}

describe("cálculos monetários inteiros", () => {
  it.each([
    [0, 1],
    [1.5, 1],
    [1, -1],
    [1, Infinity],
    [100_000_001, 1],
    [1, 100_000_001],
  ])(
    "auxiliar recusa quantidade %s e valor %s inválidos",
    (quantidade, valor) => {
      expect(() => calcularSubtotalItem(quantidade, valor)).toThrow(/inválido/);
    },
  );
  it.each([
    [499, 0],
    [500, 1],
    [1500, 2],
  ])(
    "arredonda quantidade %i milésimos para %i centavos",
    (quantidadeMilesimos, esperado) => {
      expect(
        calcularOrcamento(
          entrada({
            itens: [
              {
                descricao: "Serviço",
                unidade: "un",
                quantidadeMilesimos,
                valorUnitarioCentavos: 1,
              },
            ],
          }),
        ).totalCentavos,
      ).toBe(esperado);
    },
  );
  it("soma subtotais arredondados por item e aplica percentual half-up", () => {
    const resultado = calcularOrcamento(
      entrada({
        itens: [
          {
            descricao: "Serviço",
            unidade: "un",
            quantidadeMilesimos: 1000,
            valorUnitarioCentavos: 3,
          },
        ],
        descontoTipo: "PERCENTUAL",
        descontoValor: 5000,
      }),
    );
    expect(resultado).toMatchObject({
      subtotalCentavos: 3,
      descontoCentavos: 2,
      totalCentavos: 1,
    });
  });
  it("aceita desconto de 100% e total zero", () => {
    expect(
      calcularOrcamento(
        entrada({ descontoTipo: "PERCENTUAL", descontoValor: 10000 }),
      ).totalCentavos,
    ).toBe(0);
  });
  it("recusa desconto fixo maior que o subtotal", () => {
    expect(() => calcularOrcamento(entrada({ descontoValor: 101 }))).toThrow(
      /maior que o subtotal/,
    );
  });
  it("preserva o maior inteiro PostgreSQL permitido", () => {
    const itens = [
      {
        descricao: "Grande",
        unidade: "un",
        quantidadeMilesimos: 21_474_836,
        valorUnitarioCentavos: 100_000,
      },
      {
        descricao: "Complemento",
        unidade: "un",
        quantidadeMilesimos: 1000,
        valorUnitarioCentavos: 47,
      },
    ];
    expect(calcularOrcamento(entrada({ itens })).totalCentavos).toBe(
      2_147_483_647,
    );
    expect(() =>
      calcularOrcamento(
        entrada({
          itens: [
            ...itens,
            {
              descricao: "Excesso",
              unidade: "un",
              quantidadeMilesimos: 1000,
              valorUnitarioCentavos: 1,
            },
          ],
        }),
      ),
    ).toThrow(/limite/);
  });
  it("recusa produto acima do limite sem perda de precisão", () => {
    expect(() =>
      calcularOrcamento(
        entrada({
          itens: [
            {
              descricao: "Excesso",
              unidade: "un",
              quantidadeMilesimos: 100_000_000,
              valorUnitarioCentavos: 100_000_000,
            },
          ],
        }),
      ),
    ).toThrow(/limite/);
  });
});

describe("entrada de orçamento", () => {
  it.each([
    { idEmpresa: "forjado" },
    { totalCentavos: 1 },
    { numero: 1 },
    { validadeDias: 0 },
    { validadeDias: 366 },
    { descontoTipo: "PERCENTUAL", descontoValor: 10001 },
    { clienteNome: " " },
    { itens: [] },
    {
      itens: [
        {
          descricao: "Serviço",
          unidade: "un",
          quantidadeMilesimos: 0,
          valorUnitarioCentavos: 100,
        },
      ],
    },
    {
      itens: [
        {
          descricao: "Serviço",
          unidade: "un",
          quantidadeMilesimos: 1000.1,
          valorUnitarioCentavos: 100,
        },
      ],
    },
    {
      itens: [
        {
          descricao: "Serviço",
          unidade: "un",
          quantidadeMilesimos: 1000,
          valorUnitarioCentavos: -1,
        },
      ],
    },
    {
      itens: [
        {
          descricao: "Serviço",
          unidade: "un",
          quantidadeMilesimos: 1000,
          valorUnitarioCentavos: 100,
          subtotalCentavos: 0,
        },
      ],
    },
  ])("recusa campos forjados ou fora dos limites", (dados) => {
    expect(esquemaOrcamento.safeParse({ ...entrada(), ...dados }).success).toBe(
      false,
    );
  });
  it("aceita validade ausente ou nula e recusa mais de cem itens", () => {
    expect(
      esquemaOrcamento.safeParse(entrada({ validadeDias: null })).success,
    ).toBe(true);
    expect(
      esquemaOrcamento.safeParse(
        entrada({
          itens: Array.from({ length: 101 }, () => entrada().itens[0]),
        }),
      ).success,
    ).toBe(false);
  });
});
