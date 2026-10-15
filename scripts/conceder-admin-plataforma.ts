import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/gerado/prisma/client";
import { prepararConexaoPostgres } from "../src/bibliotecas/conexao-postgres";
import { verificarIdentidadeSupabase } from "./admin-supabase";
import { z } from "zod";

// Concessão local explícita, sem endpoint HTTP e sem senha padrão.
const esquema = z
  .object({
    idSupabase: z.uuid(),
    nome: z.string().trim().min(1).max(160),
    confirmar: z.literal("CONCEDER_ADMIN_PLATAFORMA"),
  })
  .strict();
let banco: PrismaClient | undefined;
try {
  const args = process.argv.slice(2);
  if (
    args.length !== 6 ||
    args[0] !== "--id-supabase" ||
    args[2] !== "--nome" ||
    args[4] !== "--confirmar"
  )
    throw new Error("uso");
  const dados = esquema.parse({
    idSupabase: args[1],
    nome: args[3],
    confirmar: args[5],
  });
  if (!process.env.DATABASE_URL) throw new Error("configuracao");
  const identidade = await verificarIdentidadeSupabase(dados.idSupabase);
  if (!identidade.emailVerificado) throw new Error("identidade_nao_confirmada");
  const conexao = prepararConexaoPostgres(
    process.env.DATABASE_URL,
    process.env.POSTGRES_CA_CERTIFICADO,
  );
  banco = new PrismaClient({
    adapter: new PrismaPg(conexao.configuracao, { schema: conexao.esquema }),
  });
  await banco.$transaction(async (tx) => {
    const administrador = await tx.adminPlataforma.upsert({
      where: { idSupabase: dados.idSupabase },
      create: { idSupabase: dados.idSupabase, nome: dados.nome },
      update: { ativo: true, nome: dados.nome },
    });
    await tx.auditoriaAdministrativa.create({
      data: {
        idAdmin: administrador.idAdmin,
        acao: "ADMINISTRADOR_CONCEDIDO",
        entidade: "admin_plataforma",
        idEntidade: administrador.idAdmin,
        informacoes: { origem: "CLI_LOCAL_AUTORIZADO" },
      },
    });
  });
  console.log(
    "Acesso administrativo concedido à identidade Supabase verificada.",
  );
} catch {
  console.error(
    "Concessão não concluída. Verifique a identidade Supabase existente, a configuração do servidor e a migration. Uso: npx tsx scripts/conceder-admin-plataforma.ts --id-supabase UUID --nome NOME --confirmar CONCEDER_ADMIN_PLATAFORMA",
  );
  process.exitCode = 1;
} finally {
  await banco?.$disconnect().catch(() => {
    process.exitCode = 1;
  });
}
