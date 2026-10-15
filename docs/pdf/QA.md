# QA independente — PDF comercial

## Escopo e método

Revisão da fotografia `docs/referencias/formulario-fisico.png`, dos PDFs renderizados e do fluxo autenticado de criação/edição/configuração. A revisão editorial estruturada do agente principal é complementada por QA independente; não há agente Designer dedicado configurado e esta revisão não é apresentada como aprovação de um Designer.

O script `testes/pdf-comercial-ui.mjs` utiliza somente as duas contas fictícias previamente autorizadas, confere o identificador de empresa antes de qualquer escrita e preserva os dados existentes. As configurações comerciais são preenchidas apenas na interface, sem salvar a empresa. Nenhuma conta Auth, empresa ou schema adicional é criado; não há exclusão.

## Cobertura preparada

- Formulário em 360, 390, 768, 1024 e 1440 pixels; overflow horizontal e regras axe WCAG A/AA selecionadas, sem exclusões.
- Um pedido fictício, emissão em 29/02/2024, número 240 e IE ISENTO; edição preserva os campos e o tipo distinto da situação operacional.
- PDF com assinatura `%PDF`, MIME correto e nome do arquivo com pedido; duplo clique não dispara duas requisições.
- Erro simulado de geração: AlertDialog acessível e ação reutilizável após fechar.
- Documento da outra empresa inacessível (404) e escrita com origem externa bloqueada (403).
- Sete campos comerciais opcionais na configuração; UF inválida permanece inline, retorna o foco e não envia atualização.
- Capturas reais mobile 390×844 e desktop 1440×900 de criação, edição e configuração, somente com dados fictícios.

## Resultados

Executado após a migration aditiva e a build atualizada. Os resultados e a segunda revisão estão registrados abaixo.

## Limites

Axe e Chromium automatizados não substituem inspeção editorial dos PDFs, leitor de tela nem uso em aparelho físico. A revisão de paginação e geometria depende das amostras renderizadas do serviço real.

## Execução e revisão final

Review1 executou os sete grupos E2E: criação/edição, dados históricos, PDF e isolamento passaram. Duas aferições axe em AlertDialog inicialmente ocorreram durante o fade de abertura e sinalizaram contraste transitório. O teste passou a aguardar `document.getAnimations().finished` somente para animações finitas, sem exclusões axe nem alteração do produto.

Review2: `node testes/pdf-comercial-ui.mjs --revisao` concluiu com código 0, sete grupos aprovados, zero violações axe nos estados estáveis testados, zero overflow nas cinco larguras e zero erros JavaScript. A segunda execução reutilizou o mesmo pedido fictício da primeira; não criou uma segunda conta/documento. A empresa e sua logo não foram salvas nem alteradas.

Inspeção editorial independente dos PNGs finais: pedido completo com logo, orçamento simples sem logo, cem serviços curtos (primeira e última), orçamento extenso (intermediária e última) e quebras extremas (primeira e última). Cabeçalho comercial, seleção exclusiva de tipo, quatro colunas com divisórias, quantidade com unidade, valores alinhados à direita, watermark proporcional/discreta, linhas vazias, resumo de desconto, assinatura e total separado estão consistentes com a fotografia. Continuação de descrição em páginas seguintes não repete valores; identificação e cabeçalho da tabela reaparecem. Nenhum corte/sobreposição crítico encontrado nas amostras inspecionadas.

Uma suspeita inicial de divisor ausente entre preço unitário e total foi descartada após releitura da renderização final: a primeira leitura usou imagem intermediária. Não houve mudança funcional de produto causada por essa suspeita.

Seis capturas reais em `telas/mobile` e `telas/desktop`: formulário novo, edição do pedido fictício e configuração preenchida sem persistência. Mobile mantém as etapas, campos novos rotulados e controles utilizáveis; desktop preserva os painéis e a identidade visual existente. Nenhum dado de cliente real ou credencial aparece nas capturas.

A validação geométrica de todas as páginas das sete amostras é documentada pelo agente principal; esta revisão visual é por amostragem e não afirma inspeção humana de cada uma das 52 páginas do caso adversarial. Impressão física permanece pendente.

### Correção editorial adicional

A revisão do principal identificou P1 no documento extenso: serviços que cabiam completos na área útil de uma nova página eram fragmentados apenas para ocupar a sobra da página anterior. A revisão visual inicial de QA havia observado a continuação, mas não distinguido esse caso de linhas realmente maiores que uma página. A conclusão de ausência de corte crítico foi reaberta. O agente PDF ajustará a paginação para levar esses serviços inteiros à página seguinte, reservando fragmentação às linhas efetivamente maiores que uma página e identificando sua continuação. Nova inspeção editorial pendente; os sete grupos E2E de interface permanecem aprovados.

### Segunda inspeção após correção da paginação

Inspecionadas as renderizações finais do orçamento extenso (página 10 e última de 21): serviços 42–46 e 97–100 permanecem inteiros por linha, com sobra preenchida por linhas vazias, sem fragmentação por falta de espaço residual. O caso realmente maior que uma página mantém o texto completo e mostra “Continuação do serviço”, sem repetir valores monetários. P1 resolvido nas amostras inspecionadas.

A recaptura somente por leitura (`--capturas`) concluiu com código 0, sem salvar documentos/empresa; confirmou endpoint PDF 200, MIME `application/pdf` e assinatura `%PDF`, salvando a resposta privada em `.tmp/pedido-comercial-real.pdf`. As capturas aguardam marca carregada, imagens, fim de animações finitas, retiram o foco do campo e voltam ao início da página: sidebar alinhada ao topo e link de pular conteúdo não exposto por foco residual.

Review final do cabeçalho sem logo: mínimo reduzido de 98 para 52 pontos, nome destacado sem espaço desnecessário; simples-sem-logo permanece uma página com tabela ampla. O caso extremo final tem 47 páginas, conserva a marca de continuação e total/assinatura na última, sem colisão. Refinamento aprovado na inspeção visual. Após a build final, `--capturas` foi executado novamente somente por leitura: seis capturas e GET do pedido real passaram com código 0. Nenhum defeito crítico permanece nas amostras revisadas.

## Reabertura de fidelidade visual — referência frontal

O usuário rejeitou a proximidade do resultado anterior e forneceu uma referência frontal mais nítida. A comparação independente confirmou diferenças de composição que a revisão anterior não havia tratado como impeditivas: cabeçalho central e empilhado, campos com divisórias abaixo de toda a linha, seleção em faixa separada, tabela retangular de traço leve e total pequeno sem preenchimento. O aceite editorial anterior não equivale a fidelidade suficiente ao modelo agora exigido.

Critérios da correção: cabeçalho horizontal com logo à esquerda e contatos/responsável à direita; redes sociais na mesma linha e slogan serifado; seleção ao lado da data; rótulos destacados seguidos de linhas de preenchimento; contorno preto arredondado único envolvendo cliente e tabela; grade preta com descrição dominante e quantidade estreita; marca d’água ampla e discreta; assinatura à esquerda e caixa cinza de total maior à direita. A identidade e os contatos permanecem dados da empresa, sem copiar os dados pessoais da referência para as amostras.

A nova inspeção aguarda as renderizações corrigidas. Não há aprovação antecipada nem agente Designer dedicado; a verificação combina revisão editorial do principal e QA independente.

### Review1 da correção de composição

A primeira renderização corrigida aproximou a composição do modelo frontal, mas foi devolvida: os rótulos Nome/CNPJ deixavam os dois-pontos numa linha isolada e os glifos de ORÇAMENTO/Nº estavam incorretos. A atividade da empresa também havia desaparecido por altura de linha herdada. O principal ainda detectou perda de observações no PDF real do caso extremo; o aceite permaneceu pendente, apesar da primeira página simples estar visualmente próxima.

### Review2 das renderizações corrigidas

Inspeção independente dos 13 PNGs finais: primeiras páginas das sete amostras e páginas intermediárias/últimas dos três documentos paginados. O pedido completo agora mostra logo à esquerda, telefone e responsável/cidade na linha superior direita, redes sociais em paralelo, slogan serifado e atividade legível. Data e seleção dividem a mesma faixa; rótulos e linhas de preenchimento, moldura arredondada única de cliente/tabela, grade preta, marca d’água ampla, assinatura e total cinza recompõem o estilo da referência frontal. Nome, CNPJ/CPF, Nº e ORÇAMENTO permanecem legíveis, sem quebra de pontuação.

Nas páginas amostradas, não há colisão entre texto, grade, total e assinatura. Os serviços extensos que cabem numa página permanecem inteiros; o serviço maior que uma página apresenta continuação e não repete valores. Quantidades fracionárias com unidade podem ocupar duas linhas na coluna estreita, mantendo leitura e divisórias. O caso com 1.999 linhas de observação continua por páginas próprias, em vez de ser truncado para caber numa página.

A inspeção visual é por amostragem e não constitui leitura humana das 76 páginas. A preservação integral dos textos e os limites geométricos são verificados separadamente pelo principal. A checagem do endpoint real após a build ainda está pendente nesta etapa; a impressão física permanece pendente. Não houve migração, alteração funcional ou cópia dos contatos reais da referência nas amostras.

### Endpoint real após a build final

`node testes/pdf-comercial-ui.mjs --capturas` terminou com código 0 na build corrigida: seis capturas foram atualizadas sem persistência, usando o mesmo pedido e a mesma conta fictícia. O GET autenticado validou HTTP 200, `application/pdf` e assinatura `%PDF`; a resposta fica no arquivo privado `.tmp/pedido-comercial-real.pdf`.

O principal confirmou na extração do PDF real a preservação das 1.999 linhas A e do marcador AB, além dos blocos de 500 W e 250 X. Isso cobre o defeito de observação cortada que a imagem da primeira página, isoladamente, não demonstrava. Com atividade do cabeçalho restaurada, rótulos/glifos corrigidos, composição inspecionada e endpoint validado, não há bloqueio crítico nas amostras revistas. A impressão física continua pendente.

## Nome opcional e logo ampliada

Verificação pelo responsável: nome vazio/omitido aceito na validação compartilhada, limite de150caracteres mantido e atualização restrita à empresa do contexto. Campo omitido preserva o nome existente; nome vazio remove nome e atividade do bloco da logo no PDF. A logo cresce proporcionalmente de145×56 para145×90pontos; sem logo não há texto substituto.

196 testes unitários, lint, typecheck e build aprovados. O teste no navegador confirmou campo sem obrigatoriedade, instrução acessível, payload vazio e feedback de sucesso; PUT interceptado para não alterar a empresa, com GET posterior confirmando preservação. Axe sem violações nas regras selecionadas. As primeiras tentativas deste roteiro usavam contexto implícito do navegador, incompatível com axe; o contexto explícito corrigiu o roteiro, sem alteração do produto. Não houve nova migration.

A oitava amostra `orcamento-somente-logo.pdf` foi renderizada e inspecionada: logo maior, ausência de nome/descrição, contatos preservados e sem colisão no cabeçalho. Verificador estrutural aprovou as77páginas dos oito exemplos, incluindo preservação de texto no caso extremo.

## Alinhamento do cabeçalho

Responsável, cidade, redes sociais e slogan agora têm uma origem comum à esquerda. O telefone opcional permanece na coluna direita. O responsável principal inspecionou o recorte real da amostra sem nome/telefone e a página completa com todos os contatos: sem sobreposição ou cortes. Dados das evidências são fictícios.

Lint, 196 testes unitários, typecheck e build aprovados. Os oito PDFs foram renderizados novamente; o verificador estrutural aprovou as 77 páginas. Sem alteração de schema, autenticação ou cálculos.

O GET autenticado do PDF na build atual passou (HTTP 200, application/pdf e assinatura %PDF). A etapa posterior de capturas de telas atingiu timeout na espera de prontidão da primeira página; não foi concluída nesta revisão. A conferência visual do cabeçalho foi realizada nos PDFs renderizados.
