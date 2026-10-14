-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "empresa" (
    "id_empresa" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id_empresa")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "imagem" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,
    "id_empresa" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "sessao" (
    "id_sessao" TEXT NOT NULL,
    "data_expiracao" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,
    "endereco_ip" TEXT,
    "agente_usuario" TEXT,
    "id_usuario" TEXT NOT NULL,

    CONSTRAINT "sessao_pkey" PRIMARY KEY ("id_sessao")
);

-- CreateTable
CREATE TABLE "conta" (
    "id_conta" TEXT NOT NULL,
    "id_conta_provedor" TEXT NOT NULL,
    "id_provedor" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "token_acesso" TEXT,
    "token_renovacao" TEXT,
    "token_identidade" TEXT,
    "data_expiracao_token_acesso" TIMESTAMP(3),
    "data_expiracao_token_renovacao" TIMESTAMP(3),
    "escopo" TEXT,
    "senha" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conta_pkey" PRIMARY KEY ("id_conta")
);

-- CreateTable
CREATE TABLE "verificacao" (
    "id_verificacao" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "data_expiracao" TIMESTAMP(3) NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verificacao_pkey" PRIMARY KEY ("id_verificacao")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_id_empresa_ativo_idx" ON "usuario"("id_empresa", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_token_key" ON "sessao"("token");

-- CreateIndex
CREATE INDEX "sessao_id_usuario_idx" ON "sessao"("id_usuario");

-- CreateIndex
CREATE INDEX "conta_id_usuario_idx" ON "conta"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "conta_id_provedor_id_conta_provedor_key" ON "conta"("id_provedor", "id_conta_provedor");

-- CreateIndex
CREATE INDEX "verificacao_identificador_idx" ON "verificacao"("identificador");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conta" ADD CONSTRAINT "conta_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
