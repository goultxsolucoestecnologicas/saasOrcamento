import { beforeEach, describe, expect, it, vi } from "vitest";

const simulacoes = vi.hoisted(() => ({
  configurar: vi.fn(),
  usuario: vi.fn(),
}));
vi.mock("better-auth", () => ({ betterAuth: simulacoes.configurar }));
vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: () => ({}) }));
vi.mock("@/bibliotecas/ambiente", () => ({
  obterAmbiente: () => ({
    BETTER_AUTH_URL: "http://localhost:3000",
    APP_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "segredo-apenas-dos-testes-com-32-caracteres",
  }),
}));
vi.mock("@/bibliotecas/banco", () => ({
  obterBanco: () => ({ usuario: { findUnique: simulacoes.usuario } }),
}));

describe("criação de sessão", () => {
  let antesDaSessao: (sessao: { userId: string }) => Promise<unknown>;

  beforeEach(async () => {
    vi.resetModules();
    simulacoes.usuario.mockReset();
    simulacoes.configurar.mockReset();
    const { obterAutenticacao } = await import("./autenticacao");
    obterAutenticacao();
    antesDaSessao =
      simulacoes.configurar.mock.calls[0][0].databaseHooks.session.create
        .before;
  });

  it.each([
    null,
    {
      ativo: false,
      empresa: { ativa: true, assinatura: { situacao: "ATIVA" } },
    },
    {
      ativo: true,
      empresa: { ativa: false, assinatura: { situacao: "ATIVA" } },
    },
    { ativo: true, empresa: { ativa: true, assinatura: null } },
    {
      ativo: true,
      empresa: { ativa: true, assinatura: { situacao: "SUSPENSA" } },
    },
  ])("bloqueia criação de sessão para acesso indisponível", async (usuario) => {
    simulacoes.usuario.mockResolvedValue(usuario);
    await expect(antesDaSessao({ userId: "usuario-a" })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("autoriza usuário ativo com empresa e assinatura ativas", async () => {
    simulacoes.usuario.mockResolvedValue({
      ativo: true,
      empresa: { ativa: true, assinatura: { situacao: "ATIVA" } },
    });
    await expect(
      antesDaSessao({ userId: "usuario-a" }),
    ).resolves.toBeUndefined();
    expect(simulacoes.usuario).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "usuario-a" } }),
    );
    expect(
      simulacoes.configurar.mock.calls[0][0].emailAndPassword.disableSignUp,
    ).toBe(true);
  });
});
