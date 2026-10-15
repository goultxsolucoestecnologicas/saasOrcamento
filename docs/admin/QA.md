# Validação do painel administrativo

- Lint e TypeScript: aprovados.
- Testes unitários: 269 testes em 27 arquivos aprovados.
- Build de produção: executado, sem deploy.
- Navegador: 56 verificações aprovadas; seis larguras entre 320 e 1920 px, seis telas, menu, filtros, loading/erro, formulário e foco, diálogos, IDs únicos e acessibilidade automatizada. As verificações de contraste aguardam a animação do diálogo terminar.
- Integração real em schema exclusivo Supabase de desenvolvimento: 35 verificações de APIs aprovadas, incluindo cadastro com convite pendente, reserva concorrente de vagas, confirmação simultânea do mesmo Pix, receita sem duplicidade, preservação de preços históricos, CSRF, cancelamento e suspensão/reativação.
- PostgreSQL isolado: nove verificações aprovadas de RLS/privilégios, FK empresa/assinatura, valores positivos e trigger de limite de usuários.
- Reativações concorrentes: duas respostas 200 e uma 400; banco permaneceu com dois usuários ativos.
- Bundle público: nenhuma credencial de servidor encontrada na varredura dos arquivos estáticos compilados.
- Migration aditiva revisada e aplicada no desenvolvimento; contagens de empresas, usuários e orçamentos existentes permaneceram iguais. Concessão administrativa ao proprietário usou identidade existente verificada e CLI, sem criação Auth.

Capturas de 320, 390 e 1440 px usam somente fixtures fictícias no schema isolado. Sessões e credenciais de teste ficam em .tmp ignorado. Não foi enviado e-mail real, alterada senha ou usado gateway.

Limites: testes Chromium, sem certificação integral de acessibilidade nem teste em aparelho físico/Safari. Entrega de convite depende de SMTP, limites e configuração de redirecionamento do Supabase; caminho externo foi simulado em testes unitários e falha durável foi validada no ambiente real. Cadastro público no provedor ainda habilitado, sem conceder acesso às empresas ou administração. Limites de listagem e recuperação de falha entre Auth/PostgreSQL documentados em BACKEND.md.

Auditoria de dependências: oito alertas altos preexistentes na base da landing (cadeias deepmerge-ts/Prisma e braces/ESLint), nenhum crítico. Nenhuma dependência nova foi adicionada por este módulo. A correção de dependências permanece no trabalho de segurança separado; não foi aplicado npm audit fix --force nem downgrade de ferramentas.
