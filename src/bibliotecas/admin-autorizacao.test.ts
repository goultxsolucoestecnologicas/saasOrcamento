import { beforeEach, describe, expect, it, vi } from "vitest";
const simulacao = vi.hoisted(() => ({
  identidade: vi.fn(),
  buscar: vi.fn(),
  transacao: vi.fn(),
  usuario: vi.fn(),
}));
vi.mock("@/bibliotecas/autenticacao", () => ({
  obterIdentidadeVerificada: simulacao.identidade,
}));
vi.mock("@/bibliotecas/banco", () => ({
  obterBanco: () => ({
    adminPlataforma: { findUnique: simulacao.buscar },
    usuario: { findUnique: simulacao.usuario },
    $transaction: simulacao.transacao,
  }),
}));
import {
  executarComoAdministrador,
  obterAdministradorPlataforma,
} from "./admin-autorizacao";
beforeEach(() => vi.resetAllMocks());
describe("autorização global independente da empresa", () => {
  it("anônimo não consulta banco nem executa operação", async () => {
    simulacao.identidade.mockResolvedValue(null);
    const operacao = vi.fn();
    await expect(executarComoAdministrador(operacao)).rejects.toMatchObject({
      status: 401,
    });
    expect(simulacao.buscar).not.toHaveBeenCalled();
    expect(operacao).not.toHaveBeenCalled();
  });
  it("usuário comum autenticado não herda acesso global", async () => {
    simulacao.identidade.mockResolvedValue("supabase-comum");
    simulacao.buscar.mockResolvedValue(null);
    await expect(obterAdministradorPlataforma()).rejects.toMatchObject({
      status: 403,
    });
    expect(simulacao.buscar).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idSupabase: "supabase-comum" } }),
    );
  });
  it("não autoriza administrador desativado", async () => {
    simulacao.identidade.mockResolvedValue("supabase-admin");
    simulacao.buscar.mockResolvedValue({
      idAdmin: "admin",
      nome: "Admin",
      ativo: false,
    });
    await expect(obterAdministradorPlataforma()).rejects.toMatchObject({
      status: 403,
    });
  });
  it("administrador sem vínculo de empresa é autorizado", async () => {
    simulacao.identidade.mockResolvedValue("supabase-admin");
    simulacao.buscar.mockResolvedValue({
      idAdmin: "admin",
      nome: "Admin",
      ativo: true,
    });
    await expect(obterAdministradorPlataforma()).resolves.toEqual({
      idAdmin: "admin",
      nome: "Admin",
    });
    expect(simulacao.usuario).not.toHaveBeenCalled();
  });
  it("revogação entre autenticação e transação bloqueia escrita", async () => {
    simulacao.identidade.mockResolvedValue("supabase-admin");
    simulacao.buscar.mockResolvedValue({
      idAdmin: "admin",
      nome: "Admin",
      ativo: true,
    });
    simulacao.transacao.mockImplementation(
      async (fn: (b: unknown) => Promise<unknown>) =>
        fn({ adminPlataforma: { findUnique: async () => ({ ativo: false }) } }),
    );
    const operacao = vi.fn();
    await expect(executarComoAdministrador(operacao)).rejects.toMatchObject({
      status: 403,
    });
    expect(operacao).not.toHaveBeenCalled();
  });
});
