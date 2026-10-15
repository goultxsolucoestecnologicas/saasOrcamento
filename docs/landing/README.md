# Landing OrçaFácil

Rota pública `/`; login e aplicação mantidos em `/entrar`, `/orcamentos` e `/configuracoes`. Prévia local desta branch: `http://localhost:3002`. Sem deploy, checkout, cadastro automático ou alteração de banco/autenticação.

Header/menu, hero com capturas reais, problema/solução, três passos, funcionalidades, demonstração com quatro abas, público, plano único de R$29,99 por empresa/até dois usuários, oito perguntas e contato/rodapé. A única dependência adicionada é `@radix-ui/react-accordion`, primitive acessível utilizado pelo componente shadcn. Menu e diálogo reutilizam Radix existente; motion somente CSS.

## Configuração

Variáveis de servidor em `.env` (alterar e recompilar):

| Variável                                         | Uso                                                         |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `LANDING_NOME`                                   | Marca do produto; padrão OrçaFácil                          |
| `LANDING_LOGO`                                   | Imagem estática de `public`, por exemplo `/marca/logo.svg`  |
| `LANDING_WHATSAPP_URL`                           | URL HTTPS real `wa.me` ou `api.whatsapp.com/send?phone=...` |
| `LANDING_SITE_URL`                               | Origem HTTPS real quando for publicar                       |
| `LANDING_PRIVACIDADE_URL` / `LANDING_TERMOS_URL` | Links opcionais dos documentos existentes                   |
| `LANDING_RESPONSAVEL`                            | Crédito opcional da empresa responsável                     |

Contato provisório autorizado pelo usuário: sem URL, “Quero começar” conduz à seção de contato e o botão final explica em diálogo que o canal será disponibilizado. Não há número fictício ou mensagem enviada. Ao configurar uma URL válida, todos os CTAs usam esse mesmo contato. Links legais ausentes são omitidos.

Sem origem publicada, metadata/robots desabilitam indexação e sitemap não inventa domínio. Com origem válida, somente a landing entra no sitemap; caminhos privados permanecem bloqueados. Open Graph usa imagem gerada pelo próprio Next, sem fontes externas.

## Ativos

`public/landing/*.webp`: capturas reais derivadas de `docs/ui/revisao` e `docs/pdf/imagens/pedido-completo-logo.png`, somente com dados fictícios. Total aproximado172KB antes da otimização do Next. Desktop no hero é uma visão parcial identificada; a demonstração mostra capturas inteiras. A marca das empresas demonstrativas não é a marca do SaaS.

Capturas da landing: [desktop](capturas/1440.png), [mobile](capturas/390.png), [hero desktop](capturas/hero-1440.png) e [hero mobile](capturas/hero-390.png).

## Verificação

`npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` e `node testes/landing-ui.mjs`. O roteiro usa Chromium em320/360/390/768/1024/1280/1440/1920px, axe, imagens, âncoras/menu, teclado das abas/FAQ, contato provisório, movimento reduzido, metadata e proteção401 das APIs privadas. Não grava dados.

QA visual independente e principal revisam as capturas. Contraste dos números foi corrigido após a primeira rodada; headline encurtada para comunicar o produto antes e equilibrar o hero. Testes de navegador são verificações locais, não certificação WCAG nem medição de Core Web Vitals em usuários reais. Sem Safari/iOS ou teclado virtual físico nesta rodada.

Resultado final: lint, typecheck,207 testes unitários, build e formatação aprovados;24 verificações do navegador sem falhas. QA independente aprovou as capturas finais de390 e1440px. Login real e leitura isolada da empresa também foram conferidos na porta3002, sem gravar dados ou publicar suas credenciais.

Pendências para publicação: WhatsApp real, domínio e documentos legais/identidade definitiva quando disponíveis. A auditoria de dependências da base permanece na etapa separada de segurança; esta branch não modifica essa arquitetura.
