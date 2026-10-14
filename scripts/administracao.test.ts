import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "../src/gerado/prisma/client";
import {
  executarComandoAdministrativo,
  interpretarArgumentos,
  mensagemErroAdministrativo,
} from "./administracao";
import type { IdentidadeSupabase } from "./admin-supabase";

const idEmpresa = "6e531a29-ef50-46a2-88bb-55904df9c763";
const idUsuario = "c330fc37-c2e1-4052-8510-8cad0c0c40cb";
const idAutenticacao = "c43b4b6c-89a1-4584-9fde-21ebfe03184f";
const identidade: IdentidadeSupabase = {
  id: idAutenticacao,
  email: "ana@example.com",
  emailVerificado: true,
};
const criarUsuario = {
  comando: "criar-usuario" as const,
  empresa: idEmpresa,
  nome: "Ana",
  email: "ana@example.com",
  "autenticacao-supabase": idAutenticacao,
};
const confirmarIdentidade = async () => identidade;
function simularBanco(transacao: object): PrismaClient {
  return {
    $transaction: async (operacao: (valor: object) => Promise<unknown>) =>
      operacao(transacao),
  } as unknown as PrismaClient;
}

test("parser exige UUID Supabase e não aceita senha em argumentos", () => {
  assert.throws(() =>
    interpretarArgumentos(["criar-usuario", "--senha", "nunca-expor"]),
  );
  assert.throws(() =>
    interpretarArgumentos([
      "criar-usuario",
      "--empresa",
      idEmpresa,
      "--nome",
      "Ana",
      "--email",
      "ana@example.com",
    ]),
  );
  assert.throws(() =>
    interpretarArgumentos([
      "vincular-usuario",
      "--usuario",
      idUsuario,
      "--autenticacao-supabase",
      "invalido",
    ]),
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
      "--autenticacao-supabase",
      idAutenticacao,
    ]),
    criarUsuario,
  );
  assert.deepEqual(
    interpretarArgumentos([
      "vincular-usuario",
      "--usuario",
      idUsuario,
      "--autenticacao-supabase",
      idAutenticacao,
    ]),
    {
      comando: "vincular-usuario",
      usuario: idUsuario,
      "autenticacao-supabase": idAutenticacao,
    },
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
});

test("empresa e assinatura são criadas na mesma transação", async () => {
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

test("confirma identidade antes de travar e contar; não cria contas ou senhas legadas", async () => {
  const ordem: string[] = [];
  let dadosUsuario: Record<string, unknown> | undefined;
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
      create: async ({ data }: { data: Record<string, unknown> }) => {
        ordem.push("criar");
        dadosUsuario = data;
      },
    },
  });
  const resultado = await executarComandoAdministrativo(
    banco,
    criarUsuario,
    async (id) => {
      assert.equal(id, idAutenticacao);
      ordem.push("verificar");
      return identidade;
    },
  );
  assert.deepEqual(ordem, ["verificar", "travar", "contar", "criar"]);
  assert.ok(dadosUsuario);
  assert.equal(dadosUsuario.idEmpresa, idEmpresa);
  assert.equal(dadosUsuario.idAutenticacaoSupabase, idAutenticacao);
  assert.equal(dadosUsuario.emailVerified, true);
  assert.notEqual(dadosUsuario.id, idAutenticacao);
  assert.equal("contas" in dadosUsuario, false);
  assert.equal("password" in dadosUsuario, false);
  assert.equal(resultado.id, dadosUsuario.id);
});

test("email ou ID remoto divergente não permite escrita local", async () => {
  await assert.rejects(
    executarComandoAdministrativo(
      {} as PrismaClient,
      criarUsuario,
      async () => ({ ...identidade, email: "outra@example.com" }),
    ),
    /não corresponde/,
  );
  await assert.rejects(
    executarComandoAdministrativo(
      {} as PrismaClient,
      criarUsuario,
      async () => ({ ...identidade, id: idUsuario }),
    ),
    /não corresponde/,
  );
});

test("terceiro usuário ativo continua recusado", async () => {
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
    executarComandoAdministrativo(banco, criarUsuario, confirmarIdentidade),
    /dois usuários ativos/,
  );
  assert.equal(criou, false);
});

test("vincula identidade sem mudar ID local, empresa ou email legado", async () => {
  let escrita: unknown;
  const banco = simularBanco({
    empresa: { update: async () => undefined },
    usuario: {
      findUnique: async () => ({
        idEmpresa,
        email: "ANA@example.com",
        idAutenticacaoSupabase: null,
      }),
      update: async (dados: unknown) => {
        escrita = dados;
      },
    },
  });
  const resultado = await executarComandoAdministrativo(
    banco,
    {
      comando: "vincular-usuario",
      usuario: idUsuario,
      "autenticacao-supabase": idAutenticacao,
    },
    confirmarIdentidade,
  );
  assert.equal(resultado.id, idUsuario);
  assert.deepEqual(escrita, {
    where: { id: idUsuario, idEmpresa },
    data: { idAutenticacaoSupabase: idAutenticacao, emailVerified: true },
  });
});

test("não vincula identidade com email diferente nem substitui vínculo anterior", async () => {
  const comando = {
    comando: "vincular-usuario" as const,
    usuario: idUsuario,
    "autenticacao-supabase": idAutenticacao,
  };
  let atualizou = false;
  for (const dados of [
    { email: "outra@example.com", idAutenticacaoSupabase: null },
    { email: identidade.email, idAutenticacaoSupabase: idUsuario },
  ]) {
    const banco = simularBanco({
      empresa: { update: async () => undefined },
      usuario: {
        findUnique: async () => ({ idEmpresa, ...dados }),
        update: async () => {
          atualizou = true;
        },
      },
    });
    await assert.rejects(
      executarComandoAdministrativo(banco, comando, confirmarIdentidade),
    );
  }
  assert.equal(atualizou, false);
});

test("ativação idempotente não exige vaga adicional e reativação respeita limite", async () => {
  let contou = false;
  let ativo = true;
  const banco = simularBanco({
    empresa: { update: async () => undefined },
    usuario: {
      findUnique: async () => ({ idEmpresa, ativo }),
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
  ativo = false;
  await assert.rejects(
    executarComandoAdministrativo(banco, {
      comando: "ativar-usuario",
      usuario: idUsuario,
    }),
    /dois usuários ativos/,
  );
});

test("suspensão mantém empresa e assinatura sincronizadas e revoga sessões legadas", async () => {
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

test("erros externos são sanitizados e unicidade permanece tratada", () => {
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
