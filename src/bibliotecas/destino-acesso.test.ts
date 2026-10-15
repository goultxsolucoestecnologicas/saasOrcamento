import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  identidade: vi.fn(),
  admin: vi.fn(),
  usuario: vi.fn(),
}));
vi.mock("@/bibliotecas/autenticacao", () => ({
  obterIdentidadeVerificada: mocks.identidade,
}));
vi.mock("@/bibliotecas/banco", () => ({
  obterBanco: () => ({
    adminPlataforma: { findUnique: mocks.admin },
    usuario: { findUnique: mocks.usuario },
  }),
}));
import { obterDestinoAcesso } from "./destino-acesso";
describe("destino privado de login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.identidade.mockResolvedValue("identidade-verificada");
    mocks.admin.mockResolvedValue(null);
  });
  it("exige identidade remota antes de consultar perfis", async () => {
    mocks.identidade.mockResolvedValue(null);
    await expect(obterDestinoAcesso()).rejects.toMatchObject({ status: 401 });
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("administrador global ativo não precisa empresa nem vaga", async () => {
    mocks.admin.mockResolvedValue({ ativo: true });
    expect(await obterDestinoAcesso()).toEqual({ destino: "/admin" });
    expect(mocks.admin).toHaveBeenCalledWith({
      where: { idSupabase: "identidade-verificada" },
      select: { ativo: true },
    });
    expect(mocks.usuario).not.toHaveBeenCalled();
  });
  it("administrador revogado não ganha acesso por ter registro", async () => {
    mocks.admin.mockResolvedValue({ ativo: false });
    mocks.usuario.mockResolvedValue(null);
    await expect(obterDestinoAcesso()).rejects.toMatchObject({ status: 403 });
  });
  it.each(["SUSPENSA", "CANCELADA"])(
    "assinatura %s preserva sessão e informa bloqueio",
    async (situacao) => {
      mocks.usuario.mockResolvedValue({
        ativo: true,
        empresa: { ativa: true, assinatura: { situacao } },
      });
      expect(await obterDestinoAcesso()).toEqual({
        destino: "/assinatura-indisponivel",
      });
    },
  );
  it("assinante ativo mantém a aplicação existente", async () => {
    mocks.usuario.mockResolvedValue({
      ativo: true,
      empresa: { ativa: true, assinatura: { situacao: "ATIVA" } },
    });
    expect(await obterDestinoAcesso()).toEqual({ destino: "/orcamentos" });
  });
  it("usuário desativado não é autorizado mesmo com assinatura ativa", async () => {
    mocks.usuario.mockResolvedValue({
      ativo: false,
      empresa: { ativa: true, assinatura: { situacao: "ATIVA" } },
    });
    await expect(obterDestinoAcesso()).rejects.toMatchObject({ status: 403 });
  });
});
