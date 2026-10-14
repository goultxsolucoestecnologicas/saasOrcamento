import { describe, expect, it, vi } from "vitest";
vi.mock("@/bibliotecas/ambiente", () => ({
  obterAmbiente: () => ({ APP_URL: "http://localhost:3000" }),
}));
vi.mock("@/bibliotecas/contexto-empresa", () => ({
  ErroAcessoEmpresa: class extends Error {
    constructor(public status: number) {
      super("Acesso indisponível.");
    }
  },
}));
import {
  lerJsonLimitado,
  lerLogoMultipart,
  responderErroApi,
  verificarOrigem,
} from "./respostas-api";
import { ErroDominio } from "./erro-dominio";

describe("proteções das APIs", () => {
  it.each([null, "https://origem-alheia.example", "http://localhost:3001"])(
    "recusa origem ausente ou diferente: %s",
    (origem) => {
      const requisicao = new Request("http://localhost:3000/api/empresa", {
        headers: origem ? { origin: origem } : {},
      });
      expect(() => verificarOrigem(requisicao)).toThrow();
    },
  );
  it("aceita exatamente a origem configurada", () => {
    expect(() =>
      verificarOrigem(
        new Request("http://localhost:3000", {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).not.toThrow();
  });
  it("lê JSON dentro do limite sem confiar no content-length", async () => {
    const requisicao = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "1" },
      body: "{}",
    });
    expect(await lerJsonLimitado(requisicao)).toEqual({});
  });
  it("recusa corpo efetivamente maior que 128KB mesmo sem cabeçalho de tamanho", async () => {
    const requisicao = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "x".repeat(128 * 1024 + 1),
    });
    await expect(lerJsonLimitado(requisicao)).rejects.toMatchObject({
      status: 413,
    });
  });
  it("recusa cabeçalho de tamanho excessivo antes de ler o corpo", async () => {
    const requisicao = new Request("http://localhost", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "999999999",
      },
      body: "{}",
    });
    await expect(lerJsonLimitado(requisicao)).rejects.toMatchObject({
      status: 413,
    });
  });
  it("recusa JSON malformado e MIME incorreto", async () => {
    await expect(
      lerJsonLimitado(
        new Request("http://localhost", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      lerJsonLimitado(
        new Request("http://localhost", { method: "POST", body: "{}" }),
      ),
    ).rejects.toMatchObject({ status: 415 });
  });
  it("aceita um arquivo logo multipart e rejeita campos extras", async () => {
    const formulario = new FormData();
    formulario.append(
      "logo",
      new File(["imagem"], "logo.png", { type: "image/png" }),
    );
    expect(
      (
        await lerLogoMultipart(
          new Request("http://localhost", { method: "POST", body: formulario }),
        )
      ).name,
    ).toBe("logo.png");
    formulario.append("idEmpresa", "forjado");
    await expect(
      lerLogoMultipart(
        new Request("http://localhost", { method: "POST", body: formulario }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("oculta detalhes internos e usa cabeçalhos privados em erros", async () => {
    const resposta = responderErroApi(
      new Error("postgres://usuario:segredo@servidor"),
    );
    expect(resposta.status).toBe(500);
    expect(await resposta.text()).not.toContain("segredo");
    expect(resposta.headers.get("cache-control")).toBe("private, no-store");
    expect(resposta.headers.get("x-content-type-options")).toBe("nosniff");
    expect(
      responderErroApi(new ErroDominio("Não encontrado.", 404)).status,
    ).toBe(404);
  });
});
