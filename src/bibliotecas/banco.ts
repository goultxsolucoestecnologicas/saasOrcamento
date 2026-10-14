import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/gerado/prisma/client";
import { obterAmbiente } from "@/bibliotecas/ambiente";

const contextoGlobal = globalThis as typeof globalThis & {
  banco?: PrismaClient;
};

export function obterBanco(): PrismaClient {
  if (!contextoGlobal.banco) {
    const urlBanco = obterAmbiente().DATABASE_URL;
    const esquema = new URL(urlBanco).searchParams.get("schema") ?? "public";
    const adaptador = new PrismaPg(
      { connectionString: urlBanco },
      { schema: esquema },
    );
    contextoGlobal.banco = new PrismaClient({ adapter: adaptador });
  }

  return contextoGlobal.banco;
}
