-- Somente adições; datas históricas nulas usam data_criacao no PDF.
CREATE TYPE "tipo_documento" AS ENUM ('ORCAMENTO', 'PEDIDO');
ALTER TABLE "empresa"
 ADD COLUMN "descricao_atividade" TEXT,
 ADD COLUMN "nome_responsavel" TEXT,
 ADD COLUMN "cidade" TEXT,
 ADD COLUMN "estado" TEXT,
 ADD COLUMN "instagram" TEXT,
 ADD COLUMN "facebook" TEXT,
 ADD COLUMN "slogan" TEXT;
ALTER TABLE "orcamento"
 ADD COLUMN "cliente_numero_endereco" TEXT,
 ADD COLUMN "cliente_inscricao_estadual" TEXT,
 ADD COLUMN "tipo_documento" "tipo_documento" NOT NULL DEFAULT 'ORCAMENTO',
 ADD COLUMN "data_emissao" DATE;
