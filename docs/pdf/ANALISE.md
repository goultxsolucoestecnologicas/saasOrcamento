# Análise anterior à implementação

Referência principal: fotografia fornecida pelo usuário, preservada localmente em `docs/referencias/formulario-fisico.png` e ignorada pelo Git por conter contatos reais. O documento tem cabeçalho delimitado, logo à esquerda, contatos/responsável/redes/slogan à direita; seleção Pedido/Orçamento; data e cinco linhas compactas de cliente; tabela gradeada de quatro colunas com quantidade estreita, descrição ampla e preços à direita; logo central clara; assinatura à esquerda e total em caixa à direita. Dados impressos são referência, não conteúdo do produto. A identificação da gráfica no rodapé não pertence à empresa e não será copiada.

| Área      | Implementação anterior                                          | Mudança necessária                                                                 |
| --------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Empresa   | Nome, telefone e logo                                           | Identidade comercial opcional sem rótulos vazios                                   |
| Documento | Situação e data de criação                                      | Tipo independente e emissão histórica date-only; fallback para registros antigos   |
| Cliente   | Nome, telefone, endereço, cidade, CPF/CNPJ e observações        | Reutilizar; adicionar número e inscrição estadual; compactar linhas                |
| Tabela    | Quatro colunas, paginação estimada e bordas                     | Grade comercial, espaço reservado para poucos itens, watermark e paginação robusta |
| Rodapé    | Resumo de valores, sem assinatura                               | Assinatura separada e total destacado na última página                             |
| Segurança | Serviços escopados, logo privada, endpoint autenticado no-store | Preservar; nenhuma URL/arquivo arbitrário recebido do cliente                      |

Persistência atual: Prisma 7 e Supabase PostgreSQL, `empresa`, `orcamento`, `orcamento_item`; dinheiro em centavos, quantidades em milésimos e valores persistidos calculados no backend. Fluxos de criação/edição compartilham validação Zod e wizard; configurações atualizam empresa/logo. Campos adicionais opcionais serão aditivos; emissão de registros antigos será derivada da criação em São Paulo, sem mudar dados históricos. Não haverá alteração de cálculos, autorização ou cadastro.

Revisão: não existe agente Designer configurado; revisão editorial estruturada pelo responsável e QA independente, comparando fotografia e PDFs renderizados. Evidências serão geradas com dados fictícios.
