import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/gerado/prisma/client";
import { obterAmbiente } from "@/bibliotecas/ambiente";
import { prepararConexaoPostgres } from "@/bibliotecas/conexao-postgres";

const contextoGlobal = globalThis as typeof globalThis & {
  banco?: PrismaClient;
};

export function obterBanco(): PrismaClient {
  if (!contextoGlobal.banco) {
    const urlBanco = obterAmbiente().DATABASE_URL;
    const { configuracao, esquema } = prepararConexaoPostgres(
      urlBanco,
      process.env.POSTGRES_CA_CERTIFICADO,
    );
    const adaptador = new PrismaPg(configuracao, { schema: esquema });
    contextoGlobal.banco = new PrismaClient({ adapter: adaptador });
  }

  return contextoGlobal.banco;
}
