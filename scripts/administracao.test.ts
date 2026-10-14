import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyPassword } from "better-auth/crypto";
import type { PrismaClient } from "../src/gerado/prisma/client";
import {
  executarComandoAdministrativo,
  interpretarArgumentos,
  mensagemErroAdministrativo,
} from "./administracao";

const idEmpresa = "6e531a29-ef50-46a2-88bb-55904df9c763";
const idUsuario = "c330fc37-c2e1-4052-8510-8cad0c0c40cb";

function simularBanco(transacao: object): PrismaClient {
  return {
    $transaction: async (operacao: (valor: object) => Promise<unknown>) =>
      operacao(transacao),
  } as unknown as PrismaClient;
}

test("parser rejeita senha em argv e identifica opções inadequadas", () => {
  assert.throws(() =>
    interpretarArgumentos(["criar-usuario", "--senha", "nunca-expor"]),
  );
  assert.throws(() =>
    interpretarArgumentos([
      "suspender-empresa",
      "--empresa",
      idEmpresa,
      "--nome",
      "indevido",
    ]),
  );
  assert.throws(() =>
    interpretarArgumentos(["ativar-empresa", "--empresa", "id-invalido"]),
  );
  assert.deepEqual(
    interpretarArgumentos([
      "criar-usuario",
      "--empresa",
      idEmpresa,
      "--nome",
      "Ana",
      "--email",
      "ANA@EXAMPLE.COM",
    ]),
    {
      comando: "criar-usuario",
      empresa: idEmpresa,
      nome: "Ana",
      email: "ana@example.com",
    },
  );
});

test("criação de empresa inclui assinatura na mesma escrita transacional", async () => {
  let entrada: unknown;
  const banco = simularBanco({
    empresa: {
      create: async (dados: unknown) => {
        entrada = dados;
        return { idEmpresa };
      },
    },
  });
  const resultado = await executarComandoAdministrativo(banco, {
    comando: "criar-empresa",
    nome: "Empresa local",
  });
  assert.equal(resultado.id, idEmpresa);
  assert.deepEqual(entrada, {
    data: {
      nome: "Empresa local",
      telefone: undefined,
      assinatura: { create: {} },
    },
    select: { idEmpresa: true },
  });
});

test("provisionamento trava empresa antes da contagem e armazena hash Better Auth", async () => {
  const ordem: string[] = [];
  let dadosUsuario:
    | {
        id: string;
        idEmpresa: string;
        contas: {
          create: { accountId: string; providerId: string; password: string };
        };
      }
    | undefined;
  const banco = simularBanco({
    empresa: {
      update: async () => {
        ordem.push("travar");
      },
    },
    usuario: {
      count: async () => {
        ordem.push("contar");
        return 1;
      },
      create: async ({ data }: { data: NonNullable<typeof dadosUsuario> }) => {
        ordem.push("criar");
        dadosUsuario = data;
      },
    },
  });
  const senha = "Senha-local-segura-123";
  const resultado = await executarComandoAdministrativo(
    banco,
    {
      comando: "criar-usuario",
      empresa: idEmpresa,
      nome: "Ana",
      email: "ana@example.com",
    },
    senha,
  );
  assert.deepEqual(ordem, ["travar", "contar", "criar"]);
  assert.ok(dadosUsuario);
  assert.equal(dadosUsuario.idEmpresa, idEmpresa);
  assert.equal(dadosUsuario.contas.create.providerId, "credential");
  assert.equal(dadosUsuario.contas.create.accountId, dadosUsuario.id);
  assert.notEqual(dadosUsuario.contas.create.password, senha);
  assert.equal(
    await verifyPassword({
      hash: dadosUsuario.contas.create.password,
      password: senha,
    }),
    true,
  );
  assert.equal(JSON.stringify(resultado).includes(senha), false);
});

test("terceiro usuário ativo é recusado antes da criação", async () => {
  let criou = false;
  const banco = simularBanco({
    empresa: { update: async () => undefined },
    usuario: {
      count: async () => 2,
      create: async () => {
        criou = true;
      },
    },
  });
  await assert.rejects(
    executarComandoAdministrativo(
      banco,
      {
        comando: "criar-usuario",
        empresa: idEmpresa,
        nome: "Ana",
        email: "ana@example.com",
      },
      "Senha-local-segura-123",
    ),
    /dois usuários ativos/,
  );
  assert.equal(criou, false);
});

test("ativação idempotente não exige vaga adicional", async () => {
  let contou = false;
  const banco = simularBanco({
    empresa: { update: async () => undefined },
    usuario: {
      findUnique: async () => ({ idEmpresa, ativo: true }),
      count: async () => {
        contou = true;
        return 2;
      },
      update: async () => undefined,
    },
  });
  await executarComandoAdministrativo(banco, {
    comando: "ativar-usuario",
    usuario: idUsuario,
  });
  assert.equal(contou, false);
});

test("reativação respeita limite e não atualiza quando lotada", async () => {
  let atualizou = false;
  const banco = simularBanco({
    empresa: { update: async () => undefined },
    usuario: {
      findUnique: async () => ({ idEmpresa, ativo: false }),
      count: async () => 2,
      update: async () => {
        atualizou = true;
      },
    },
  });
  await assert.rejects(
    executarComandoAdministrativo(banco, {
      comando: "ativar-usuario",
      usuario: idUsuario,
    }),
    /dois usuários ativos/,
  );
  assert.equal(atualizou, false);
});

test("suspensão atualiza empresa e assinatura e revoga sessões", async () => {
  const escritas: unknown[] = [];
  const banco = simularBanco({
    empresa: { update: async (valor: unknown) => escritas.push(valor) },
    assinatura: { update: async (valor: unknown) => escritas.push(valor) },
    sessao: { deleteMany: async (valor: unknown) => escritas.push(valor) },
  });
  await executarComandoAdministrativo(banco, {
    comando: "suspender-empresa",
    empresa: idEmpresa,
  });
  assert.deepEqual(escritas, [
    { where: { idEmpresa }, data: { ativa: false } },
    { where: { idEmpresa }, data: { situacao: "SUSPENSA" } },
    { where: { usuario: { idEmpresa } } },
  ]);
});

test("senha inválida é recusada sem realizar consultas", async () => {
  await assert.rejects(
    executarComandoAdministrativo(
      {} as PrismaClient,
      {
        comando: "criar-usuario",
        empresa: idEmpresa,
        nome: "Ana",
        email: "ana@example.com",
      },
      "curta",
    ),
    /12 e 128/,
  );
});

test("erros externos são sanitizados e unicidade tem mensagem própria", () => {
  assert.equal(
    mensagemErroAdministrativo({
      code: "P2002",
      message: "postgres://usuario:segredo@servidor",
    }),
    "Já existe um registro com esses dados únicos.",
  );
  assert.equal(
    mensagemErroAdministrativo(
      new Error("postgres://usuario:segredo@servidor"),
    ).includes("segredo"),
    false,
  );
});
