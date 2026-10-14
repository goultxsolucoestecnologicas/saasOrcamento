import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ criar: vi.fn(), claims: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.criar }));
import { proxy } from "./proxy";
describe("renovação de sessão no proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://teste.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_teste");
    mocks.criar.mockReturnValue({ auth: { getClaims: mocks.claims } });
    mocks.claims.mockResolvedValue({ data: null, error: null });
  });
  it("propaga cookies renovados à renderização e ao browser e impede cache público", async () => {
    mocks.claims.mockImplementation(async () => {
      const cookies = mocks.criar.mock.calls[0][2].cookies;
      cookies.setAll([
        {
          name: "sb-token",
          value: "novo-token",
          options: { path: "/", sameSite: "lax" },
        },
      ]);
      return { data: { claims: { sub: "auth-a" } }, error: null };
    });
    const requisicao = new NextRequest("http://localhost:3000/orcamentos", {
      headers: { cookie: "sb-token=antigo" },
    });
    const resposta = await proxy(requisicao);
    expect(requisicao.cookies.get("sb-token")?.value).toBe("novo-token");
    expect(resposta.cookies.get("sb-token")?.value).toBe("novo-token");
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.claims).toHaveBeenCalledTimes(1);
  });
  it("mantém cookies isolados por requisição mesmo após outra sessão renovar", async () => {
    const a = new NextRequest("http://localhost:3000/orcamentos", {
      headers: { cookie: "sb-token=a" },
    });
    const b = new NextRequest("http://localhost:3000/orcamentos", {
      headers: { cookie: "sb-token=b" },
    });
    await proxy(a);
    await proxy(b);
    expect(mocks.criar.mock.calls[0][2].cookies.getAll()).toEqual([
      { name: "sb-token", value: "a" },
    ]);
    expect(mocks.criar.mock.calls[1][2].cookies.getAll()).toEqual([
      { name: "sb-token", value: "b" },
    ]);
  });
});
