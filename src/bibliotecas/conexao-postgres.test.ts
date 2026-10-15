import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { resolve } from "node:path";
const simulacoes = vi.hoisted(() => ({ lerCertificado: vi.fn() }));
vi.mock("node:fs", async (original) => ({
  ...(await original<typeof import("node:fs")>()),
  readFileSync: simulacoes.lerCertificado,
}));
import { prepararConexaoPostgres, prepararUrlPrisma } from "./conexao-postgres";

const endereco =
  "postgresql://usuario:segredo-nao-expor@banco.example:5432/base?schema=empresa_teste";
const certificado =
  "-----BEGIN CERTIFICATE-----\nCA-DE-TESTE\n-----END CERTIFICATE-----";

describe("TLS PostgreSQL compartilhado", () => {
  beforeEach(() => {
    simulacoes.lerCertificado.mockReset();
    simulacoes.lerCertificado.mockReturnValue(certificado);
  });
  it.each([
    "",
    "&sslmode=require",
    "&sslmode=require&uselibpqcompat=true",
    "&sslmode=verify-ca",
  ])(
    "driver remoto sempre verifica certificado e hostname: %s",
    (parametros) => {
      const { configuracao, esquema } = prepararConexaoPostgres(
        endereco + parametros,
      );
      const cliente = new Client(configuracao);
      expect(esquema).toBe("empresa_teste");
      expect(configuracao.ssl).toEqual({ rejectUnauthorized: true });
      const tls = (
        cliente as unknown as { connectionParameters: { ssl: unknown } }
      ).connectionParameters.ssl;
      expect(tls).toEqual({ rejectUnauthorized: true });
      expect(
        new URL(configuracao.connectionString!).searchParams.has("sslmode"),
      ).toBe(false);
      expect(
        new URL(configuracao.connectionString!).searchParams.has(
          "uselibpqcompat",
        ),
      ).toBe(false);
    },
  );
  it.each([
    "sslmode=disable",
    "sslmode=no-verify",
    "ssl=no-verify",
    "ssl=false",
    "ssl=0",
    "sslaccept=accept_invalid_certs",
    "host=localhost",
    "hostaddr=127.0.0.1",
  ])("rejeita configuração remota insegura: %s", (parametro) => {
    expect(() => prepararConexaoPostgres(`${endereco}&${parametro}`)).toThrow();
    expect(() => prepararUrlPrisma(`${endereco}&${parametro}`)).toThrow();
  });
  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "preserva PostgreSQL local sem TLS: %s",
    (host) => {
      const local = `postgresql://usuario:senha@${host}:5432/base`;
      expect(prepararConexaoPostgres(local).configuracao.ssl).toBe(false);
      expect(
        new URL(prepararUrlPrisma(local)).searchParams.get("sslmode"),
      ).toBe("disable");
    },
  );
  it("não deixa variável de ambiente PGSSLMODE relaxar o driver remoto", () => {
    const antigo = process.env.PGSSLMODE;
    process.env.PGSSLMODE = "no-verify";
    try {
      const cliente = new Client(
        prepararConexaoPostgres(endereco).configuracao,
      );
      expect(
        (cliente as unknown as { connectionParameters: { ssl: unknown } })
          .connectionParameters.ssl,
      ).toEqual({ rejectUnauthorized: true });
    } finally {
      if (antigo === undefined) delete process.env.PGSSLMODE;
      else process.env.PGSSLMODE = antigo;
    }
  });
  it("carrega CA explícita sem permitir que parâmetros da URL sobrescrevam TLS", () => {
    const caminho = resolve("certificados/ca-publica.pem");
    const { configuracao } = prepararConexaoPostgres(
      endereco + "&sslmode=require",
      caminho,
    );
    expect(simulacoes.lerCertificado).toHaveBeenCalledWith(caminho, "utf8");
    expect(
      (
        new Client(configuracao) as unknown as {
          connectionParameters: { ssl: unknown };
        }
      ).connectionParameters.ssl,
    ).toEqual({ rejectUnauthorized: true, ca: certificado });
    const direto = new URL(prepararUrlPrisma(endereco, caminho));
    expect(direto.searchParams.get("sslmode")).toBe("require");
    expect(direto.searchParams.get("sslaccept")).toBe("strict");
    expect(direto.searchParams.get("sslcert")).toBe(caminho);
  });
  it("URL migrations remota exige strict e preserva schema", () => {
    const url = new URL(prepararUrlPrisma(endereco));
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.searchParams.get("sslaccept")).toBe("strict");
    expect(url.searchParams.get("schema")).toBe("empresa_teste");
    expect(prepararUrlPrisma("")).toBe("");
  });
  it("erro de certificado não inclui caminhos, URLs ou segredos", () => {
    simulacoes.lerCertificado.mockImplementation(() => {
      throw new Error("segredo-nao-expor");
    });
    try {
      prepararConexaoPostgres(endereco, "segredo-nao-expor");
      throw new Error("Não rejeitou");
    } catch (erro) {
      expect((erro as Error).message).toContain("POSTGRES_CA_CERTIFICADO");
      expect((erro as Error).message).not.toContain("segredo-nao-expor");
    }
  });
});
