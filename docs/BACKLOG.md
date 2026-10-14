# Backlog do MVP

| Tarefa | Estado | Aceite / dependências |
| --- | --- | --- |
| T01 Fundação | CONCLUIDA | Build/lint/TS/testes; banco conectado, migration aplicada e cliente gerado. |
| T02 Modelagem multiempresa e assinaturas | EM_ANDAMENTO | Schema/migration aditivos, cobrança por empresa 2999 centavos, limite concorrente de 2 usuários, sem gateway. |
| T03 Autenticação e isolamento | PENDENTE | Login/logout; empresa, usuário e assinatura validados no servidor; consultas obrigatoriamente por empresa. Depende T02. |
| T04 Scripts administrativos | PENDENTE | Criar empresa/usuários e ativar/suspender manualmente; senha sem logs; limite transacional. Depende T02/T03. |
| T05 Layout/navegação/PWA | PENDENTE | UI fiel ao protótipo em docs/referencias, mobile-first, login, navegação, manifest e service worker seguro. Depende T03. |
| T06 Orçamentos e cálculos | PENDENTE | CRUD isolado, itens, descontos, validade, cliente, status, sequência concorrente; testes críticos. Depende T02/T03. |
| T07 Empresa e logo | PENDENTE | Nome/telefone e upload seguro privado por empresa. Depende T03. |
| T08 PDF/compartilhamento | PENDENTE | A4 legível, logo, dados, valores/itens; download e compartilhamento nativo. Depende T06/T07. |
| T09 Integração e testes | PENDENTE | Regressão, isolamento, concorrência, auth, upload/PDF e mobile/desktop. Depende T04–T08. |
| T10 Entrega local | PENDENTE | README de operação/provisionamento, scripts e validação final. Depende T09. |

## GitHub

BLOQUEADA: sem remoto informado e sem `gh` disponível no PATH. Git inicializado e fundação preservada em commit. Solicitação do destino enviada ao usuário; trabalho local continua em branches derivadas. Nenhum PR criado nem merge em main realizado.

## Fora do escopo

Gateway, landing comercial, dashboard, serviços de nuvem, Docker, deploy e customização de modelos PDF. Não alterar dados reais nem resetar banco.
