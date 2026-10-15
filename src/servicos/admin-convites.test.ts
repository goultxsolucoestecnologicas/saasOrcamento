import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/gerado/prisma/client";
const simulacao = vi.hoisted(() => ({
  executar: vi.fn(),
  autorizar: vi.fn(),
  cliente: vi.fn(),
  convidar: vi.fn(),
  recuperar: vi.fn(),
  auditar: vi.fn(),
  configuracao: vi.fn(),
}));
vi.mock("@/bibliotecas/admin-autorizacao", () => ({
  executarComoAdministrador: simulacao.executar,
  obterAdministradorPlataforma: simulacao.autorizar,
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: simulacao.cliente }));
vi.mock("@/bibliotecas/ambiente", () => ({
  obterAmbiente: () => ({
    APP_URL: "https://orcafacil.test",
    NEXT_PUBLIC_SUPABASE_URL: "https://auth.example.test",
  }),
}));
vi.mock("@/servicos/admin", async (importar) => ({
  ...(await importar<typeof import("@/servicos/admin")>()),
  auditar: simulacao.auditar,
  configuracao: simulacao.configuracao,
}));
import {
  adicionarUsuarioAdmin,
  criarAssinanteAdmin,
  enviarConviteAdmin,
} from "./admin-convites";
const idEmpresa = "00000000-0000-4000-8000-000000000001";
const idConvite = "00000000-0000-4000-8000-000000000002";
const idOficial = "00000000-0000-4000-8000-000000000003";
function prepararBanco() {
  const convite = {
    idConvite,
    idEmpresa,
    nome: "Pessoa de teste",
    email: "fixture@example.test",
    idSupabase: null as string | null,
    situacao: "PENDENTE",
    dataTentativa: null as Date | null,
  };
  const banco = {
    empresa: {
      update: vi.fn(async () => ({ idEmpresa })),
      findUnique: vi.fn(async () => ({ idEmpresa })),
      create: vi.fn(async () => ({ idEmpresa })),
    },
    assinatura: { create: vi.fn(async () => ({ idAssinatura: "assinatura" })) },
    cobranca: { create: vi.fn() },
    conviteAdministrativo: {
      findFirst: vi.fn(async () => ({ ...convite })),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async ({ data }: { data: Partial<typeof convite> }) =>
        Object.assign(convite, data),
      ),
      create: vi.fn(async () => ({ ...convite })),
      count: vi.fn(async () => 0),
    },
    usuario: {
      count: vi.fn(async () => 0),
      findUnique: vi.fn(
        async (): Promise<{ idEmpresa: string } | null> => null,
      ),
      create: vi.fn(),
    },
  };
  simulacao.executar.mockImplementation(
    async (
      fn: (
        tx: Prisma.TransactionClient,
        admin: { idAdmin: string; nome: string },
      ) => Promise<unknown>,
    ) =>
      fn(banco as unknown as Prisma.TransactionClient, {
        idAdmin: "admin",
        nome: "Admin",
      }),
  );
  return { banco, convite };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPABASE_SECRET_KEY", "chave-ficticia-exclusiva-teste");
  simulacao.autorizar.mockResolvedValue({ idAdmin: "admin" });
  simulacao.cliente.mockReturnValue({
    auth: {
      admin: { inviteUserByEmail: simulacao.convidar },
      resetPasswordForEmail: simulacao.recuperar,
    },
  });
  simulacao.convidar.mockResolvedValue({
    data: {
      user: {
        id: idOficial,
        user_metadata: {
          idEmpresa: "empresa-atacante",
          idAutenticacaoSupabase: "uuid-atacante",
        },
      },
    },
    error: null,
  });
  simulacao.recuperar.mockResolvedValue({ error: null });
  simulacao.configuracao.mockResolvedValue({
    nomePlano: "Profissional",
    valorMensalCentavos: 2999,
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("convite administrativo durável sem Auth externo real", () => {
  it("vincula somente o UUID devolvido pela API oficial e ignora metadata", async () => {
    const { banco, convite } = prepararBanco();
    await expect(enviarConviteAdmin(idEmpresa, idConvite)).resolves.toEqual({
      idConvite,
      enviado: true,
    });
    expect(banco.usuario.findUnique).toHaveBeenCalledWith({
      where: { idAutenticacaoSupabase: idOficial },
    });
    expect(banco.usuario.create).toHaveBeenCalledWith({
      data: {
        name: "Pessoa de teste",
        email: "fixture@example.test",
        idEmpresa,
        idAutenticacaoSupabase: idOficial,
        emailVerified: false,
        ativo: true,
      },
    });
    expect(convite).toMatchObject({
      idSupabase: idOficial,
      situacao: "CONCLUIDO",
    });
    expect(
      banco.conviteAdministrativo.update.mock.invocationCallOrder[1],
    ).toBeLessThan(banco.usuario.create.mock.invocationCallOrder[0]);
    expect(simulacao.cliente).toHaveBeenCalledWith(
      "https://auth.example.test",
      "chave-ficticia-exclusiva-teste",
      expect.objectContaining({
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }),
    );
  });
  it("falha SMTP preserva a reserva pendente sem criar usuário nem expor erro externo", async () => {
    const { banco, convite } = prepararBanco();
    simulacao.convidar.mockResolvedValue({
      data: { user: null },
      error: { message: "SMTP segredo-do-provedor" },
    });
    const resultado = await enviarConviteAdmin(idEmpresa, idConvite);
    expect(resultado).toMatchObject({ idConvite, enviado: false });
    expect(JSON.stringify(resultado)).not.toContain("segredo-do-provedor");
    expect(convite.situacao).toBe("PENDENTE");
    expect(banco.usuario.create).not.toHaveBeenCalled();
    expect(simulacao.auditar).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "CONVITE_PENDENTE",
      "empresa",
      idEmpresa,
      { idConvite },
    );
  });
  it("identidade já vinculada a outra empresa nunca é transferida pelo e-mail", async () => {
    const { banco, convite } = prepararBanco();
    banco.usuario.findUnique.mockResolvedValue({ idEmpresa: "outra-empresa" });
    await expect(
      enviarConviteAdmin(idEmpresa, idConvite),
    ).resolves.toMatchObject({ enviado: false });
    expect(banco.usuario.create).not.toHaveBeenCalled();
    expect(banco.usuario.findUnique).toHaveBeenCalledTimes(1);
    expect(banco.usuario.findUnique).toHaveBeenCalledWith({
      where: { idAutenticacaoSupabase: idOficial },
    });
    expect(convite.situacao).toBe("PENDENTE");
  });
  it("não recupera identidades existentes por busca automática de e-mail após recusa do provedor", async () => {
    const { banco } = prepararBanco();
    simulacao.convidar.mockResolvedValue({
      data: { user: null },
      error: { message: "already registered" },
    });
    await expect(
      enviarConviteAdmin(idEmpresa, idConvite),
    ).resolves.toMatchObject({ enviado: false });
    expect(banco.usuario.findUnique).not.toHaveBeenCalled();
    expect(banco.usuario.create).not.toHaveBeenCalled();
  });
  it("lease recente impede envio duplicado e lease expirado permite nova tentativa", async () => {
    const atual = prepararBanco();
    atual.convite.situacao = "ENVIANDO";
    atual.convite.dataTentativa = new Date();
    await expect(enviarConviteAdmin(idEmpresa, idConvite)).rejects.toThrow(
      "sendo enviado",
    );
    expect(simulacao.convidar).not.toHaveBeenCalled();
    atual.convite.dataTentativa = new Date(Date.now() - 121000);
    await expect(
      enviarConviteAdmin(idEmpresa, idConvite),
    ).resolves.toMatchObject({ enviado: true });
    expect(simulacao.convidar).toHaveBeenCalledTimes(1);
  });
  it("reserva e auditoria são persistidas antes da chamada ao Auth", async () => {
    const { banco } = prepararBanco();
    await adicionarUsuarioAdmin(idEmpresa, {
      nome: "Pessoa de teste",
      email: "fixture@example.test",
    });
    expect(
      banco.conviteAdministrativo.create.mock.invocationCallOrder[0],
    ).toBeLessThan(simulacao.convidar.mock.invocationCallOrder[0]);
    expect(simulacao.auditar.mock.invocationCallOrder[0]).toBeLessThan(
      simulacao.convidar.mock.invocationCallOrder[0],
    );
    expect(
      banco.conviteAdministrativo.update.mock.invocationCallOrder[0],
    ).toBeLessThan(simulacao.convidar.mock.invocationCallOrder[0]);
  });
  it("vaga reservada impede terceiro convite sem chamar o provedor", async () => {
    const { banco } = prepararBanco();
    banco.usuario.count.mockResolvedValue(1);
    banco.conviteAdministrativo.count.mockResolvedValue(1);
    await expect(
      adicionarUsuarioAdmin(idEmpresa, {
        nome: "Terceiro",
        email: "terceiro@example.test",
      }),
    ).rejects.toThrow("duas vagas");
    expect(simulacao.convidar).not.toHaveBeenCalled();
    expect(banco.conviteAdministrativo.create).not.toHaveBeenCalled();
  });
  it("reenvio com UUID já persistido usa recuperação oficial sem criar outra identidade", async () => {
    const { banco, convite } = prepararBanco();
    convite.idSupabase = idOficial;
    await expect(
      enviarConviteAdmin(idEmpresa, idConvite),
    ).resolves.toMatchObject({ enviado: true });
    expect(simulacao.convidar).not.toHaveBeenCalled();
    expect(simulacao.recuperar).toHaveBeenCalledWith("fixture@example.test", {
      redirectTo: "https://orcafacil.test/auth/confirmar",
    });
    expect(banco.usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idAutenticacaoSupabase: idOficial }),
      }),
    );
  });
  it("cadastro preserva empresa, assinatura e cobrança quando envio está indisponível", async () => {
    const { banco, convite } = prepararBanco();
    simulacao.convidar.mockRejectedValue(new Error("SMTP indisponível"));
    const resultado = await criarAssinanteAdmin({
      nome: "Empresa fictícia",
      nomeUsuario: "Pessoa de teste",
      emailUsuario: "fixture@example.test",
      dataInicio: "2026-10-15",
      primeiroVencimento: "2026-10-15",
    });
    expect(resultado).toMatchObject({
      idEmpresa,
      idConvite,
      convite: { enviado: false },
    });
    expect(banco.empresa.create).toHaveBeenCalledTimes(1);
    expect(banco.assinatura.create).toHaveBeenCalledTimes(1);
    expect(banco.cobranca.create).toHaveBeenCalledTimes(1);
    expect(banco.usuario.create).not.toHaveBeenCalled();
    expect(convite.situacao).toBe("PENDENTE");
    expect(banco.cobranca.create.mock.invocationCallOrder[0]).toBeLessThan(
      simulacao.convidar.mock.invocationCallOrder[0],
    );
  });
});
