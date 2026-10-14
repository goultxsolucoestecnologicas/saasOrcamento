# SaaS de Orçamentos — T01

Fundação Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL, Prisma, Better Auth e Zod. Sem CRUD, dashboard, PDF, PWA, uploads ou pagamentos nesta etapa.

## Desenvolvimento local

Pré-requisitos: Node.js 22.12+ na linha 22, 24 LTS (recomendado) ou 26+, npm e PostgreSQL 16+ instalado diretamente no computador. A faixa de Node acompanha o Vitest instalado. Não utiliza Docker. Execute na raiz do projeto.

```powershell
npm install
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie o valor gerado para `BETTER_AUTH_SECRET` no `.env`; não publique esse valor. Ajuste `DATABASE_URL`, senha e URLs. `APP_URL` é a origem confiável do navegador; `BETTER_AUTH_URL` é a URL do servidor de autenticação. Mantenha ambas como `http://localhost:3000` no desenvolvimento padrão. O `.env.example` deixa o segredo vazio de propósito.

Instale PostgreSQL pelo instalador oficial e adicione `bin` ao PATH, se necessário. No SQL Shell (psql), conecte como administrador postgres e execute, substituindo a senha:

```sql
CREATE ROLE orcamentos LOGIN PASSWORD 'troque_a_senha' CREATEDB;
CREATE DATABASE saas_orcamentos OWNER orcamentos;
```

`CREATEDB` é necessário apenas no ambiente de desenvolvimento para o banco shadow usado pelo Prisma Migrate. A URL de exemplo corresponde a esse usuário/banco; codifique caracteres especiais da senha na URL. Com o serviço PostgreSQL iniciado:

```powershell
npx prisma migrate dev --name fundacao
npm run db:generate
npm run dev
```

Acesse [localhost:3000](http://localhost:3000). `prisma generate` também roda no postinstall, build e typecheck. Prisma 7 mantém a conexão em `prisma.config.ts` e requer geração explícita após migrations; o script `npm run db:migrate` faz ambas as operações.

```powershell
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run start
```

Outros comandos: `npm run test` (watch), `npm run db:studio`, `npm run format`, `npm run format:check`, `npm run check:agents` (TOML e caminhos dos quatro agentes).

## Estrutura e contratos

- `src/app`: página inicial em português e endpoint Better Auth `/api/auth/[...all]`.
- `src/componentes/ui`: componente Button compatível com shadcn/ui; aliases em `components.json`.
- `src/bibliotecas`: ambiente, banco, autenticação, contexto de empresa e configuração de armazenamento.
- `prisma/schema.prisma`: somente Empresa e contratos mínimos da autenticação. Nomes físicos em português; campos internos Better Auth preservados e mapeados.
- `src/gerado/prisma`: cliente gerado, ignorado pelo Git.

Autenticação email/senha integrada com cadastro público desabilitado. Provisionamento de usuários e tela de login ficam para tarefas futuras. A empresa é obrigatória no usuário; empresa/ativo não podem ser escritos pelo cliente através dos campos adicionais da autenticação.

Toda operação futura de domínio deve usar `executarNaEmpresa`. Essa função verifica sessão e busca o usuário atual no banco, recusando usuário inativo/empresa suspensa. Cada módulo deverá encapsular consultas filtradas por `idEmpresa` do contexto: o Prisma bruto não injeta filtros automaticamente. Os testes iniciais verificam esse contexto com banco simulado; não comprovam integração PostgreSQL nem isolamento de um CRUD ainda inexistente.

O limite de dois usuários ativos será aplicado na T02 mediante transação e controle de concorrência; não há provisionamento público ou administrativo na T01. Assinaturas serão modeladas separadas dos usuários, com empresa como unidade de cobrança (Profissional, 2999 centavos/mês). Sem gateway nesta etapa.

`ARMAZENAMENTO_LOCAL_DIRETORIO=./armazenamento` prepara armazenamento privado persistente, fora de `public`, ignorado pelo Git. Não existe upload/download. Na implementação futura, validar tipo/tamanho, associação à empresa e acesso; trocar a implementação por S3 sem expor caminhos locais. PDF e PWA serão instalados somente nas respectivas tarefas.

## Codex

`AGENTS.md` define regras permanentes e o agente principal orquestra. `.codex/config.toml` registra frontend/backend/pdf/qa, com instruções em `.codex/agents/*.toml`, sem fixar modelos nem mudar permissões globais.

Formato conferido na documentação oficial de [configuração](https://learn.chatgpt.com/docs/config-file/config-reference) (`agents.<nome>.description`, `config_file`, `developer_instructions`) e no Codex CLI instalado, versão 0.139.0, com `multi_agent` estável e habilitado. Os quatro papéis também foram reconhecidos pelo app-server local com configuração estrita e overrides explícitos, sem execução de modelo. A leitura padrão nessa verificação não carregou os agentes do projeto: selecione o diretório como confiável no Codex e reabra a sessão para carregar `.codex/config.toml`. As preferências globais de confiança não foram alteradas. Use poucos agentes e delegação sequencial quando não houver isolamento por worktree.

## Banco indisponível

Se `psql` não for encontrado ou a porta 5432 estiver fechada, instale/inicie PostgreSQL e execute os comandos SQL e migration acima. Geração/validação do schema não comprova conexão ao banco. Não inclua `.env`, uploads ou segredos no Git.

## Validação da T01 neste computador

Dependências instaladas; TypeScript, lint, sete testes Vitest, schema Prisma, TOML e build verificados. HTTP: página inicial 200, sessão anônima 200/null, cadastro público 400/EMAIL_PASSWORD_SIGN_UP_DISABLED. No sandbox Windows, compilador nativo e conexões locais foram bloqueados; as verificações de build/HTTP foram executadas fora do sandbox.

Após a configuração local das credenciais, a conexão PostgreSQL foi validada com `SELECT 1`. A migration `20261014190000_fundacao` foi aplicada com `prisma migrate deploy`, sem reset ou operações destrutivas. `prisma migrate status` confirmou o banco atualizado e `npm run db:generate` gerou o Prisma Client 7.10.0. O `.env` permanece ignorado e suas credenciais não foram expostas.

O npm audit reporta oito alertas altos transitivos relacionados a `braces` e `deepmerge-ts`, herdados por ferramentas Next/Prisma. Não há correção compatível automática para todos; não foi usado audit fix --force. `mysql2` foi atualizado por override compatível. ESLint 9 foi mantido por compatibilidade de peers, apesar do aviso de fim de suporte.
