# Design system de orçamentos

CONCEITO: preencher serviços, conferir valores e salvar sem perder contexto.
PÚBLICO: prestadores de serviços que trabalham principalmente pelo celular.
REFERÊNCIA: docs/referencias/prototipo-orcamentos.png; preservar marca por empresa.
DIREÇÃO: Utilitarian Tool adaptada ao protótipo claro; variância3/movimento2/densidade6.

## Tokens

Tipografia: Arial/Helvetica/sans-serif,400/600/700; sem download de fontes.
Escala:12/14/16/20/24px; título24/1.25, corpo14/1.5; labels13/1.4.
Valores: tabular-nums, alinhamento à direita; total24px/700.
Cores: fundo#f4f7f7, superfície#ffffff, texto#14282c, secundário#52676d.
Primária#008482, hover#006b69, seleção#e5f5f3; derivadas do protótipo.
Bordas: painel#dbe4e6, campos#809398,1px; foco#006b69,2px,offset3px.
Erro#b42318/fundo#fff1f0, sucesso#006b69/fundo#e5f5f3.
Raios: campos/botões6px, painéis10px, diálogos12px.
Sombra: somente camadas flutuantes0 12px 32px rgba(20,40,44,.15).
Espaço:4/8/12/16/24/32px; grupo12px, seção24px.
Controle: altura44px; ícones18px; descrição serviço flexível; texto dos campos16px mobile.
Motion:150ms feedback,200ms diálogo; ease-out; sem scroll reveal.
Reduced-motion: desativar animações/transições, conservar feedback textual.

## Composição

Mobile: cabeçalho64px com menu modal, wizard cliente/itens/revisão, uma coluna.
Desktop>=1024: sidebar216px;>=1440 sidebar232px; marca com quebra de linha.
Formulário desktop: conteúdo minmax(0,3fr) e resumo minmax(240px,1fr),gap24px.
Tablet768: menu mobile; campos2colunas, serviços cards; resumo compacto.
Itens>=1024: linhas de descrição/quantidade/unidade/preço/total/ações; até2linhas descrição.
Resumo: total é ponto focal; subtotal/desconto secundários; valores inválidos mostram indicação, não zero falso.
Ações: barra no fluxo após o conteúdo, com resumo compacto mobile; não sobrepor campos ou teclado. Resumo lateral sticky somente>=1280px.
Diálogos: viewport-32px,max-height calc(100dvh-32px),overflowauto; foco gerido por Radix.

## Compromissos

1. Total e ação de salvar orientam a tarefa; títulos não competem com valores.
2. Barra de ações encerra o conteúdo com total e próxima etapa, sem sobrepor campos.
3. Verde-petróleo se repete em navegação ativa, ação principal e total, sem decoração.
4. Formulário e resumo3:1; densidade concentrada nos serviços, não nos dados cadastrais.
5. Documento PDF mantém apresentação de papel preto/branco, exceção à paleta do app.

## Estados e limites

Default/hover/foco/pressionado/disabled/loading/erro/sucesso implementados.
Erro de submissão: AlertDialog+campo associado; foco no primeiro erro, dados preservados.
Erro durante digitação: inline; sucesso: Sonner; confirmação destrutiva: AlertDialog.
Loading representativo somente durante espera real; erro nunca aparece como vazio/loading infinito.
Sem cliente/catálogo novo, pagamentos, gráficos, texturas decorativas ou mudança de cálculos.
Remoção de logo remoto não existe no contrato: permitir apenas descartar seleção ainda não enviada.
WCAG2.2AA é alvo;axe/teclado/contraste e viewports verificáveis, sem alegar certificação integral.
