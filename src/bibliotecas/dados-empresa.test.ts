import { beforeEach, describe, expect, it, vi } from "vitest";

const simulacoes = vi.hoisted(() => ({
  consultarUsuario: vi.fn(),
  transacao: vi.fn(),
}));
vi.mock("@/bibliotecas/contexto-empresa", () => ({
  ErroAcessoEmpresa: class extends Error {
    status = 403;
  },
  executarNaEmpresa: async (
    operacao: (contexto: {
      idEmpresa: string;
      idUsuario: string;
    }) => Promise<unknown>,
  ) =>
    operacao(Object.freeze({ idEmpresa: "empresa-a", idUsuario: "usuario-a" })),
}));
vi.mock("@/bibliotecas/banco", () => ({
  obterBanco: () => ({ $transaction: simulacoes.transacao }),
}));
import { executarComDadosDaEmpresa } from "./dados-empresa";

describe("transação confiável da empresa", () => {
  beforeEach(() => {
    simulacoes.consultarUsuario.mockReset();
    simulacoes.transacao.mockImplementation(async (operacao) =>
      operacao({ usuario: { findFirst: simulacoes.consultarUsuario } }),
    );
  });

  it("revalida acesso com usuário e empresa do contexto", async () => {
    simulacoes.consultarUsuario.mockResolvedValue({
      empresa: { ativa: true, assinatura: { situacao: "ATIVA" } },
    });
    const resultado = await executarComDadosDaEmpresa(
      async (_transacao, contexto) => contexto,
    );
    expect(resultado).toEqual({
      idEmpresa: "empresa-a",
      idUsuario: "usuario-a",
    });
    expect(simulacoes.consultarUsuario).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "usuario-a", idEmpresa: "empresa-a", ativo: true },
      }),
    );
  });

  it("interrompe operação quando assinatura foi suspensa antes da transação", async () => {
    simulacoes.consultarUsuario.mockResolvedValue({
      empresa: { ativa: true, assinatura: { situacao: "SUSPENSA" } },
    });
    const operacao = vi.fn();
    await expect(executarComDadosDaEmpresa(operacao)).rejects.toMatchObject({
      status: 403,
    });
    expect(operacao).not.toHaveBeenCalled();
  });

  it("entrega apenas os delegates protegidos ao callback", async () => {
    simulacoes.consultarUsuario.mockResolvedValue({
      empresa: { ativa: true, assinatura: { situacao: "ATIVA" } },
    });
    await executarComDadosDaEmpresa(async (transacao) => {
      expect(Object.keys(transacao)).toEqual([
        "empresa",
        "assinatura",
        "orcamento",
        "orcamentoItem",
      ]);
      expect("usuario" in transacao).toBe(false);
      expect("$queryRaw" in transacao).toBe(false);
    });
  });
});
