import "dotenv/config";
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
export function alvoSupabase() {
  const url = new URL(process.env.DATABASE_URL);
  return createHash("sha256")
    .update(
      [
        url.hostname,
        url.port,
        url.pathname,
        url.username,
        process.env.NEXT_PUBLIC_SUPABASE_URL,
      ].join("|"),
    )
    .digest("hex");
}
export function carregarFixturesSupabase() {
  const registro = JSON.parse(
    fs.readFileSync(".tmp/supabase-fixtures.json", "utf8"),
  );
  assert.match(registro.esquema, /^testes_codex_[a-f0-9]{10}$/);
  assert.equal(
    registro.alvo,
    alvoSupabase(),
    "Ambiente mudou; fixtures não podem ser usadas neste alvo.",
  );
  assert.equal(registro.fixtures.length, 2);
  return registro;
}
