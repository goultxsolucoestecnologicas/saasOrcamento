import { afterEach, describe, expect, it, vi } from "vitest";
import { ErroRequisicao, requisitar } from "./api-cliente";
afterEach(() => vi.unstubAllGlobals());
describe("erros acessíveis da API", () => {
  it("preserva campos estruturados e status sem aceitar entradas malformadas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            erro: "Confira os campos.",
            campos: [
              null,
              "inválido",
              { campo: "clienteNome", mensagem: "Informe o nome." },
              { campo: 4, mensagem: { senha: "privada" } },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    await expect(requisitar("/api/orcamentos")).rejects.toMatchObject({
      status: 400,
      campos: [{ campo: "clienteNome", mensagem: "Informe o nome." }],
    });
  });
  it("não mostra HTML ou exceção técnica de rede", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("stack privada", { status: 500 })),
    );
    await expect(requisitar("/api/orcamentos")).rejects.toThrow(
      "Não foi possível concluir a operação.",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Detalhe interno")),
    );
    await expect(requisitar("/api/orcamentos")).rejects.toThrow(
      "Não foi possível conectar.",
    );
  });
  it("preserva cancelamento para a busca não anunciar erro de rede", async () => {
    const erro = new DOMException("cancelado", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(erro));
    await expect(requisitar("/api/orcamentos")).rejects.toBe(erro);
    expect(new ErroRequisicao("erro").campos).toEqual([]);
  });
});
