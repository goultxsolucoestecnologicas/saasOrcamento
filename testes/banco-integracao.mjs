import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL });
await cliente.connect();
try {
  await cliente.query("BEGIN");
  const empresaA = randomUUID();
  const empresaB = randomUUID();
  for (const id of [empresaA, empresaB]) {
    await cliente.query('INSERT INTO empresa (id_empresa,nome,data_atualizacao) VALUES ($1,$2,now())', [id, "Empresa temporária de teste"]);
    await cliente.query('INSERT INTO assinatura (id_assinatura,id_empresa,data_atualizacao) VALUES ($1,$2,now())', [randomUUID(), id]);
  }
  for (let indice = 0; indice < 2; indice++) {
    await cliente.query('INSERT INTO usuario (id_usuario,nome,email,id_empresa,data_atualizacao) VALUES ($1,$2,$3,$4,now())', [randomUUID(), "Usuário teste", `${randomUUID()}@teste.invalid`, empresaA]);
  }
  await cliente.query("SAVEPOINT limite");
  await assert.rejects(cliente.query('INSERT INTO usuario (id_usuario,nome,email,id_empresa,data_atualizacao) VALUES ($1,$2,$3,$4,now())', [randomUUID(), "Terceiro", `${randomUUID()}@teste.invalid`, empresaA]), { code: "23514" });
  await cliente.query("ROLLBACK TO SAVEPOINT limite");
  const idOrcamento = randomUUID();
  await cliente.query('INSERT INTO orcamento (id_orcamento,id_empresa,numero,cliente_nome,data_atualizacao) VALUES ($1,$2,1,$3,now())', [idOrcamento, empresaA, "Cliente teste"]);
  await cliente.query("SAVEPOINT isolamento");
  await assert.rejects(cliente.query('INSERT INTO orcamento_item (id_item,id_empresa,id_orcamento,descricao,quantidade_milesimos,valor_unitario_centavos,subtotal_centavos,ordem) VALUES ($1,$2,$3,$4,1000,100,100,0)', [randomUUID(), empresaB, idOrcamento, "Item indevido"]), { code: "23503" });
  await cliente.query("ROLLBACK TO SAVEPOINT isolamento");
  await cliente.query("SAVEPOINT sequencia");
  await assert.rejects(cliente.query('INSERT INTO orcamento (id_orcamento,id_empresa,numero,cliente_nome,data_atualizacao) VALUES ($1,$2,1,$3,now())', [randomUUID(), empresaA, "Número duplicado"]), { code: "23505" });
  await cliente.query("ROLLBACK TO SAVEPOINT sequencia");
  console.log("PostgreSQL: limite de usuários, FK multiempresa e número único validados; fixtures revertidas.");
} finally {
  await cliente.query("ROLLBACK");
  await cliente.end();
}
