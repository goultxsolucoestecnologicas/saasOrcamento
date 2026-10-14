-- Metadados operacionais também não devem ser expostos pela Data API.
-- O proprietário/conexão de migrations mantém acesso; não há exclusão de dados.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
