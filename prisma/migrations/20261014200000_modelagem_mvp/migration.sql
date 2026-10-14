-- CreateEnum
BEGIN;
CREATE TYPE "situacao_assinatura" AS ENUM ('ATIVA', 'SUSPENSA');

-- CreateEnum
CREATE TYPE "situacao_orcamento" AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'RECUSADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "tipo_desconto" AS ENUM ('FIXO', 'PERCENTUAL');

-- AlterTable
ALTER TABLE "empresa" ADD COLUMN     "logo_chave" TEXT,
ADD COLUMN     "proximo_numero_orcamento" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "telefone" TEXT;

-- CreateTable
CREATE TABLE "assinatura" (
    "id_assinatura" TEXT NOT NULL,
    "id_empresa" TEXT NOT NULL,
    "nome_plano" TEXT NOT NULL DEFAULT 'Profissional',
    "valor_mensal_centavos" INTEGER NOT NULL DEFAULT 2999,
    "limite_usuarios_ativos" INTEGER NOT NULL DEFAULT 2,
    "situacao" "situacao_assinatura" NOT NULL DEFAULT 'ATIVA',
    "gateway" TEXT,
    "identificador_externo" TEXT,
    "data_vencimento" TIMESTAMP(3),
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinatura_pkey" PRIMARY KEY ("id_assinatura")
);

-- CreateTable
CREATE TABLE "orcamento" (
    "id_orcamento" TEXT NOT NULL,
    "id_empresa" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "situacao" "situacao_orcamento" NOT NULL DEFAULT 'RASCUNHO',
    "cliente_nome" TEXT NOT NULL,
    "cliente_telefone" TEXT,
    "cliente_endereco" TEXT,
    "cliente_cidade" TEXT,
    "cliente_documento" TEXT,
    "observacoes" TEXT,
    "validade_dias" INTEGER,
    "desconto_tipo" "tipo_desconto" NOT NULL DEFAULT 'FIXO',
    "desconto_valor" INTEGER NOT NULL DEFAULT 0,
    "subtotal_centavos" INTEGER NOT NULL DEFAULT 0,
    "total_centavos" INTEGER NOT NULL DEFAULT 0,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamento_pkey" PRIMARY KEY ("id_orcamento")
);

-- CreateTable
CREATE TABLE "orcamento_item" (
    "id_item" TEXT NOT NULL,
    "id_empresa" TEXT NOT NULL,
    "id_orcamento" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "quantidade_milesimos" INTEGER NOT NULL,
    "valor_unitario_centavos" INTEGER NOT NULL,
    "subtotal_centavos" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "orcamento_item_pkey" PRIMARY KEY ("id_item")
);

-- CreateIndex
CREATE UNIQUE INDEX "assinatura_id_empresa_key" ON "assinatura"("id_empresa");

-- CreateIndex
CREATE INDEX "orcamento_id_empresa_situacao_data_criacao_idx" ON "orcamento"("id_empresa", "situacao", "data_criacao");

-- CreateIndex
CREATE UNIQUE INDEX "orcamento_id_empresa_numero_key" ON "orcamento"("id_empresa", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "orcamento_id_empresa_id_orcamento_key" ON "orcamento"("id_empresa", "id_orcamento");

-- CreateIndex
CREATE INDEX "orcamento_item_id_empresa_id_orcamento_ordem_idx" ON "orcamento_item"("id_empresa", "id_orcamento", "ordem");

-- AddForeignKey
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento" ADD CONSTRAINT "orcamento_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_item" ADD CONSTRAINT "orcamento_item_id_empresa_id_orcamento_fkey" FOREIGN KEY ("id_empresa", "id_orcamento") REFERENCES "orcamento"("id_empresa", "id_orcamento") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve empresas existentes com assinatura manual equivalente à ativação atual.
INSERT INTO "assinatura" ("id_assinatura", "id_empresa", "situacao", "data_atualizacao")
SELECT gen_random_uuid()::text, "id_empresa",
       CASE WHEN "ativa" THEN 'ATIVA'::"situacao_assinatura" ELSE 'SUSPENSA'::"situacao_assinatura" END,
       CURRENT_TIMESTAMP
FROM "empresa";

ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_valores_validos"
CHECK ("valor_mensal_centavos" >= 0 AND "limite_usuarios_ativos" BETWEEN 1 AND 2);
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_numero_positivo" CHECK ("proximo_numero_orcamento" > 0);
ALTER TABLE "orcamento" ADD CONSTRAINT "orcamento_valores_validos"
CHECK ("numero" > 0 AND "subtotal_centavos" >= 0 AND "total_centavos" >= 0
AND "total_centavos" <= "subtotal_centavos" AND "desconto_valor" >= 0
AND ("desconto_tipo" <> 'PERCENTUAL' OR "desconto_valor" <= 10000)
AND ("validade_dias" IS NULL OR "validade_dias" > 0));
ALTER TABLE "orcamento_item" ADD CONSTRAINT "item_valores_validos"
CHECK ("quantidade_milesimos" > 0 AND "valor_unitario_centavos" >= 0 AND "subtotal_centavos" >= 0 AND "ordem" >= 0);

-- Serializa inserção/reativação no registro da empresa, inclusive via SQL manual.
CREATE FUNCTION "verificar_limite_usuarios"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE limite integer;
BEGIN
  IF NEW."ativo" THEN
    PERFORM 1 FROM "empresa" WHERE "id_empresa" = NEW."id_empresa" FOR UPDATE;
    SELECT "limite_usuarios_ativos" INTO limite FROM "assinatura" WHERE "id_empresa" = NEW."id_empresa";
    limite := COALESCE(limite, 2);
    IF (SELECT count(*) FROM "usuario" WHERE "id_empresa" = NEW."id_empresa"
        AND "ativo" AND "id_usuario" <> NEW."id_usuario") >= limite THEN
      RAISE EXCEPTION 'Limite de usuários ativos da empresa atingido.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "usuario_limite_ativos"
BEFORE INSERT OR UPDATE OF "ativo", "id_empresa" ON "usuario"
FOR EACH ROW EXECUTE FUNCTION "verificar_limite_usuarios"();
COMMIT;
