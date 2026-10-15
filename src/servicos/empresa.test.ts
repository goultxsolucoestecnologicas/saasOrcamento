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
it("associa limites e obrigatoriedade aos campos sem expor chaves extras", async () => {
  await expect(
    atualizarEmpresa({
      nome: " ",
      telefone: "x".repeat(31),
      "senha-secreta": "segredo",
    }),
  ).rejects.toMatchObject({
    status: 400,
    campos: [
      { campo: "nome", mensagem: "Preencha nome da empresa." },
      { campo: "telefone", mensagem: "Telefone: use no máximo 30 caracteres." },
      {
        campo: "",
        mensagem:
          "Confira os dados enviados. Há um campo inválido ou não permitido.",
      },
    ],
  });
  expect(simulacoes.update).not.toHaveBeenCalled();
});
