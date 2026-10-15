# Backend administrativo

A autenticação continua no Supabase Auth. O papel global é a entidade independente `AdminPlataforma`, consultada no servidor a partir de `getUser`; não existe cadastro público ou endpoint de concessão. Um administrador sem `Usuario` funciona normalmente e não ocupa vaga da empresa. Se a mesma identidade também possuir um vínculo comum de `Usuario`, esse vínculo continua sendo uma conta assinante e ocupa sua vaga.

## Acesso inicial

Após aplicar a migration em desenvolvimento e verificar a identidade já existente, um operador autorizado pode executar:

```powershell
npx tsx scripts/conceder-admin-plataforma.ts --id-supabase UUID_EXISTENTE --nome "Responsável" --confirmar CONCEDER_ADMIN_PLATAFORMA
```

O comando verifica o UUID na API oficial administrativa Supabase, exige confirmação explícita e registra auditoria. Não cria conta Auth, não define senha e não imprime segredos. A chave `SUPABASE_SECRET_KEY` fica exclusivamente no ambiente do servidor/CLI. A migration não concede administradores automaticamente.

## Cobrança

- Configuração do plano é referência para novos contratos; a assinatura e cada cobrança guardam o valor contratado/emitido. Alterações da configuração não modificam cobranças históricas.
- A primeira cobrança é emitida no cadastro. `dataVencimento` e `acessoAte` são datas de calendário; timestamps de emissão/confirmação são instantes UTC. Calendário de recebimentos e tolerância usa America/Sao_Paulo.
- Cobrança vencida é uma situação derivada de `PENDENTE` e da data atual; não exige cron. Prazo padrão de três dias é configurável de zero a trinta. Suspensão é sempre manual.
- Confirmar pagamento grava exatamente o valor da cobrança, pagamento, situação e auditoria na mesma transação. Um bloqueio por atualização da assinatura serializa confirmações concorrentes; a unicidade de pagamento por cobrança é defesa adicional. Repetições retornam `jaConfirmado` sem duplicar receita.
- A quitação estende o direito de acesso até o maior `acessoAte` já pago e atualiza o vencimento informativo. Reativa assinaturas suspensas; assinaturas canceladas exigem ativação administrativa explícita. Pagamento histórico nunca reduz o período pago.
- Nenhuma confirmação ocorre por abrir tela, informar Pix ou criar uma cobrança. Não há banco, QR Code, cron ou gateway integrado. Cancelamento preserva dados e não estorna pagamentos.
- `quitarCobranca` centraliza a regra transacional para futura integração, que ainda precisará de autorização própria e verificação dos eventos externos. Os identificadores externos e de evento já possuem unicidade.

## Provisionamento e convites

Empresa, assinatura, primeira cobrança, reserva de convite e auditoria são criadas atomicamente no PostgreSQL. O envio externo é uma segunda etapa durável, porque PostgreSQL e Supabase Auth não compartilham transação distribuída.

O servidor usa `inviteUserByEmail`, sem senha temporária. O UUID devolvido pela API oficial é persistido antes de criar o vínculo local. Em erro, o cadastro aparece com convite pendente e uma mensagem de configuração; reenviar reutiliza a reserva. Convites pendentes reservam vagas e a criação/reativação usa bloqueio da empresa, além do trigger PostgreSQL existente de no máximo dois ativos. Um envio interrompido pode ser repetido após o lease de dois minutos.

Dependências reais: chave administrativa, SMTP/remetente aprovado, limites de e-mail e allowlist de redirecionamento do Supabase. Configure o template oficial para encaminhar token_hash e tipo `invite`/`recovery` ao callback `/auth/confirmar`, conforme o fluxo SSR do projeto. Nunca publique a URL completa de convite, tokens ou links de recuperação.

Se o processo falhar depois de o Auth criar a identidade e antes de persistir o UUID, a reserva continua visível, mas o provedor pode recusar novo convite por e-mail já existente. Exige reconciliação por operador autorizado com o UUID verificado diretamente no Supabase; não vinculamos automaticamente uma identidade preexistente pelo e-mail. Nenhuma identidade externa é excluída como compensação automática.

## Limites operacionais

Listagens administrativas possuem limites defensivos de 500 empresas e 1.000 cobranças por filtro. Os filtros de período, situação e grupo são aplicados no banco antes do limite; indicadores financeiros usam agregações completas. Paginação deverá ser acrescentada antes de ultrapassar esses volumes. Não há exclusão física pela interface nem suspensão automática. Todas as novas tabelas têm RLS sem políticas públicas e privilégios Data API revogados.
