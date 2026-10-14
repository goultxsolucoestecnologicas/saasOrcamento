import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations usam conexão direta ou pooler em modo sessão.
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
