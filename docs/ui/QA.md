# Revisão QA da reformulação

Auditoria inicial: validações globais sem associação aos campos; edição vazia após falha de carga; loading persistente após erro; prévia de valores dependente de campos não monetários; estados vazios conflitantes; confirmação destrutiva sem diálogo; navegação ativa apenas por caminho exato; alvos menores que 44px; serviços desktop altos e upload sem prévia.

O roteiro `testes/ui-redesign.mjs` foi preparado para o servidor de fixtures autorizado na porta 3001. Ele valida a empresa antes de alterações e não cria identidades Auth, aplica migrations ou exclui dados. Cria e edita um orçamento fictício e atualiza a logo da empresa fictícia existente.

Não há agente Designer configurado: QA é uma função independente de teste, não uma revisão independente de Designer. O parecer visual estruturado é realizado pelo orquestrador conforme a alternativa prevista no pedido.

## Primeira revisão

Executada contra a primeira compilação do redesign em Chromium headless. Login, análise axe da listagem, configurações, diálogos de validação e menu não produziram violações nas regras selecionadas. Foram capturadas as seis telas previstas em mobile e desktop. Nos cinco viewports e nas três páginas avaliadas, não foi encontrado overflow horizontal.

- P1: fechar o diálogo de validação preservava mensagens inline e `aria-invalid`, mas não direcionava o foco ao primeiro campo inválido, tanto em mobile quanto em desktop. Correção requerida antes de concluir.
- P2: o link da marca media 24–32px de altura, abaixo do alvo de 44px estabelecido no pedido. Correção requerida e comunicada ao orquestrador.
- Capturas feitas imediatamente ao abrir o diálogo registravam o início da animação de opacidade. O roteiro foi ajustado para aguardar o término das animações finitas antes da captura; isso não constitui falha de contraste do estado estável nem adiciona delay ao produto.

A primeira execução também revelou incompatibilidades nos seletores exatos do roteiro com o asterisco dos rótulos. Os seletores foram corrigidos no teste; isso não foi registrado como defeito do produto.

O caso de erro estruturado da API também revelou a mesma falha de foco. A rodada de criação real foi interrompida porque a falha anterior impediu a limpeza do mock POST no roteiro; a limpeza foi tornada independente e esse resultado não representa falha do backend. Upload, edição, PDF, cache e logout aguardam a rodada consolidada. Segunda revisão ainda pendente da recompilação com as correções de foco e tamanho da marca.

## Segunda revisão

Executada após recompilar as correções. Foco no primeiro campo inválido passou em mobile, desktop e erros estruturados da API; alvos de 44px e ausência de overflow passaram nas três páginas em todos os cinco viewports. Análise axe de login, listagem, configurações, formulário preenchido, validação e navegação não apresentou violações nas regras selecionadas. O campo de preço focado permaneceu acessível, sem sobreposição pelas ações.

Criação com envio duplo gerou somente um POST. Edição, download PDF, upload de PNG, erro de listagem sem vazio enganoso, cache público da PWA, movimento reduzido e logout passaram. Não ocorreram erros de página.

- P1 adicional: axe identificou contraste insuficiente no título do toast de sucesso (`div[data-title]`) visível ao abrir a confirmação de exclusão. Correção solicitada antes da aprovação final.
- O teste de erro GET inicialmente procurou o botão de retry atrás do AlertDialog aberto. O roteiro foi corrigido para fechar o aviso antes de testar retry; esse resultado não representa um defeito do produto.

A confirmação colocou foco inicial em Cancelar; a ação destrutiva nunca foi executada. A rodada final consolidada após corrigir o contraste foi aprovada, incluindo o toast visível na confirmação. Não houve violações axe nas regras selecionadas nem problemas críticos identificados ainda abertos.

Uma verificação adicional somente de leitura validou o ajuste final de status na listagem e nos detalhes em mobile/desktop. As 12 capturas foram atualizadas contra a última compilação, nas dimensões exatas 390×844 e 1440×900, aguardando a marca da empresa e as transições. Listagem e navegação usam busca pelo prefixo `Cliente fictício QA`, evitando incluir clientes inseridos pelo usuário. As capturas estão em `screenshots/mobile/` e `screenshots/desktop/`.

Comandos executados: `node testes/ui-redesign.mjs`, seguido das verificações específicas `node testes/ui-redesign.mjs --somente-capturas` e `node testes/ui-redesign.mjs --somente-lista`. Esses dois modos não executam criação, edição ou upload.

## Cobertura executada

- Login/logout, navegação, criação e edição reais, prevenção de POST duplo, PDF e upload.
- Falhas GET/POST simuladas por interceptação apenas no teste; campos estruturados, preservação e foco, tentativa novamente e bloqueio de edição vazia.
- 360×800, 390×844, 768×1024, 1024×768 e 1440×900: largura e alvos de toque.
- Axe WCAG 2 A/AA, 2.1 A/AA e 2.2 AA; teclado e foco dos diálogos; preferência de movimento reduzido.
- Seis capturas mobile/desktop: listagem, novo orçamento, configurações, navegação, validação e skeleton.
- Cache PWA limitado aos arquivos públicos.

## Limites

## Revisão de espaçamentos e responsividade — 15/10/2026

Corrigidos alinhamento dos serviços/ações/total, campos comprimidos no celular, respiro entre descrições e campos, observações e situação, configuração estreita no tablet e navegação em alturas pequenas. Identidade visual e regras de negócio preservadas. A revisão independente identificou três ajustes adicionais, corrigidos e conferidos pelo principal nas capturas finais.

`node testes/ui-responsividade.mjs`: 148 verificações aprovadas, incluindo nove larguras (320, 360, 390, 640, 768, 1024, 1280, 1440 e 1920px), textos sem espaços, valores de até R$20 milhões dentro do limite de domínio, estados vazio/erro, diálogos, foco e navegação em alturas de320/480px. Login real na conta fictícia autorizada; respostas de domínio interceptadas com dados fictícios, sem gravações. A versão anterior apresentou14 falhas de geometria no mesmo diagnóstico. Lint, typecheck,196 testes unitários, build e formatação aprovados.

Evidências em [revisao/](revisao/): celular, tablet, desktop e conteúdo extenso. Headless Chromium cobre reflow e regras axe selecionadas; teclado virtual físico, Safari/iOS e leitor de tela não foram validados nesta rodada.

Headless Chromium não demonstra teclado virtual de celular físico, leitor de tela real, compartilhamento nativo ou instalação PWA em aparelho. Axe e teclado automatizados cobrem parte da acessibilidade e não certificam conformidade WCAG completa. Não há exclusões de regras axe neste roteiro.
