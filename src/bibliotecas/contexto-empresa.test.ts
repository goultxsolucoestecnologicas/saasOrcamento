import { beforeEach, describe, expect, it, vi } from "vitest";
const simulacoes = vi.hoisted(() => ({ sessao: vi.fn(), usuario: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/bibliotecas/autenticacao", () => ({
  obterAutenticacao: () => ({ api: { getSession: simulacoes.sessao } }),
}));
vi.mock("@/bibliotecas/banco", () => ({
  obterBanco: () => ({ usuario: { findUnique: simulacoes.usuario } }),
}));
import { executarNaEmpresa } from "./contexto-empresa";

describe("contexto confiável da empresa", () => {
  beforeEach(() => {
    simulacoes.sessao.mockReset();
    simulacoes.usuario.mockReset();
  });
  it("recusa acesso anônimo antes de consultar dados", async () => {
    simulacoes.sessao.mockResolvedValue(null);
    await expect(executarNaEmpresa(vi.fn())).rejects.toMatchObject({
      status: 401,
    });
    expect(simulacoes.usuario).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { ativo: false, empresa: { ativa: true } },
    { ativo: true, empresa: { ativa: false } },
    { ativo: true, empresa: { ativa: true, assinatura: null } },
    {
      ativo: true,
      empresa: { ativa: true, assinatura: { situacao: "SUSPENSA" } },
    },
  ])(
    "recusa usuário inexistente, inativo ou empresa suspensa",
    async (usuario) => {
      simulacoes.sessao.mockResolvedValue({ user: { id: "usuario-a" } });
      simulacoes.usuario.mockResolvedValue(usuario);
      const operacao = vi.fn();
      await expect(executarNaEmpresa(operacao)).rejects.toMatchObject({
        status: 403,
      });
      expect(operacao).not.toHaveBeenCalled();
    },
  );
  it("usa a empresa atual do banco mesmo com outra empresa na sessão", async () => {
    simulacoes.sessao.mockResolvedValue({
      user: { id: "usuario-a", idEmpresa: "empresa-forjada" },
    });
    simulacoes.usuario.mockResolvedValue({
      id: "usuario-a",
      idEmpresa: "empresa-a",
      ativo: true,
      empresa: { ativa: true, assinatura: { situacao: "ATIVA" } },
    });
    const contexto = await executarNaEmpresa(async (valor) => valor);
    expect(contexto).toEqual({
      idUsuario: "usuario-a",
      idEmpresa: "empresa-a",
    });
    expect(Object.isFrozen(contexto)).toBe(true);
    expect(simulacoes.sessao).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } }),
    );
    expect(simulacoes.usuario).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "usuario-a" } }),
    );
  });
  it("recusa assinatura revogada depois de uma sessão válida", async () => {
    simulacoes.sessao.mockResolvedValue({ user: { id: "usuario-a" } });
    simulacoes.usuario.mockResolvedValueOnce({
      id: "usuario-a",
      idEmpresa: "empresa-a",
      ativo: true,
      empresa: { ativa: true, assinatura: { situacao: "ATIVA" } },
    });
    await executarNaEmpresa(async () => undefined);
    simulacoes.usuario.mockResolvedValueOnce({
      id: "usuario-a",
      idEmpresa: "empresa-a",
      ativo: true,
      empresa: { ativa: true, assinatura: { situacao: "SUSPENSA" } },
    });
    const operacao = vi.fn();
    await expect(executarNaEmpresa(operacao)).rejects.toMatchObject({
      status: 403,
    });
    expect(operacao).not.toHaveBeenCalled();
  });
});
