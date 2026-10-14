import "dotenv/config";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { carregarFixturesSupabase } from "./fixtures-supabase.mjs";

const { esquema } = carregarFixturesSupabase();
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set("schema", esquema);
const ambiente = {
  ...process.env,
  DATABASE_URL: url.toString(),
  APP_URL: "http://localhost:3001",
  ARMAZENAMENTO_LOCAL_DIRETORIO: ".tmp/armazenamento-testes",
};
delete ambiente.SUPABASE_SECRET_KEY;
delete ambiente.SUPABASE_SERVICE_ROLE_KEY;
const fundo = process.argv.includes("--background");
const comando = process.argv.includes("--producao") ? "start" : "dev";
const log = fundo ? fs.openSync(".tmp/app-supabase-teste.log", "a") : undefined;
const processo = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    comando,
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  {
    cwd: process.cwd(),
    env: ambiente,
    detached: fundo,
    windowsHide: true,
    stdio: fundo ? ["ignore", log, log] : "inherit",
  },
);
fs.writeFileSync(".tmp/app-supabase-teste-pid.txt", String(processo.pid));
if (fundo) {
  processo.unref();
  console.log(
    "Servidor de testes iniciado na porta3001, sem chave administrativa no processo.",
  );
} else {
  processo.on("exit", (codigo) => {
    process.exitCode = codigo ?? 1;
  });
  process.on("SIGINT", () => processo.kill());
}
