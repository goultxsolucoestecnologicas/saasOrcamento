import { beforeEach, expect, it, vi } from "vitest";
const simulacoes = vi.hoisted(() => ({ listarOrcamentos: vi.fn() }));
vi.mock("@/servicos/orcamentos", () => ({
  listarOrcamentos: simulacoes.listarOrcamentos,
  criarOrcamento: vi.fn(),
}));
vi.mock("@/bibliotecas/contexto-empresa", () => ({
  ErroAcessoEmpresa: class extends Error {},
}));
import { GET } from "./route";
beforeEach(() => {
  vi.resetAllMocks();
  simulacoes.listarOrcamentos.mockResolvedValue({
    orcamentos: [],
    proximoNumero: null,
  });
});

it("encaminha busca e cursor para o serviço e preserva o envelope", async () => {
  const resposta = await GET(
    new Request(
      "http://localhost/api/orcamentos?busca=%2300123&antesDeNumero=42",
    ),
  );
  expect(simulacoes.listarOrcamentos).toHaveBeenCalledWith("#00123", 42);
  expect(await resposta.json()).toEqual({
    dados: { orcamentos: [], proximoNumero: null },
  });
});
it("mantém cursor ausente como undefined", async () => {
  await GET(new Request("http://localhost/api/orcamentos"));
  expect(simulacoes.listarOrcamentos).toHaveBeenCalledWith("", undefined);
});
it.each(["", "NaN", "1.5", "null", "-1", "1e2", "42&antesDeNumero=43"])(
  "rejeita cursor malformado %s sem chamar serviço",
  async (cursor) => {
    const resposta = await GET(
      new Request(`http://localhost/api/orcamentos?antesDeNumero=${cursor}`),
    );
    expect(resposta.status).toBe(400);
    expect(simulacoes.listarOrcamentos).not.toHaveBeenCalled();
  },
);
