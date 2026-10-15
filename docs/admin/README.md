# Administração do OrçaFácil

Área privada em `/admin`, independente da navegação do assinante. Reutiliza Supabase Auth e o design system existente. Não há segunda autenticação, gateway, cron de produção ou exclusão física.

## Operação

- Visão geral separa MRR contratado, recebimentos confirmados no mês e cobranças em aberto.
- Assinantes: busca, situação, cadastro, edição, usuários, convites e histórico.
- Cobranças: emissão manual, observações, confirmação de Pix com data e cancelamento das não quitadas.
- Vencimentos: hoje, próximos sete dias, vencidos e regularizados; tolerância configurável, suspensão manual.
- Configurações: nome/preço de referência do plano, dois usuários, tolerância e contato comercial. Valores históricos são preservados.
- Suspender/cancelar bloqueia operações de negócio no servidor; login/logout e informação de bloqueio continuam disponíveis. Reativar preserva dados.

## Segurança e ambiente

O papel global exige identidade Supabase verificada e registro ativo `AdminPlataforma`. Nenhuma API concede esse papel. A concessão inicial usa `npm run admin:conceder -- --id-supabase UUID --nome "Responsável" --confirmar CONCEDER_ADMIN_PLATAFORMA`; a identidade existente precisa ter e-mail confirmado. Não existem senhas padrão.

`DATABASE_URL` atende runtime e `DIRECT_URL` migrations. Ambas validam TLS; `POSTGRES_CA_CERTIFICADO` aponta para a CA oficial do provedor quando necessária. Não desative a verificação do certificado.

Novas tabelas têm RLS, nenhum acesso Data API anon/authenticated e FKs que preservam o vínculo empresa/assinatura. Escritas HTTP exigem origem da aplicação, corpo limitado, validação e autorização. Não há cache público dos dados administrativos. Dinheiro usa centavos inteiros; datas financeiras usam calendário São Paulo e campos DATE.

Detalhes de integridade, provisionamento e recuperação estão em [BACKEND.md](./BACKEND.md).

## Testes

Execute lint, typecheck, test:run e build. `test:admin:ui` usa sessão privada existente em `.tmp/admin-session.json`; `test:admin:integracao -- --fixtures-isoladas-confirmadas` exige fixtures de um schema exclusivo e aplicação local. Não executar testes de escrita contra dados de clientes. Os arquivos privados não são versionados.

Capturas em `capturas/` mostram exclusivamente empresas fictícias de testes. QA cobre permissões, pagamentos simultâneos, concorrência de vagas, tolerância, cancelamento, suspensão/reativação, preservação de dados, responsividade e acessibilidade automatizada.

## Dependências externas

- Convites exigem chave administrativa apenas no servidor, remetente/SMTP e URLs autorizadas no Supabase. Nenhum envio real foi necessário nos testes; falhas ficam como convite pendente, sem perder o cadastro.
- Autorize `APP_URL/auth/confirmar` no Supabase. O callback aceita o fluxo oficial com token hash (`invite`/`recovery`) e o retorno padrão por fragmento; em seguida abre `/definir-senha`. Não registre links/tokens. Referência: [templates oficiais Supabase](https://supabase.com/docs/guides/auth/auth-email-templates).
- O cadastro público ainda estava habilitado no provedor durante a verificação. Desative “Allow new users to sign up” no painel Supabase. Identidades sem vínculo não acessam empresas ou administração.
- Listagens têm limites defensivos documentados em BACKEND.md; paginação é necessária antes de ultrapassar esses volumes. Backups e restauração operacional permanecem responsabilidade do ambiente.
