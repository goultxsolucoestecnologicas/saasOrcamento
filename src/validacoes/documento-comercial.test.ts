import { expect, it } from "vitest";
import { esquemaEmpresa } from "./empresa";
it("nome da empresa pode ficar vazio ou ser omitido, respeitando o limite", () => {
  expect(esquemaEmpresa.parse({ nome: "  " }).nome).toBe("");
  expect(esquemaEmpresa.parse({})).not.toHaveProperty("nome");
  expect(esquemaEmpresa.safeParse({ nome: "x".repeat(151) }).success).toBe(
    false,
  );
});
import {
  esquemaDataEmissao,
  dataCivilSaoPaulo,
  esquemaOrcamento,
} from "./orcamento";
it.each(["2024-02-29", "2026-10-14", "0001-01-01"])(
  "aceita data civil real %s",
  (data) => expect(esquemaDataEmissao.safeParse(data).success).toBe(true),
);
it.each([
  "2025-02-29",
  "2026-02-30",
  "2026-13-01",
  "2026-1-01",
  "14/10/2026",
  "0000-01-01",
  "2026-10-14T00:00:00Z",
  "",
])("rejeita data civil inválida %s", (data) =>
  expect(esquemaDataEmissao.safeParse(data).success).toBe(false),
);
it("data padrão considera virada do dia em São Paulo", () => {
  expect(dataCivilSaoPaulo("2026-10-14T02:59:59Z")).toBe("2026-10-13");
  expect(dataCivilSaoPaulo("2026-10-14T03:00:00Z")).toBe("2026-10-14");
});
it("normaliza UF válida e rejeita estado desconhecido", () => {
  expect(esquemaEmpresa.parse({ nome: "Empresa", estado: " rs " }).estado).toBe(
    "RS",
  );
  expect(
    esquemaEmpresa.safeParse({ nome: "Empresa", estado: "XX" }).success,
  ).toBe(false);
});
it.each([
  ["descricaoAtividade", 300],
  ["nomeResponsavel", 150],
  ["cidade", 120],
  ["instagram", 150],
  ["facebook", 150],
  ["slogan", 200],
] as const)("valida limite de %s", (campo, limite) => {
  expect(
    esquemaEmpresa.safeParse({ nome: "Empresa", [campo]: "x".repeat(limite) })
      .success,
  ).toBe(true);
  expect(
    esquemaEmpresa.safeParse({
      nome: "Empresa",
      [campo]: "x".repeat(limite + 1),
    }).success,
  ).toBe(false);
});
it("tipo de documento não altera situação operacional", () => {
  const entrada = esquemaOrcamento.parse({
    clienteNome: "Cliente",
    tipoDocumento: "PEDIDO",
    situacao: "CANCELADO",
    itens: [
      {
        descricao: "Serviço",
        quantidadeMilesimos: 1000,
        valorUnitarioCentavos: 100,
      },
    ],
  });
  expect(entrada.tipoDocumento).toBe("PEDIDO");
  expect(entrada.situacao).toBe("CANCELADO");
});
