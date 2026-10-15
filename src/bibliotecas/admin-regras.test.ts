import { describe, expect, it } from "vitest";
import {
  avaliarVencimento,
  dataCalendario,
  decidirQuitacao,
  diasEntre,
  hojeSaoPaulo,
  proximoMes,
} from "./admin-regras";
import {
  esquemaConfiguracao,
  esquemaCriarAssinante,
  esquemaCriarCobranca,
  validarAdmin,
} from "@/servicos/admin";

describe("calendário financeiro em São Paulo", () => {
  it("não avança o dia antes da meia-noite local", () => {
    expect(hojeSaoPaulo(new Date("2026-10-16T02:59:59Z"))).toBe("2026-10-15");
    expect(hojeSaoPaulo(new Date("2026-10-16T03:00:00Z"))).toBe("2026-10-16");
  });
  it("rejeita datas inexistentes, timestamps e formatos ambíguos", () => {
    for (const valor of [
      "2026-02-29",
      "2026-04-31",
      "15/10/2026",
      "2026-10-15T00:00:00Z",
      "1900-01-01",
    ])
      expect(() => dataCalendario(valor)).toThrow();
    expect(dataCalendario("2028-02-29").toISOString()).toBe(
      "2028-02-29T00:00:00.000Z",
    );
  });
  it("conta dias corridos inclusive virada de mês e ano", () => {
    expect(diasEntre("2026-12-31", "2027-01-01")).toBe(1);
    expect(diasEntre("2028-02-28", "2028-03-01")).toBe(2);
  });
  it("preserva tolerância por três dias completos sem suspensão automática", () => {
    expect(avaliarVencimento("2026-10-10", false, 3, "2026-10-13")).toEqual({
      dias: -3,
      emAtraso: true,
      elegivelSuspensao: false,
    });
    expect(
      avaliarVencimento("2026-10-10", false, 3, "2026-10-14").elegivelSuspensao,
    ).toBe(true);
    expect(
      avaliarVencimento("2026-10-10", true, 3, "2026-10-14").elegivelSuspensao,
    ).toBe(false);
  });
  it("permite tolerância configurada zero e não marca hoje como atrasado", () => {
    expect(
      avaliarVencimento("2026-10-10", false, 0, "2026-10-10").emAtraso,
    ).toBe(false);
    expect(
      avaliarVencimento("2026-10-10", false, 0, "2026-10-11").elegivelSuspensao,
    ).toBe(true);
  });
  it("limita fim de mês sem pular fevereiro", () => {
    expect(proximoMes("2026-01-31")).toBe("2026-02-28");
    expect(proximoMes("2028-01-31")).toBe("2028-02-29");
    expect(proximoMes("2026-12-15")).toBe("2027-01-15");
  });
});
describe("integridade financeira e de cadastro", () => {
  it("quitação repetida é idempotente e cobrança cancelada nunca é paga", () => {
    expect(decidirQuitacao("PENDENTE", false)).toBe("CONFIRMAR");
    expect(decidirQuitacao("PAGA", true)).toBe("JA_CONFIRMADO");
    expect(() => decidirQuitacao("CANCELADA", false)).toThrow();
    expect(() => decidirQuitacao("PAGA", false)).toThrow();
    expect(() => decidirQuitacao("PENDENTE", true)).toThrow();
  });
  it("não admite dinheiro fracionário nem acesso anterior ao vencimento", () => {
    const base = {
      idEmpresa: "00000000-0000-4000-8000-000000000001",
      valorCentavos: 2999,
      dataVencimento: "2026-10-15",
      acessoAte: "2026-11-15",
    };
    expect(esquemaCriarCobranca.safeParse(base).success).toBe(true);
    for (const valor of [0, -1, 29.99, NaN, Infinity])
      expect(
        esquemaCriarCobranca.safeParse({ ...base, valorCentavos: valor })
          .success,
      ).toBe(false);
    expect(
      esquemaCriarCobranca.safeParse({ ...base, acessoAte: "2026-10-14" })
        .success,
    ).toBe(false);
  });
  it("não amplia vagas nem aceita privilégios escondidos no payload", () => {
    const config = {
      nomePlano: "Profissional",
      valorMensalCentavos: 2999,
      limiteUsuariosAtivos: 2,
      toleranciaDias: 3,
      nomeComercial: "OrçaFácil",
      contatoComercial: null,
    };
    expect(esquemaConfiguracao.safeParse(config).success).toBe(true);
    expect(
      esquemaConfiguracao.safeParse({ ...config, limiteUsuariosAtivos: 3 })
        .success,
    ).toBe(false);
    expect(
      esquemaConfiguracao.safeParse({ ...config, admin: true }).success,
    ).toBe(false);
  });
  it("preserva indicação de campo inválido sem expor o valor recebido", () => {
    try {
      validarAdmin(esquemaCriarAssinante, {
        nome: "Empresa",
        nomeUsuario: "Lucas",
        emailUsuario: "segredo-invalido",
        dataInicio: "2026-10-15",
        primeiroVencimento: "2026-10-14",
      });
      expect.fail();
    } catch (erro) {
      expect(JSON.stringify(erro)).not.toContain("segredo-invalido");
      expect(erro).toMatchObject({
        status: 400,
        campos: expect.arrayContaining([
          expect.objectContaining({ campo: "emailUsuario" }),
        ]),
      });
    }
  });
});
