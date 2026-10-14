import { carregarFixturesSupabase } from "./fixtures-supabase.mjs";
const { esquema } = carregarFixturesSupabase();
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const cliente = new pg.Client({ connectionString: process.env.DIRECT_URL });
await cliente.connect();
try {
  await cliente.query("BEGIN");
  await cliente.query(`SET LOCAL search_path TO "${esquema}"`);
  const empresaA = randomUUID();
  const empresaB = randomUUID();
  for (const id of [empresaA, empresaB]) {
    await cliente.query(
      "INSERT INTO empresa (id_empresa,nome,data_atualizacao) VALUES ($1,$2,now())",
      [id, "Empresa temporária de teste"],
    );
    await cliente.query(
      "INSERT INTO assinatura (id_assinatura,id_empresa,data_atualizacao) VALUES ($1,$2,now())",
      [randomUUID(), id],
    );
  }
  for (let indice = 0; indice < 2; indice++) {
    await cliente.query(
      "INSERT INTO usuario (id_usuario,nome,email,id_empresa,data_atualizacao) VALUES ($1,$2,$3,$4,now())",
      [
        randomUUID(),
        "Usuário teste",
        `${randomUUID()}@teste.invalid`,
        empresaA,
      ],
    );
  }
  await cliente.query("SAVEPOINT limite");
  await assert.rejects(
    cliente.query(
      "INSERT INTO usuario (id_usuario,nome,email,id_empresa,data_atualizacao) VALUES ($1,$2,$3,$4,now())",
      [randomUUID(), "Terceiro", `${randomUUID()}@teste.invalid`, empresaA],
    ),
    { code: "23514" },
  );
  await cliente.query("ROLLBACK TO SAVEPOINT limite");
  const idOrcamento = randomUUID();
  await cliente.query(
    "INSERT INTO orcamento (id_orcamento,id_empresa,numero,cliente_nome,data_atualizacao) VALUES ($1,$2,1,$3,now())",
    [idOrcamento, empresaA, "Cliente teste"],
  );
  await cliente.query("SAVEPOINT isolamento");
  await assert.rejects(
    cliente.query(
      "INSERT INTO orcamento_item (id_item,id_empresa,id_orcamento,descricao,quantidade_milesimos,valor_unitario_centavos,subtotal_centavos,ordem) VALUES ($1,$2,$3,$4,1000,100,100,0)",
      [randomUUID(), empresaB, idOrcamento, "Item indevido"],
    ),
    { code: "23503" },
  );
  await cliente.query("ROLLBACK TO SAVEPOINT isolamento");
  await cliente.query("SAVEPOINT sequencia");
  await assert.rejects(
    cliente.query(
      "INSERT INTO orcamento (id_orcamento,id_empresa,numero,cliente_nome,data_atualizacao) VALUES ($1,$2,1,$3,now())",
      [randomUUID(), empresaA, "Número duplicado"],
    ),
    { code: "23505" },
  );
  await cliente.query("ROLLBACK TO SAVEPOINT sequencia");
  const rls = await cliente.query(
    "SELECT relname,relrowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid=relnamespace WHERE nspname=$1 AND relkind='r' AND relname<>'_prisma_migrations'",
    [esquema],
  );
  assert.equal(rls.rows.length, 8);
  assert.ok(rls.rows.every((t) => t.relrowsecurity));
  for (const role of ["anon", "authenticated"]) {
    await cliente.query("SAVEPOINT papel");
    await cliente.query(`SET LOCAL ROLE ${role}`);
    const leitura = await cliente
      .query(`SELECT * FROM "${esquema}".usuario`)
      .then(
        (r) => r.rows,
        (e) => {
          if (e.code !== "42501") throw e;
          return [];
        },
      );
    assert.equal(leitura.length, 0);
    await cliente.query("ROLLBACK TO SAVEPOINT papel");
  }
  console.log(
    "RLS validada: anon/authenticated não acessam usuários, banco continua autorizado pelo backend.",
  );
  console.log(
    "PostgreSQL: limite de usuários, FK multiempresa e número único validados; fixtures revertidas.",
  );
} finally {
  await cliente.query("ROLLBACK");
  await cliente.end();
}
