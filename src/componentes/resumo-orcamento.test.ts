import { describe, expect, it } from "vitest";
import { calcularPreviaOrcamento } from "./resumo-orcamento";
const item = {
  chave: "item",
  descricao: "",
  unidade: "m²",
  quantidade: "35",
  valor: "45,00",
};
describe("prévia monetária do formulário", () => {
  it("calcula enquanto os dados textuais do serviço ainda estão vazios", () => {
    expect(calcularPreviaOrcamento([item], "FIXO", "0,00")).toMatchObject({
      subtotalCentavos: 157500,
      descontoCentavos: 0,
      totalCentavos: 157500,
    });
  });
  it("não muda ao editar a descrição ou a unidade", () => {
    expect(
      calcularPreviaOrcamento(
        [{ ...item, descricao: "Nome do serviço", unidade: "" }],
        "PERCENTUAL",
        "10",
      ),
    ).toMatchObject({
      subtotalCentavos: 157500,
      descontoCentavos: 15750,
      totalCentavos: 141750,
    });
  });
  it.each(["", "-1", "0", "texto", "0,0001"])(
    "não apresenta zero como estimativa da quantidade inválida %s",
    (quantidade) => {
      expect(
        calcularPreviaOrcamento([{ ...item, quantidade }], "FIXO", "0"),
      ).toBeNull();
    },
  );
  it("indica desconto inválido sem inventar um total", () => {
    expect(calcularPreviaOrcamento([item], "FIXO", "1576")).toBeNull();
    expect(calcularPreviaOrcamento([item], "PERCENTUAL", "100,01")).toBeNull();
  });
  it("não altera os dados digitados usados no salvamento", () => {
    const original = { ...item };
    calcularPreviaOrcamento([original], "FIXO", "0");
    expect(original).toEqual(item);
  });
});
