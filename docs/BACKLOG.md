# Backlog do MVP

| Tarefa                                   | Estado     | Aceite / dependências                                                                                                                                                                                |
| ---------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01 Fundação                             | CONCLUIDA  | Build/lint/TS/testes; banco conectado, migration aplicada e cliente gerado.                                                                                                                          |
| T02 Modelagem multiempresa e assinaturas | CONCLUIDA  | Schema aditivo aplicado; limites/FK/número único e concorrência READ COMMITTED, REPEATABLE READ e SERIALIZABLE testados em schema isolado.                                                           |
| T03 Autenticação e isolamento            | EM_REVISAO | Supabase Auth SSR, verificação remota, vínculo UUID explícito e escopo obrigatório; testes unitários aprovados.                                                                                      |
| T04 Scripts administrativos              | EM_REVISAO | CLI Supabase verifica identidade/email, limite2 e preservação legado;13 testes aprovados.                                                                                                            |
| T05 Layout/navegação/PWA                 | EM_REVISAO | Interface mobile/desktop, wizard, layout, PWA e referência visual implementados.                                                                                                                     |
| T06 Orçamentos e cálculos                | EM_REVISAO | CRUD escopado, cálculos BigInt, sequência concorrente e paginação implementados.                                                                                                                     |
| T07 Empresa e logo                       | EM_REVISAO | Configuração e logo PNG/JPEG privada com validação implementados.                                                                                                                                    |
| T08 PDF/compartilhamento                 | EM_REVISAO | PDF A4 paginado, download e compartilhamento implementados; amostras renderizadas verificadas.                                                                                                       |
| T09 Integração e testes                  | EM_REVISAO | Unitários e PostgreSQL Supabase/RLS/concorrência aprovados; login Supabase, HTTP e navegador aprovados com fixtures no schema isolado.                                                               |
| T10 Entrega local                        | EM_REVISAO | README e comandos atualizados para Supabase; build, lint, TypeScript, formato e129+13testes aprovados; PRs2/3 em revisão, regressão HTTP/browser aprovada; cadastro público ainda depende do painel. |

## GitHub

Remoto autorizado: github.com/goultxsolucoestecnologicas/saasOrcamento. GitHub CLI autenticado. PR1: https://github.com/goultxsolucoestecnologicas/saasOrcamento/pull/1 (base inicial de autenticação/administração; Supabase substitui o provedor na etapa seguinte). PR2: https://github.com/goultxsolucoestecnologicas/saasOrcamento/pull/2 (MVP/Supabase, draft). PR3 (branch t12-validacao-supabase) documenta validações, fixtures e metadados privados. Sem merge automático ou force push. Diretório oficial: C:\projetoOrcamento\saasOrcamento.

## Supabase

Ambiente confirmado pelo usuário como exclusivamente desenvolvimento. DATABASE_URL/runtime e DIRECT_URL/migrations conectados. Seis migrations não destrutivas aplicadas, RLS nas8tabelas de domínio/legado e nos metadados Prisma, Prisma7 gerado. Duas identidades fictícias e schema de testes remoto autorizados explicitamente e provisionados; preservados sem exclusão. Credenciais somente em .tmp ignorado. Chave administrativa disponível; chave pública corrigida e validada com200. Cadastro público permanece habilitado; usuário confirmou que irá desativá-lo no painel Supabase. Regressão Supabase aprovada: login/logout, autorização tenant/CSRF, cálculos/CRUD, sequência, paginação 201registros, logo/PDF, suspensão, formulário/configurações e PWA. Larguras320/390/768/1024/1440px verificadas. Aplicação principal3000 ainda sem usuário; demonstração3001 usa schema de teste e credenciais em .tmp/acesso-demonstracao.txt.

## Reformulação UI/UX

EM_REVISAO: branch `feat/ui-ux-redesign-mobile-first`, baseada em `t12-validacao-supabase`. Auditoria anterior à implementação, tokens e referência preservados, revisão visual estruturada (Designer não configurado), duas revisões QA e rodada consolidada aprovadas. 150 testes unitários e13 administrativos, lint, TypeScript, build e integração real aprovados. Cinco viewports sem overflow ou violações axe nas regras selecionadas;12capturas reais e limitações em `docs/ui/README.md`. Nenhuma migration ou exclusão executada nesta etapa. PR da etapa permanece sem merge automático.

## PDF comercial conforme modelo físico

EM_REVISAO: branch `feat/pdf-orcamento-modelo-comercial`, baseada na reformulação UI (PR4). Identidade comercial opcional, número/IE, tipo e emissão histórica integrados. Migration somente aditiva aplicada no desenvolvimento confirmado; testes de persistência/RLS revertidos. 192 unitários, 13 administrativos, lint/TS/build e HTTP real aprovados. Sete grupos E2E e revisão editorial independente; sete PDFs reais (77 páginas verificadas), capturas e limitações em `docs/pdf/README.md`. Sem merge automático.

## Fora do escopo

Gateway, landing comercial, dashboard, outros serviços de nuvem, Docker e deploy. Não alterar dados reais nem resetar banco.
