import { beforeEach, expect, it, vi } from "vitest";
const simulacoes = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));
vi.mock("@/bibliotecas/dados-empresa", () => ({
  executarComDadosDaEmpresa: async (
    operacao: (transacao: unknown, contexto: unknown) => Promise<unknown>,
  ) => operacao({ empresa: simulacoes }, { idEmpresa: "empresa-a" }),
}));
import { atualizarEmpresa, buscarEmpresa } from "./empresa";
beforeEach(() => vi.resetAllMocks());
it("busca somente a empresa do contexto", async () => {
  simulacoes.findUnique.mockResolvedValue({
    idEmpresa: "empresa-a",
    nome: "Nome",
    telefone: null,
    logoChave: null,
  });
  await buscarEmpresa();
  expect(simulacoes.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({ where: { idEmpresa: "empresa-a" } }),
  );
});
it("rejeita tentativa de alterar empresa ou logo por campo forjado", async () => {
  await expect(
    atualizarEmpresa({ nome: "Nome", idEmpresa: "empresa-b" }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    atualizarEmpresa({ nome: "Nome", logoChave: "empresa-b/logo.png" }),
  ).rejects.toMatchObject({ status: 400 });
  expect(simulacoes.update).not.toHaveBeenCalled();
});
it("atualiza somente nome e telefone da própria empresa", async () => {
  await atualizarEmpresa({ nome: " Empresa ", telefone: null });
  expect(simulacoes.update).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { idEmpresa: "empresa-a" },
      data: { nome: "Empresa", telefone: null },
    }),
  );
});
