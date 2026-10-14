import fs from "node:fs";
import path from "node:path";
import toml from "@iarna/toml";

const arquivo = path.resolve(".codex/config.toml");
const configuracao = toml.parse(fs.readFileSync(arquivo, "utf8"));
const nomes = ["frontend", "backend", "pdf", "qa"];
for (const nome of nomes) {
  const agente = configuracao.agents[nome];
  if (!agente.description || !agente.config_file)
    throw new Error(`Agente inválido: ${nome}`);
  const instrucoes = toml.parse(
    fs.readFileSync(
      path.resolve(path.dirname(arquivo), agente.config_file),
      "utf8",
    ),
  );
  if (!instrucoes.developer_instructions)
    throw new Error(`Instruções ausentes: ${nome}`);
}
console.log("TOML e caminhos dos quatro agentes válidos.");
