import { beforeEach, describe, expect, it, vi } from "vitest";
const simulacao = vi.hoisted(() => ({ autorizar: vi.fn() }));
vi.mock("@/bibliotecas/admin-autorizacao", () => ({
  obterAdministradorPlataforma: simulacao.autorizar,
}));
vi.mock("@/bibliotecas/ambiente", () => ({
  obterAmbiente: () => ({ APP_URL: "https://orcafacil.test" }),
}));
import { escreverAdmin, responderAdmin } from "./admin-api";
import { ErroAcessoEmpresa } from "./contexto-empresa";
beforeEach(() => vi.resetAllMocks());
describe("fronteira HTTP administrativa", () => {
  it("retorna401 antes de ler corpo de escrita anônima", async () => {
    simulacao.autorizar.mockRejectedValue(new ErroAcessoEmpresa(401));
    const operacao = vi.fn();
    const resposta = await escreverAdmin(
      new Request("https://orcafacil.test/api/admin/assinantes", {
        method: "POST",
        body: "json-invalido",
      }),
      operacao,
    );
    expect(resposta.status).toBe(401);
    expect(operacao).not.toHaveBeenCalled();
    expect(resposta.headers.get("cache-control")).toContain("no-store");
  });
  it("usuário comum recebe403 em todas as leituras globais", async () => {
    simulacao.autorizar.mockRejectedValue(new ErroAcessoEmpresa(403));
    const operacao = vi.fn();
    const resposta = await responderAdmin(operacao);
    expect(resposta.status).toBe(403);
    expect(operacao).not.toHaveBeenCalled();
  });
  it("mesmo administrador não escreve por origem externa", async () => {
    simulacao.autorizar.mockResolvedValue({ idAdmin: "a" });
    const operacao = vi.fn();
    const resposta = await escreverAdmin(
      new Request("https://orcafacil.test/api/admin/cobrancas", {
        method: "POST",
        headers: {
          origin: "https://ataque.test",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      operacao,
    );
    expect(resposta.status).toBe(403);
    expect(operacao).not.toHaveBeenCalled();
  });
  it("erro interno nunca expõe mensagens de banco ou segredos", async () => {
    simulacao.autorizar.mockResolvedValue({ idAdmin: "a" });
    const resposta = await responderAdmin(async () => {
      throw new Error("postgres://usuario:segredo@host/db");
    });
    expect(resposta.status).toBe(500);
    expect(await resposta.text()).not.toContain("segredo");
  });
});
