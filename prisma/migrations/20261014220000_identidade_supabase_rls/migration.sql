BEGIN;

-- Vínculo explícito e opcional: IDs, contas e sessões legadas permanecem intactos.
ALTER TABLE "usuario" ADD COLUMN "id_autenticacao_supabase" UUID;
CREATE UNIQUE INDEX "usuario_id_autenticacao_supabase_key"
  ON "usuario"("id_autenticacao_supabase");

-- Nenhuma policy é criada: anon/authenticated não acessam estas tabelas pela
-- Data API. O backend Prisma usa a conexão privilegiada e autorização própria.
-- Não modifica o schema auth nem as identidades gerenciadas pelo Supabase.
ALTER TABLE "empresa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assinatura" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orcamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orcamento_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verificacao" ENABLE ROW LEVEL SECURITY;

COMMIT;
