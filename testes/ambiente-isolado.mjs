import "dotenv/config";
import assert from "node:assert/strict";
export function exigirBancoLocalIsolado() {
  const valor = process.env.TEST_DATABASE_URL;
  assert.ok(
    valor,
    "Configure TEST_DATABASE_URL local dedicado; este teste não utiliza DATABASE_URL remoto.",
  );
  const url = new URL(valor);
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
    "Este teste legado aceita somente PostgreSQL local isolado.",
  );
  assert.match(
    url.searchParams.get("schema") ?? "",
    /^testes_codex_[a-f0-9]{10}$/,
    "TEST_DATABASE_URL exige schema exclusivo de testes.",
  );
  return valor;
}
