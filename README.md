# SaaS de Orçamentos

MVP Next.js 16/React, TypeScript, Tailwind/shadcn, Prisma 7 e Supabase Auth/PostgreSQL. Inclui orçamentos, itens/descontos, numeração por empresa, configuração/logo privada, PDF A4 e PWA. Interface mobile-first baseada em `docs/referencias/prototipo-orcamentos.png`. Sem pagamentos ou deploy.

## Executar

Diretório oficial: `C:\projetoOrcamento\saasOrcamento`. Node 22.12+ (linha22), 24 ou26+, npm e projeto Supabase de desenvolvimento.

```powershell
npm install
# Somente se .env ainda não existir:
Copy-Item .env.example .env
npm run db:generate
npm run dev
```

Preencha `.env` local, nunca versionado:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: URL e chave pública do mesmo projeto.
- `DATABASE_URL`: runtime PrismaPg. Pode usar Supavisor transaction pooler, porta6543.
- `DIRECT_URL`: somente Prisma CLI/migrations; conexão direta ou session pooler porta5432. Conexão direta IPv6 depende de suporte da rede local.
- `APP_URL`: origem da aplicação, normalmente `http://localhost:3000`, também usada na proteção CSRF.
- `ARMAZENAMENTO_LOCAL_DIRETORIO`: diretório privado persistente fora de public, normalmente `./armazenamento`.
- `SUPABASE_SECRET_KEY`: exclusiva do CLI administrativo; alternativa legada `SUPABASE_SERVICE_ROLE_KEY`. Nunca prefixar com NEXT_PUBLIC nem enviar pelo chat.

pm run db:deploy -- --desenvolvimento-confirmado` aplica migrations existentes e gera o cliente. A opção afirma que o alvo foi conferido como desenvolvimento. Não use automaticamente em produção. Não usamos migrate reset, db push ou migrations destrutivas. Para criar migrations novas, use um PostgreSQL local dedicado com banco shadow; revise SQL antes de aplicar no Supabase.

Acesse [localhost:3000](http://localhost:3000). Variáveis NEXT_PUBLIC são incorporadas ao bundle: reinicie o servidor/recompile ao alterá-las.

## Autenticação e provisionamento

Supabase SSR usa cookies e proxy de renovação. Cada operação verifica `auth.getUser()` no servidor e consulta `Usuario.idAutenticacaoSupabase`; empresa nunca vem de parâmetros, email ou metadata do navegador. Usuário, empresa e assinatura devem estar ativos. Todas as consultas de domínio passam pelo gateway com escopo de empresa. Dinheiro em centavos e quantidades em milésimos; cálculos BigInt compartilhados, resultados persistidos usados no PDF.

No painel Supabase, **desative Allow new users to sign up**. O aplicativo não oferece cadastro público e contas Auth sem vínculo administrativo não acessam empresas. A configuração do painel é uma dependência externa, não controlada pela chave administrativa Auth.

Crie a identidade no painel Supabase Auth, com email/senha definidos fora do código, e anote o UUID. O CLI apenas verifica e vincula identidades existentes; não cria contas externas automaticamente:

```powershell
npm run admin -- criar-empresa --nome "Minha empresa"
npm run admin -- criar-usuario --empresa UUID_EMPRESA --nome "Nome" --email "email@exemplo.com" --autenticacao-supabase UUID_AUTH
npm run admin -- vincular-usuario --usuario UUID_USUARIO_LEGADO --autenticacao-supabase UUID_AUTH
npm run admin -- suspender-empresa --empresa UUID_EMPRESA
npm run admin -- ativar-empresa --empresa UUID_EMPRESA
npm run admin -- desativar-usuario --usuario UUID_USUARIO
npm run admin -- ativar-usuario --usuario UUID_USUARIO
```

UUID/email são verificados pela API administrativa. Limite de dois usuários ativos protegido por transação e trigger concorrente. Desativação/suspensão bloqueia autorização mesmo com token Supabase ainda válido. IDs, contas, hashes e sessões legados foram preservados; cookies Better Auth não são mais aceitos. Senhas antigas não foram migradas: contas existentes exigem identidade Supabase e vínculo explícito.

RLS habilitada sem policies nas tabelas do domínio/legado: anon/authenticated não usam a Data API para acessar esses dados. Prisma servidor utiliza conexão privilegiada e aplica autorização própria. Não adicione policies públicas nem permita Prisma bruto em serviços de domínio.

## Verificações

```powershell
npm run test:run
npm run test:admin
npm run lint
npm run typecheck
npm run build
npm run check:agents
```

Integração remota requer **autorização específica** para duas contas fictícias persistentes, empresas/usuários em schema separado e dados fictícios. Nunca execute em produção:

```powershell
npm run test:preparar-supabase -- --desenvolvimento-confirmado
node testes/banco-supabase.mjs
node testes/concorrencia-supabase.mjs
# Em outro terminal (usa schema isolado; não recebe chave administrativa):
node testes/servidor-supabase.mjs --producao
node --import tsx testes/api-integracao.mjs
node testes/fluxo-ui.mjs
```

A preparação guarda credenciais aleatórias somente em `.tmp`, ignorado. Testes posteriores conferem a impressão digital do alvo e schema antes de usar fixtures. Não criam novas contas Auth. Contas/schema são preservados; não há limpeza destrutiva. No ambiente preparado nesta sessão, acesso demonstrativo na porta3001 com credenciais fictícias em `.tmp/acesso-demonstracao.txt`; a porta3000 usa public e requer provisionamento próprio. Scripts locais antigos exigem TEST_DATABASE_URL apontando localhost e não usam o banco remoto.

PDF:
ode --import tsx testes/verificar-pdf.tsx` gera amostras fictícias para inspeção. Foram verificadas versões de1,7 e35páginas, cem itens e textos longos, com renderização/extracão. PWA armazena somente fallback offline e ícone; nenhuma página/API privada é cacheada. Instalação e compartilhamento nativo em aparelho físico ainda dependem de HTTPS e navegador compatível; fallback de download funciona no navegador desktop.

## Operação

Logos PNG/JPEG até2MB, normalizados e servidos por rota privada por empresa. Preserve armazenamento persistente ao reiniciar. Logos antigos são conservados. Respostas privadas no-store; erros não retornam detalhes do driver. `.env`, `.tmp`, uploads e cliente Prisma gerado são ignorados pelo Git.

Configurações de agentes em `.codex/agents` e regras em `AGENTS.md`; decisões visuais em `docs/DESIGN.md`, estado das tarefas em `docs/BACKLOG.md`. PRs são autorizados; nenhuma integração automática em main.

O npm audit ainda indica oito alertas altos transitivos na cadeia de ferramentas Next/Prisma. Não aplicamos audit fix --force nem upgrades incompatíveis.

## Interface e experiência

Auditoria, decisões, testes e capturas reais mobile/desktop do redesign estão em [docs/ui/README.md](docs/ui/README.md). Para a verificação automatizada das telas, execute
pm run test:ui` com o servidor de fixtures na porta3001.
