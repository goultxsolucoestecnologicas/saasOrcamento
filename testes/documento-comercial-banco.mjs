import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { carregarFixturesSupabase } from "./fixtures-supabase.mjs";

const { esquema, fixtures } = carregarFixturesSupabase();
const banco = new pg.Client({ connectionString: process.env.DIRECT_URL });
try {
  await banco.connect();
  await banco.query("BEGIN");
  await banco.query(`SET LOCAL search_path TO "${esquema}"`);
  const idEmpresa = fixtures[0].idEmpresa;
  const empresa = await banco.query(
    "UPDATE empresa SET descricao_atividade=$1,nome_responsavel=$2,cidade=$3,estado=$4,instagram=$5,facebook=$6,slogan=$7 WHERE id_empresa=$8 RETURNING descricao_atividade,estado",
    [
      "Serviços fictícios",
      "Responsável fictício",
      "Cidade de teste",
      "RS",
      "perfil_ficticio",
      "Página fictícia",
      "Slogan fictício",
      idEmpresa,
    ],
  );
  assert.equal(empresa.rowCount, 1);
  assert.deepEqual(empresa.rows[0], {
    descricao_atividade: "Serviços fictícios",
    estado: "RS",
  });
  const numero = await banco.query(
    "SELECT COALESCE(MAX(numero),0)+1 AS proximo FROM orcamento WHERE id_empresa=$1",
    [idEmpresa],
  );
  const id = randomUUID();
  const registro = await banco.query(
    "INSERT INTO orcamento(id_orcamento,id_empresa,numero,cliente_nome,cliente_numero_endereco,cliente_inscricao_estadual,tipo_documento,data_emissao,data_atualizacao) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()) RETURNING tipo_documento,cliente_numero_endereco,cliente_inscricao_estadual,to_char(data_emissao,'YYYY-MM-DD') AS data",
    [
      id,
      idEmpresa,
      numero.rows[0].proximo,
      "Cliente fictício transacional",
      "240",
      "ISENTO",
      "PEDIDO",
      "2024-02-29",
    ],
  );
  assert.deepEqual(registro.rows[0], {
    tipo_documento: "PEDIDO",
    cliente_numero_endereco: "240",
    cliente_inscricao_estadual: "ISENTO",
    data: "2024-02-29",
  });
  await banco.query(
    "UPDATE orcamento SET situacao='APROVADO' WHERE id_orcamento=$1",
    [id],
  );
  assert.equal(
    (
      await banco.query(
        "SELECT tipo_documento FROM orcamento WHERE id_orcamento=$1",
        [id],
      )
    ).rows[0].tipo_documento,
    "PEDIDO",
  );
  const rls = await banco.query(
    "SELECT relname,relrowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid=relnamespace WHERE nspname=$1 AND relname IN ('empresa','orcamento','orcamento_item')",
    [esquema],
  );
  assert.equal(rls.rowCount, 3);
  assert.ok(rls.rows.every((r) => r.relrowsecurity));
  console.log(
    "PostgreSQL: identidade comercial, data histórica, tipo independente e RLS validados; alterações revertidas em transação.",
  );
} catch {
  console.error("Verificação PostgreSQL falhou; detalhes de conexão omitidos.");
  process.exitCode = 1;
} finally {
  await banco.query("ROLLBACK").catch(() => {});
  await banco.end().catch(() => {});
}
