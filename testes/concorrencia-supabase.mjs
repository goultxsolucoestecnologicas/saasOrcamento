import { carregarFixturesSupabase } from "./fixtures-supabase.mjs";
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { esquema } = carregarFixturesSupabase();
assert.match(esquema, /^testes_codex_[a-f0-9]{10}$/);
const configuracao = {
  connectionString: process.env.DIRECT_URL,
  options: `-c search_path=${esquema}`,
};
const principal = new pg.Client(configuracao);
await principal.connect();
try {
  for (const isolamento of [
    "READ COMMITTED",
    "REPEATABLE READ",
    "SERIALIZABLE",
  ]) {
    const empresa = randomUUID();
    const inserirUsuario = (cliente) =>
      cliente.query(
        "INSERT INTO usuario (id_usuario,nome,email,id_empresa,data_atualizacao) VALUES ($1,$2,$3,$4,now())",
        [
          randomUUID(),
          "Fixture concorrente",
          `${randomUUID()}@teste.invalid`,
          empresa,
        ],
      );
    await principal.query(
      "INSERT INTO empresa (id_empresa,nome,data_atualizacao) VALUES ($1,$2,now())",
      [empresa, "Fixture isolada"],
    );
    await principal.query(
      "INSERT INTO assinatura (id_assinatura,id_empresa,data_atualizacao) VALUES ($1,$2,now())",
      [randomUUID(), empresa],
    );
    await inserirUsuario(principal);
    const primeiro = new pg.Client(configuracao);
    const segundo = new pg.Client(configuracao);
    await Promise.all([primeiro.connect(), segundo.connect()]);
    try {
      await Promise.all([
        primeiro.query(`BEGIN ISOLATION LEVEL ${isolamento}`),
        segundo.query(`BEGIN ISOLATION LEVEL ${isolamento}`),
      ]);
      await Promise.all([
        primeiro.query("SELECT count(*) FROM usuario"),
        segundo.query("SELECT count(*) FROM usuario"),
      ]);
      await inserirUsuario(primeiro);
      const tentativa = inserirUsuario(segundo).then(
        () => ({ codigo: null }),
        (erro) => ({ codigo: erro.code }),
      );
      await primeiro.query("COMMIT");
      const resultado = await tentativa;
      assert.equal(
        resultado.codigo,
        isolamento === "READ COMMITTED" ? "23514" : "40001",
      );
      await segundo.query("ROLLBACK");
      const contagem = await principal.query(
        "SELECT count(*)::int AS quantidade FROM usuario WHERE id_empresa=$1 AND ativo",
        [empresa],
      );
      assert.equal(contagem.rows[0].quantidade, 2);
      console.log(
        `Limite concorrente de dois usuários validado: ${isolamento}.`,
      );
    } finally {
      await Promise.all([
        primeiro.query("ROLLBACK"),
        segundo.query("ROLLBACK"),
      ]);
      await Promise.all([primeiro.end(), segundo.end()]);
    }
  }
  console.log(
    "Somente fixtures no schema isolado foram utilizadas; sem reset ou exclusão de dados.",
  );
} finally {
  await principal.end();
}
