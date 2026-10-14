import "dotenv/config";
import { alvoSupabase } from "./fixtures-supabase.mjs";
import fs from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/gerado/prisma/client";
import { executarComandoAdministrativo } from "../scripts/administracao";

if (!process.argv.includes("--desenvolvimento-confirmado"))
  throw new Error(
    "Confirme explicitamente desenvolvimento antes de criar fixtures remotas.",
  );
if (fs.existsSync(".tmp/supabase-fixtures.json"))
  throw new Error(
    "Fixtures existentes preservadas. Não crie contas adicionais automaticamente.",
  );
const endereco = process.env.NEXT_PUBLIC_SUPABASE_URL;
const segredo =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (
  !endereco ||
  !segredo ||
  !process.env.DATABASE_URL ||
  !process.env.DIRECT_URL
)
  throw new Error("Configuração Supabase incompleta.");
const admin = createClient(endereco, segredo, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const verificar = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
if (verificar.error)
  throw new Error("Chave administrativa indisponível ou inválida.");
const esquema = "testes_codex_" + randomBytes(5).toString("hex");
const cliente = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  connectionTimeoutMillis: 10000,
});
await cliente.connect();
await cliente.query(`CREATE SCHEMA "${esquema}"`);
await cliente.end();
const direta = new URL(process.env.DIRECT_URL);
direta.searchParams.set("schema", esquema);
const cli = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    env: { ...process.env, DIRECT_URL: direta.toString() },
    encoding: "utf8",
    timeout: 90000,
  },
);
if (cli.status !== 0)
  throw new Error("Falha na preparação do schema de teste.");
const runtime = new URL(process.env.DATABASE_URL);
runtime.searchParams.set("schema", esquema);
const banco = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: runtime.toString() },
    { schema: esquema },
  ),
});
const fixtures: {
  email: string;
  senha: string;
  idEmpresa: string;
  idUsuario: string;
  idAutenticacaoSupabase: string;
}[] = [];
try {
  for (let indice = 0; indice < 2; indice++) {
    const email = `codex-${randomUUID()}@teste.invalid`,
      senha = randomBytes(20).toString("hex");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { fixture_desenvolvimento: true },
    });
    if (error || !data.user)
      throw new Error(
        "Não foi possível criar identidade fictícia de desenvolvimento.",
      );
    const empresa = await executarComandoAdministrativo(banco, {
      comando: "criar-empresa",
      nome: indice === 0 ? "Empresa de teste visual" : "Empresa de teste B",
    });
    const usuario = await executarComandoAdministrativo(banco, {
      comando: "criar-usuario",
      empresa: empresa.id!,
      nome: "Usuário de teste",
      email,
      "autenticacao-supabase": data.user.id,
    });
    fixtures.push({
      email,
      senha,
      idEmpresa: empresa.id!,
      idUsuario: usuario.id!,
      idAutenticacaoSupabase: data.user.id,
    });
  }
  fs.writeFileSync(
    ".tmp/supabase-fixtures.json",
    JSON.stringify({ esquema, fixtures, alvo: alvoSupabase() }),
    { mode: 0o600 },
  );
  fs.writeFileSync(".tmp/esquema-supabase-teste.txt", esquema);
  fs.writeFileSync(".tmp/fixture-login.json", JSON.stringify(fixtures[0]), {
    mode: 0o600,
  });
  console.log(
    "Duas identidades fictícias provisionadas; schema separado preparado. Credenciais somente em .tmp ignorado.",
  );
} finally {
  await banco.$disconnect();
}
