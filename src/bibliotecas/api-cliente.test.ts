import { describe, expect, it } from "vitest";
import { decimalInteiro, decimalTexto } from "./api-cliente";
describe("Conversão dos campos de valor e quantidade", () => {
  it("converte reais sem erros de ponto flutuante", () => {
    expect(decimalInteiro("0,29", 2)).toBe(29);
    expect(decimalInteiro("1.575,00", 2)).toBe(157500);
    expect(decimalInteiro("45.50", 2)).toBe(4550);
  });
  it("preserva três casas decimais da quantidade", () => {
    expect(decimalInteiro("0,125", 3)).toBe(125);
    expect(decimalInteiro("1.005", 3)).toBe(1005);
    expect(decimalTexto(125, 3)).toBe("0,125");
  });
  it("rejeita valores imprecisos, negativos e fora do limite", () => {
    for (const valor of [
      "0,001",
      "-1",
      "1e5",
      "1.2,30",
      "Infinity",
      "9007199254740993",
    ])
      expect(() => decimalInteiro(valor, 2)).toThrow();
  });
});
