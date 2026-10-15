# Fundação do SaaS de Orçamentos

## Nomenclatura

- Domínio em português brasileiro: tabelas/colunas snake_case, modelos Prisma e tipos PascalCase, funções/variáveis camelCase, arquivos kebab-case descritivos.
- Use @map/@@map no Prisma. Preserve APIs externas, contratos legados e Supabase Auth e arquivos obrigatórios do Next.js.

## Arquitetura e segurança

- Next.js App Router com backend integrado, PostgreSQL Supabase, Prisma 7, Supabase Auth, Zod. Sem Docker, backend separado ou deploy nesta fase.
- Regras de negócio fora dos componentes. Clean Code, SOLID quando útil, DRY, KISS, YAGNI, tipagem forte, validação no servidor e erros explícitos.
- Dados sempre isolados por empresa. Toda operação de domínio deve entrar por executarNaEmpresa; filtre leituras/alterações/exclusões por idEmpresa do contexto e atribua esse id nas criações. Nunca use idEmpresa do navegador para autorização.
- Importe obterBanco apenas na infraestrutura, autenticação e módulos de servidor que executem dentro desse contexto. Ao adicionar cada módulo, centralize suas consultas com escopo obrigatório e teste ataques entre empresas. O gateway executarComDadosDaEmpresa injeta escopo em todos os delegates de domínio; não exponha Prisma bruto aos serviços.
- Cada usuário pertence a uma empresa; todos têm permissões iguais. Preserve o limite de dois ativos em transação com controle de concorrência, inclusive no provisionamento manual. Não crie endpoints de cadastro público.
- Empresa é unidade de cobrança; assinaturas separadas de usuários e gateways. Plano futuro Profissional: 2999 centavos/mês, dois usuários ativos. Sem integração de pagamento nesta etapa.
- Dinheiro em centavos inteiros. Transações para invariantes concorrentes e numeração por empresa.
- Logos em diretório persistente configurável fora de public e do código versionado. Upload valida tipo/tamanho e acesso por empresa; sem caminhos locais fixos.

- Prisma runtime usa DATABASE_URL; migrations usam DIRECT_URL. Confirme desenvolvimento antes de DDL remoto. Nunca execute reset/drop ou migre produção automaticamente.
- Supabase Auth verifica getUser no servidor; empresa vem do vínculo idAutenticacaoSupabase no banco. RLS sem policies bloqueia Data API anon/authenticated; Prisma aplica autorização própria. Não vincule por email/metadata do navegador nem migre senhas legadas automaticamente.
- SUPABASE_SECRET_KEY é restrita ao servidor/CLI administrativo; o painel autorizado posteriormente pode usá-la somente em módulos server-only de convites. Nunca enviar ao navegador ou registrar segredos. Não criar fixtures Auth externas sem autorização específica.

## Administração da plataforma

- Solicitação posterior autoriza `/admin` e APIs administrativas: cobrança manual Pix, assinantes, usuários, tolerância e auditoria. Sem gateway, cron de produção, exclusão física ou deploy.
- Administrador global é `AdminPlataforma`, independente de usuários de empresas. Toda operação global exige identidade Supabase verificada e papel ativo no banco via `executarComoAdministrador`; operações comuns mantêm `executarNaEmpresa`.
- Exceções de infraestrutura de acesso global são explícitas no ESLint. Nenhum papel pode vir do navegador ou metadata. Concessão de administrador somente por CLI autorizado, nunca endpoint público.
- Empresa, assinatura, cobrança inicial e reserva de convite são transacionais. Envio Auth é etapa externa durável, sem senha temporária; falha fica visível e reenviável. Convites pendentes reservam vagas.
- Quitação manual é transacional e idempotente; pagamentos confirmados, receita contratada e pendências são conceitos separados. Datas de vencimento usam DATE e calendário America/Sao_Paulo. Suspensão é manual e preserva todos os dados.

## Trabalho e validação

- Inspecione antes de alterar, preserve contratos, não duplique funcionalidades nem crie código morto. Faça apenas a tarefa solicitada, sem antecipar módulos.
- Execute verificações pertinentes; nunca afirme aprovação de teste não executado. Informe falhas e dependências externas objetivamente.
- Respostas curtas e técnicas; documentação mínima, sem redundância; reutilize estruturas, não recrie arquivos nem altere arquivos fora do escopo. Não sacrifique segurança/correção por economia de tokens.

## Agentes

- Agente principal orquestra: identifica dependências, define contratos, delega, integra e valida. Use o menor número de agentes possível; tarefas pequenas ficam no principal.
- Frontend: interface, acessibilidade, mobile-first, shadcn/ui, formulários e PWA quando solicitados.
- Backend: banco, autenticação, autorização, cálculos, transações e validação.
- PDF: documentos A4, logos, textos longos, paginação, reais e compartilhamento quando solicitados; consome cálculos existentes.
- QA: revisão, testes críticos, regressões e riscos reproduzíveis, sem mudanças funcionais não solicitadas.
- Delegue trabalho especializado. Paralelismo apenas sem dependências pendentes, com contratos definidos e arquivos distintos; use branches/worktrees quando disponíveis. Sem isolamento adequado, delegue sequencialmente.
- O usuário autorizou branches, commits, push ao remoto indicado e PRs por tarefa do MVP. Não faça merge automático em main/master nem force push. Se remoto/autenticação faltarem, registre o bloqueio e continue localmente. Não inicie todos os agentes em tarefas pequenas. Configurações em .codex/agents; nenhum quinto agente.

## Referência visual obrigatória

- Analise `docs/referencias/prototipo-orcamentos.png` antes de implementar interfaces; o orquestrador fornece essa referência ao Frontend. Decisões e tokens essenciais em `docs/DESIGN.md` e `src/app/globals.css`.
- Preserve a identidade visual: verde-petróleo, tipografia sem serifa, superfícies brancas, bordas cinza discretas, espaçamentos compactos, cards e campos de cantos suaves. Reproduza hierarquia, alinhamento, navegação e estados com Tailwind/shadcn personalizados.
- Mobile-first: lista em cards e criação por etapas; desktop adapta o mesmo sistema com navegação lateral e conteúdo amplo. Acessibilidade, foco visível, rótulos e responsividade em todas as telas.
- A imagem é referência visual, não especificação funcional: não adicione recursos por aparecerem nela, não copie erros/textos incorretos, não use estilos aleatórios ou a imagem inteira como interface/fundo. Todos os elementos devem ser React funcionais. A marca/logo pertencem à empresa cadastrada, não à marca ilustrativa do protótipo.
- Dados fictícios somente em fixtures de desenvolvimento/teste. Requisitos funcionais prevalecem sobre o desenho. QA verifica consistência visual e responsividade além dos testes funcionais.

## Execução autônoma do MVP

- Solicitação posterior autoriza landing comercial pública em `/`, com contato comercial configurável e rotas autenticadas preservadas. Sem checkout, cadastro automático, depoimentos fictícios ou deploy nesta tarefa.

- T02–T10 autorizadas conforme `docs/BACKLOG.md`: assinaturas manuais, autenticação, provisionamento, layout/PWA, CRUD/cálculos, configurações/logo, PDF/compartilhamento, integração e entrega local. Sem gateway, landing comercial, dashboards, Docker ou deploy. Supabase Auth/PostgreSQL foram autorizados posteriormente.
- Para cada tarefa: definir dependências/aceite, branch de base validada (derivada quando dependente), implementar, verificar, revisar/corrigir com QA, commit e PR quando remoto autorizado disponível. Não marque concluído sem aceite e base utilizável pelas próximas tarefas.
- Estados persistentes: PENDENTE, EM_ANDAMENTO, EM_REVISAO, CONCLUIDA, BLOQUEADA. Preserve o trabalho válido; não recrie arquitetura. Não execute migrations destrutivas nem altere dados reais sem autorização.
- Prossiga sem confirmação individual. Solicite intervenção apenas para credenciais/autorização ausentes, decisão impossível de inferir, operação destrutiva, risco significativo, mudança de escopo ou bloqueio irremediável. Nunca exponha segredos nem banco pessoal à internet.
- Não prometa execução após encerrar a sessão sem mecanismo persistente real; não configure automações irrestritas. Ao finalizar, relate tarefas, PRs, testes e pendências objetivamente.

## Validação final

Execute npm run lint, npm run typecheck, npm run test:run e npm run build. Para mudanças no schema, prisma validate e verificações no PostgreSQL quando disponível. PDF/PWA/upload/CRUD/assinaturas pertencem às tarefas autorizadas do backlog; deploy permanece fora do escopo.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
