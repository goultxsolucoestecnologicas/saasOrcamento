import "dotenv/config";
import { spawnSync } from "node:child_process";
if (!process.argv.includes("--desenvolvimento-confirmado")) {
  console.error(
    "Migration remota bloqueada: confirme que o alvo é desenvolvimento com --desenvolvimento-confirmado. Não use esta opção em produção.",
  );
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  console.error("Configure DIRECT_URL para migrations.");
  process.exit(1);
}
const resultado = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "pipe", encoding: "utf8" },
);
// Logs do driver podem incluir detalhes de conexão: apresentar somente resultado.
console.log(
  resultado.status === 0
    ? "Migrations aplicadas com sucesso."
    : "Migration falhou. Verifique conexão/permissões e histórico; nenhum reset foi solicitado.",
);
if (resultado.status !== 0) process.exit(1);
const gerar = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "generate"],
  { stdio: "inherit" },
);
process.exit(gerar.status ?? 1);
