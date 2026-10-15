-- CreateEnum
CREATE TYPE "situacao_cobranca" AS ENUM ('PENDENTE', 'PAGA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "situacao_assinatura" ADD VALUE 'CANCELADA';

-- AlterTable
ALTER TABLE "assinatura" ADD COLUMN     "data_direito_acesso" DATE,
ADD COLUMN     "data_inicio" DATE;

-- CreateTable
CREATE TABLE "admin_plataforma" (
    "id_admin" TEXT NOT NULL,
    "id_supabase" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_plataforma_pkey" PRIMARY KEY ("id_admin")
);

-- CreateTable
CREATE TABLE "configuracao_administrativa" (
    "id" TEXT NOT NULL DEFAULT 'principal',
    "nome_plano" TEXT NOT NULL DEFAULT 'Profissional',
    "valor_mensal_centavos" INTEGER NOT NULL DEFAULT 2999,
    "limite_usuarios_ativos" INTEGER NOT NULL DEFAULT 2,
    "tolerancia_dias" INTEGER NOT NULL DEFAULT 3,
    "nome_comercial" TEXT NOT NULL DEFAULT 'OrçaFácil',
    "contato_comercial" TEXT,

    CONSTRAINT "configuracao_administrativa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobranca" (
    "id_cobranca" TEXT NOT NULL,
    "id_empresa" TEXT NOT NULL,
    "id_assinatura" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "data_emissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_vencimento" DATE NOT NULL,
    "acesso_ate" DATE NOT NULL,
    "situacao" "situacao_cobranca" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "provedor" TEXT,
    "identificador_externo" TEXT,

    CONSTRAINT "cobranca_pkey" PRIMARY KEY ("id_cobranca")
);

-- CreateTable
CREATE TABLE "pagamento" (
    "id_pagamento" TEXT NOT NULL,
    "id_cobranca" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "forma_pagamento" TEXT NOT NULL DEFAULT 'PIX',
    "data_pagamento" DATE NOT NULL,
    "data_confirmacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_admin" TEXT NOT NULL,
    "provedor" TEXT,
    "identificador_externo" TEXT,
    "referencia_evento_externo" TEXT,

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id_pagamento")
);

-- CreateTable
CREATE TABLE "auditoria_administrativa" (
    "id_auditoria" TEXT NOT NULL,
    "id_admin" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "id_entidade" TEXT NOT NULL,
    "informacoes" JSONB NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_administrativa_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "convite_administrativo" (
    "data_tentativa" TIMESTAMP(3),
    "id_convite" TEXT NOT NULL,
    "id_empresa" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "id_supabase" UUID,
    "situacao" TEXT NOT NULL DEFAULT 'PENDENTE',
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convite_administrativo_pkey" PRIMARY KEY ("id_convite")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_plataforma_id_supabase_key" ON "admin_plataforma"("id_supabase");

-- CreateIndex
CREATE INDEX "cobranca_id_empresa_data_vencimento_idx" ON "cobranca"("id_empresa", "data_vencimento");

-- CreateIndex
CREATE INDEX "cobranca_situacao_data_vencimento_idx" ON "cobranca"("situacao", "data_vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "cobranca_provedor_identificador_externo_key" ON "cobranca"("provedor", "identificador_externo");

-- CreateIndex
CREATE UNIQUE INDEX "pagamento_id_cobranca_key" ON "pagamento"("id_cobranca");

-- CreateIndex
CREATE UNIQUE INDEX "pagamento_referencia_evento_externo_key" ON "pagamento"("referencia_evento_externo");

-- CreateIndex
CREATE UNIQUE INDEX "pagamento_provedor_identificador_externo_key" ON "pagamento"("provedor", "identificador_externo");

-- CreateIndex
CREATE INDEX "auditoria_administrativa_entidade_id_entidade_data_criacao_idx" ON "auditoria_administrativa"("entidade", "id_entidade", "data_criacao");

-- CreateIndex
CREATE UNIQUE INDEX "convite_administrativo_email_key" ON "convite_administrativo"("email");

-- CreateIndex
CREATE INDEX "convite_administrativo_id_empresa_situacao_idx" ON "convite_administrativo"("id_empresa", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "assinatura_id_empresa_id_assinatura_key" ON "assinatura"("id_empresa", "id_assinatura");

-- AddForeignKey
ALTER TABLE "cobranca" ADD CONSTRAINT "cobranca_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobranca" ADD CONSTRAINT "cobranca_id_empresa_id_assinatura_fkey" FOREIGN KEY ("id_empresa", "id_assinatura") REFERENCES "assinatura"("id_empresa", "id_assinatura") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_id_cobranca_fkey" FOREIGN KEY ("id_cobranca") REFERENCES "cobranca"("id_cobranca") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_id_admin_fkey" FOREIGN KEY ("id_admin") REFERENCES "admin_plataforma"("id_admin") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_administrativa" ADD CONSTRAINT "auditoria_administrativa_id_admin_fkey" FOREIGN KEY ("id_admin") REFERENCES "admin_plataforma"("id_admin") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_administrativo" ADD CONSTRAINT "convite_administrativo_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras financeiras também são protegidas no banco.
ALTER TABLE "configuracao_administrativa" ADD CONSTRAINT "configuracao_plano_valido" CHECK (valor_mensal_centavos > 0 AND limite_usuarios_ativos = 2 AND tolerancia_dias BETWEEN 0 AND 30);
ALTER TABLE "cobranca" ADD CONSTRAINT "cobranca_valores_validos" CHECK (valor_centavos > 0 AND acesso_ate >= data_vencimento);
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_valor_valido" CHECK (valor_centavos > 0);
ALTER TABLE "convite_administrativo" ADD CONSTRAINT "convite_situacao_valida" CHECK (situacao IN ('PENDENTE','ENVIANDO','CONCLUIDO'));
-- Data API pública não recebe policies. Acesso global somente no servidor autorizado.
ALTER TABLE "admin_plataforma" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "configuracao_administrativa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cobranca" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pagamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auditoria_administrativa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "convite_administrativo" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "admin_plataforma", "configuracao_administrativa", "cobranca", "pagamento", "auditoria_administrativa", "convite_administrativo" FROM anon, authenticated;
