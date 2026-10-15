import { describe, expect, it } from "vitest";
import {
  formatarDataPdf,
  quebrarLinhasPdf,
  planejarDocumentoPdf,
  type DadosDocumentoOrcamento,
} from "./documento-orcamento";
const base: DadosDocumentoOrcamento = {
  numero: 1,
  dataCriacao: "2026-10-14T01:00:00Z",
  situacao: "RASCUNHO",
  clienteNome: "Cliente fictício",
  descontoTipo: "FIXO",
  descontoValor: 0,
  subtotalCentavos: 100,
  totalCentavos: 100,
  itens: [
    {
      descricao: "Serviço fictício",
      unidade: "m²",
      quantidadeMilesimos: 1234,
      valorUnitarioCentavos: 81,
      subtotalCentavos: 100,
    },
  ],
};
describe("paginação do formulário comercial", () => {
  it("amplia a marca sem nome, omite a descrição e conserva serviços e moldura", () => {
    const empresa = {
      nome: "Empresa fictícia",
      descricaoAtividade: "Atividade que não deve duplicar a marca",
      logo: "data:image/png;base64,fixture",
    };
    const comNome = planejarDocumentoPdf(base, empresa);
    const semNome = planejarDocumentoPdf(base, { ...empresa, nome: "   " });
    expect(semNome.gruposIdentidade.nome).toEqual([]);
    expect(semNome.gruposIdentidade.atividade).toEqual([]);
    expect(semNome.alturaLogo).toBeGreaterThan(comNome.alturaLogo);
    expect(semNome.alturaCabecalho).toBeGreaterThanOrEqual(
      semNome.alturaLogo + 16,
    );
    expect(semNome.paginas).toHaveLength(1);
    expect(semNome.paginas[0].itens.map((linha) => linha.item)).toEqual(
      base.itens,
    );
    expect(semNome.paginas[0].yTabela + semNome.paginas[0].alturaTabela).toBe(
      720,
    );
    expect(comNome.gruposIdentidade.atividade).not.toEqual([]);
    const semMarca = planejarDocumentoPdf(base, {
      ...empresa,
      nome: "",
      logo: "",
    });
    expect(semMarca.alturaLogo).toBe(0);
    expect(semMarca.identidade).toEqual([]);
  });
  it("preserva o dia date-only e o dia histórico local", () => {
    expect(
      formatarDataPdf({ ...base, dataEmissao: "2026-10-14T00:00:00Z" }),
    ).toBe("14/10/2026");
    expect(formatarDataPdf(base)).toBe("13/10/2026");
  });
  it("reserva a grade na página única sem página extra", () => {
    const p = planejarDocumentoPdf(base, { nome: "Empresa fictícia" });
    expect(p.paginas).toHaveLength(1);
    expect(p.paginas[0].alturaTabela).toBeGreaterThan(400);
  });
  it("divide palavras ininterruptas sem perder caracteres", () => {
    const texto = "W".repeat(500);
    const linhas = quebrarLinhasPdf(texto, 100);
    expect(linhas.join("")).toBe(texto);
    expect(linhas.every((l) => l.length <= 13)).toBe(true);
  });
  it("distribui 100 serviços e preserva cada linha", () => {
    const itens = Array.from({ length: 100 }, (_, i) => ({
      ...base.itens[0],
      descricao: `Serviço ${i}`,
    }));
    const p = planejarDocumentoPdf(
      { ...base, itens },
      { nome: "Empresa fictícia" },
    );
    expect(p.paginas.length).toBeGreaterThan(1);
    expect(
      p.paginas.flatMap((p) => p.itens).map((l) => l.item.descricao),
    ).toEqual(itens.map((i) => i.descricao));
    for (const pagina of p.paginas)
      expect(
        pagina.yTabela + 23 + pagina.itens.reduce((s, l) => s + l.altura, 0),
      ).toBeLessThanOrEqual(720);
  });
  it("divide descrições maiores que uma folha sem repetir valores", () => {
    const descricao = "X\n".repeat(249) + "X";
    const p = planejarDocumentoPdf(
      { ...base, itens: [{ ...base.itens[0], descricao }] },
      { nome: "Empresa fictícia" },
    );
    const linhas = p.paginas.flatMap((p) => p.itens);
    expect(linhas.flatMap((l) => l.linhas).join("\n")).toBe(descricao);
    expect(linhas.filter((l) => !l.continuacao)).toHaveLength(1);
    expect(p.paginas.every((p) => p.itens.length > 0)).toBe(true);
  });
  it("preserva observações de 4000 caracteres e todas as quebras", () => {
    const observacoes = "A\n".repeat(1999) + "AB";
    const p = planejarDocumentoPdf(
      { ...base, observacoes },
      { nome: "Empresa fictícia" },
    );
    expect(p.paginas.flatMap((p) => p.observacoes).join("\n")).toBe(
      `Obs.: ${observacoes}`,
    );
    expect(p.paginas.every((p) => p.observacoes.length || p.itens.length)).toBe(
      true,
    );
  });
  it("acomoda nomes e identidade nos limites sem cortar dados", () => {
    const p = planejarDocumentoPdf(
      {
        ...base,
        clienteNome: "W".repeat(150),
        clienteEndereco: "W".repeat(300),
      },
      {
        nome: "W".repeat(150),
        descricaoAtividade: "W".repeat(300),
        nomeResponsavel: "W".repeat(150),
        cidade: "W".repeat(120),
        estado: "RS",
        instagram: "W".repeat(150),
        facebook: "W".repeat(150),
        slogan: "W".repeat(200),
      },
    );
    expect(
      p.identidade
        .map((l) => l.texto)
        .join("")
        .includes("W".repeat(300)),
    ).toBe(true);
    expect(p.alturaCabecalho).toBeLessThan(400);
    expect(p.paginas.flatMap((p) => p.itens)).toHaveLength(1);
  });
  it("acomoda unidades longas e valores altos na própria linha", () => {
    const item = {
      ...base.itens[0],
      quantidadeMilesimos: 100000000,
      unidade: "W".repeat(20),
      valorUnitarioCentavos: 999999999,
      subtotalCentavos: 999999999999,
    };
    const p = planejarDocumentoPdf(
      { ...base, itens: [item] },
      { nome: "Empresa fictícia" },
    );
    const linha = p.paginas[0].itens[0];
    expect(linha.quantidade.join("").replaceAll(" ", "")).toBe(
      "100.000" + "W".repeat(20),
    );
    expect(linha.altura).toBeGreaterThanOrEqual(
      Math.max(
        linha.quantidade.length,
        linha.preco.length,
        linha.total.length,
      ) *
        11 +
        8,
    );
  });
  it("reserva cliente e identidade máximos sem avançar sobre o total", () => {
    const p = planejarDocumentoPdf(
      {
        ...base,
        clienteNome: "W".repeat(150),
        clienteEndereco: "W".repeat(300),
        clienteNumeroEndereco: "W".repeat(20),
        clienteCidade: "W".repeat(120),
        clienteDocumento: "W".repeat(30),
        clienteInscricaoEstadual: "W".repeat(30),
      },
      {
        nome: "W".repeat(150),
        descricaoAtividade: "W".repeat(300),
        telefone: "W".repeat(30),
        nomeResponsavel: "W".repeat(150),
        cidade: "W".repeat(120),
        estado: "RS",
        instagram: "W".repeat(150),
        facebook: "W".repeat(150),
        slogan: "W".repeat(200),
      },
    );
    expect(p.paginas).toHaveLength(1);
    expect(
      p.paginas[0].yTabela + 23 + p.paginas[0].itens[0].altura,
    ).toBeLessThanOrEqual(720);
    expect(
      p.clientes
        .flat()
        .map((c) => c.linhas.join(""))
        .join(""),
    ).toBe("W".repeat(650));
  });
  it("mantém a grade e linhas vazias dentro do limite nas alturas limítrofes", () => {
    for (let n = 0; n < 60; n++) {
      const p = planejarDocumentoPdf(
        {
          ...base,
          observacoes: "Observação fictícia\n".repeat(n),
          itens: Array.from({ length: 20 }, (_, i) => ({
            ...base.itens[0],
            descricao: "W".repeat((i + 1) * 19),
          })),
        },
        { nome: "Empresa fictícia", descricaoAtividade: "W".repeat(n * 3) },
      );
      for (const pagina of p.paginas.filter((p) => p.itens.length))
        expect(
          pagina.alturaTabela -
            23 -
            pagina.itens.reduce((s, l) => s + l.altura, 0),
        ).toBeGreaterThanOrEqual(0);
    }
  });
  it("move descrições extensas inteiras quando cabem em uma página nova", () => {
    const itens = Array.from({ length: 100 }, (_, i) => ({
      ...base.itens[0],
      descricao:
        `Serviço ${i}: ${"Descrição extensa com detalhes e acabamento. ".repeat(12)}`.slice(
          0,
          500,
        ),
    }));
    const p = planejarDocumentoPdf(
      { ...base, itens },
      { nome: "Empresa fictícia" },
    );
    const linhas = p.paginas.flatMap((p) => p.itens);
    expect(linhas).toHaveLength(100);
    expect(linhas.every((l) => !l.continuacao)).toBe(true);
    expect(linhas.map((l) => l.item.descricao)).toEqual(
      itens.map((i) => i.descricao),
    );
  });
  it("compacta cabeçalho sem logo e campos comerciais opcionais", () => {
    const simples = planejarDocumentoPdf(base, { nome: "Empresa fictícia" });
    const comLogo = planejarDocumentoPdf(base, {
      nome: "Empresa fictícia",
      logo: "data:image/png;base64,ficticia",
    });
    expect(simples.alturaCabecalho).toBe(52);
    expect(simples.alturaCabecalho).toBeLessThan(comLogo.alturaCabecalho);
  });
});
