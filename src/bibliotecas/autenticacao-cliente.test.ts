import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  criar: vi.fn(),
  entrar: vi.fn(),
  sair: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({ createBrowserClient: mocks.criar }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://empresa.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_teste");
  mocks.criar.mockReturnValue({
    auth: { signInWithPassword: mocks.entrar, signOut: mocks.sair },
  });
  mocks.entrar.mockResolvedValue({ error: null });
  mocks.sair.mockResolvedValue({ error: null });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dados: { destino: "/orcamentos" } }),
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Autenticação Supabase do navegador", () => {
  it("reutiliza o cliente e exige somente as configurações públicas", async () => {
    const { obterAutenticacaoCliente } = await import("./autenticacao-cliente");
    expect(obterAutenticacaoCliente()).toBe(obterAutenticacaoCliente());
    expect(mocks.criar).toHaveBeenCalledTimes(1);
    expect(mocks.criar).toHaveBeenCalledWith(
      "https://empresa.supabase.co",
      "sb_publishable_teste",
    );
  });
  it("consulta a autorização empresarial após autenticar", async () => {
    const { entrarComSenha } = await import("./autenticacao-cliente");
    await entrarComSenha("usuario@exemplo.com", "senha-teste");
    expect(mocks.entrar).toHaveBeenCalledWith({
      email: "usuario@exemplo.com",
      password: "senha-teste",
    });
    expect(fetch).toHaveBeenCalledWith("/api/acesso", { cache: "no-store" });
    expect(mocks.sair).not.toHaveBeenCalled();
  });
  it.each(["/admin", "/assinatura-indisponivel"])(
    "preserva destino autorizado %s",
    async (destino) => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ dados: { destino } }),
      } as Response);
      const { entrarComSenha } = await import("./autenticacao-cliente");
      expect(await entrarComSenha("usuario@exemplo.com", "senha-teste")).toBe(
        destino,
      );
      expect(mocks.sair).not.toHaveBeenCalled();
    },
  );
  it("rejeita redirecionamento externo mesmo com resposta 200", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ dados: { destino: "https://externo.invalid" } }),
    } as Response);
    const { entrarComSenha } = await import("./autenticacao-cliente");
    await expect(
      entrarComSenha("usuario@exemplo.com", "senha-teste"),
    ).rejects.toThrow("acesso indisponível");
    expect(mocks.sair).toHaveBeenCalled();
  });
  it("encerra a sessão quando a empresa não autoriza o usuário", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403 } as Response);
    const { entrarComSenha } = await import("./autenticacao-cliente");
    await expect(
      entrarComSenha("usuario@exemplo.com", "senha-teste"),
    ).rejects.toThrow("E-mail ou senha inválidos, ou acesso indisponível.");
    expect(mocks.sair).toHaveBeenCalledTimes(1);
  });
  it("não consulta a empresa se a autenticação falhar", async () => {
    mocks.entrar.mockResolvedValue({
      error: { message: "Detalhe privado do provedor" },
    });
    const { entrarComSenha } = await import("./autenticacao-cliente");
    await expect(
      entrarComSenha("usuario@exemplo.com", "senha-teste"),
    ).rejects.toThrow("E-mail ou senha inválidos, ou acesso indisponível.");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("encerra a sessão quando a verificação de acesso perde conexão", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Sem conexão"));
    const { entrarComSenha } = await import("./autenticacao-cliente");
    await expect(
      entrarComSenha("usuario@exemplo.com", "senha-teste"),
    ).rejects.toThrow("acesso indisponível");
    expect(mocks.sair).toHaveBeenCalled();
  });
});
