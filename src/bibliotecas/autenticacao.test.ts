import { beforeEach, describe, expect, it, vi } from "vitest";
const simulacoes = vi.hoisted(() => ({
  configurar: vi.fn(),
  usuario: vi.fn(),
  obterCookies: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: simulacoes.configurar }));
vi.mock("next/headers", () => ({ cookies: simulacoes.obterCookies }));
vi.mock("@/bibliotecas/ambiente", () => ({
  obterAmbiente: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://teste.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "chave-publica-teste",
  }),
}));
import { obterAutenticacao, obterIdentidadeVerificada } from "./autenticacao";
describe("identidade Supabase verificada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    simulacoes.obterCookies.mockResolvedValue({
      getAll: () => [],
      set: vi.fn(),
    });
    simulacoes.configurar.mockReturnValue({
      auth: { getUser: simulacoes.usuario },
    });
  });
  it("verifica usuário remotamente em cada autorização", async () => {
    simulacoes.usuario.mockResolvedValue({
      data: { user: { id: "auth-a" } },
      error: null,
    });
    expect(await obterIdentidadeVerificada()).toBe("auth-a");
    expect(await obterIdentidadeVerificada()).toBe("auth-a");
    expect(simulacoes.usuario).toHaveBeenCalledTimes(2);
    expect(simulacoes.configurar).toHaveBeenCalledTimes(2);
  });
  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: "forjado" } }, error: { message: "inválido" } },
  ])("nega usuário ausente ou erro remoto", async (resultado) => {
    simulacoes.usuario.mockResolvedValue(resultado);
    expect(await obterIdentidadeVerificada()).toBeNull();
  });
  it("persiste cookies em contexto gravável", async () => {
    const set = vi.fn();
    simulacoes.obterCookies.mockResolvedValue({
      getAll: () => [{ name: "sessao", value: "teste" }],
      set,
    });
    await obterAutenticacao();
    const cookies = simulacoes.configurar.mock.calls[0][2].cookies;
    expect(cookies.getAll()).toEqual([{ name: "sessao", value: "teste" }]);
    cookies.setAll([
      { name: "renovada", value: "nova", options: { sameSite: "lax" } },
    ]);
    expect(set).toHaveBeenCalledWith("renovada", "nova", { sameSite: "lax" });
  });
});
