# Backlog do MVP

| Tarefa | Estado | Aceite / dependências |
| --- | --- | --- |
| T01 Fundação | CONCLUIDA | Build/lint/TS/testes; banco conectado, migration aplicada e cliente gerado. |
| T02 Modelagem multiempresa e assinaturas | CONCLUIDA | Schema aditivo aplicado; limites/FK/número único e concorrência READ COMMITTED, REPEATABLE READ e SERIALIZABLE testados em schema isolado. |
| T03 Autenticação e isolamento | EM_REVISAO | Guard e hook de sessão verificam usuário/empresa/assinatura ativa; 16 testes passam. Login/logout integrados na T05. |
| T04 Scripts administrativos | EM_REVISAO | CLI implementada; 9 testes node:test e hash BetterAuth verificados. Integração real em schema isolado pendente. |
| T05 Layout/navegação/PWA | EM_ANDAMENTO | Frontend em worktree isolada, referência obrigatória fornecida. Aceite visual e API pendentes. |
| T06 Orçamentos e cálculos | PENDENTE | CRUD isolado, itens, descontos, validade, cliente, status, sequência concorrente; testes críticos. Depende T02/T03. |
| T07 Empresa e logo | PENDENTE | Nome/telefone e upload seguro privado por empresa. Depende T03. |
| T08 PDF/compartilhamento | PENDENTE | A4 legível, logo, dados, valores/itens; download e compartilhamento nativo. Depende T06/T07. |
| T09 Integração e testes | PENDENTE | Regressão, isolamento, concorrência, auth, upload/PDF e mobile/desktop. Depende T04–T08. |
| T10 Entrega local | PENDENTE | README de operação/provisionamento, scripts e validação final. Depende T09. |

## GitHub

Remoto informado pelo novo repositório: github.com/goultxsolucoestecnologicas/saasOrcamento. GitHub CLI oficial preparado em .tmp/tools-gh, sem autenticação. O usuário optou por continuar localmente sem PRs; não realizar push/PR até nova instrução. Branches derivadas e commits preservados, sem merge em main. Diretório oficial confirmado: C:\\projetoOrcamento\\saasOrcamento; fontes preservados por cópia após movimentação externa.

## Fora do escopo

Gateway, landing comercial, dashboard, serviços de nuvem, Docker, deploy e customização de modelos PDF. Não alterar dados reais nem resetar banco.
