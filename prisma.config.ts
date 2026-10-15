import "dotenv/config";
import { defineConfig } from "prisma/config";
import { prepararUrlPrisma } from "./src/bibliotecas/conexao-postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations usam conexão direta ou pooler em modo sessão.
  datasource: {
    url: prepararUrlPrisma(
      process.env.DIRECT_URL ?? "",
      process.env.POSTGRES_CA_CERTIFICADO,
    ),
  },
});
