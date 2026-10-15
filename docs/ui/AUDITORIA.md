# Auditoria inicial UI/UX

Data:14/10/2026. Base:t12-validacao-supabase. Rotas e componentes examinados:login, estrutura/layout, listagem/busca/paginação, novo/edição, detalhes/PDF, configurações/logo; tokens, Button/shadcn, cálculos, validação, respostas API e PWA. Referência:docs/referencias/prototipo-orcamentos.png e capturas reais da rodada anterior.

Primeira impressão em cinco segundos: o orçamento é identificável, mas cada serviço consome altura demais e as ações competem com os campos.

| Prioridade | Problema observado                                                                    | Consequência / correção prevista                                                     |
| ---------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| P1         | Zod é reduzido a mensagem genérica; erro apenas no topo, sem aria-invalid/foco        | Erros estruturados aditivos, AlertDialog e associação por campo; preservar entrada   |
| P1         | GET falho em edição libera campos vazios; detalhe/config mantêm carregando após falha | Estado de erro explícito com retry; impedir edição/salvamento sem carga válida       |
| P1         | Exclusão pede confirmação inline sem diálogo/foco                                     | AlertDialog de confirmação com ação inicial segura                                   |
| P2         | Preview valida nome/descrição e mostra zero ao preencher itens                        | Separar estimativa monetária da validação cadastral usando cálculos existentes       |
| P2         | Cards de serviços altos no desktop                                                    | Linhas editáveis alinhadas, cards compactos mobile e duplicação local                |
| P2         | Navegação ativa só no caminho exato; cabeçalho mobile longo                           | Menu móvel acessível, hierarquia e ativo para detalhes/edição                        |
| P2         | Botões40px/campos42px; sem estado padrão de foco/pressionado/loading                  | Alvos44px, loading reutilizável, estados semânticos e movimento reduzido             |
| P2         | Carregamento em texto sem skeleton; erro de listagem pode parecer vazio               | Skeletons representativos sem delays e erro distinto de vazio                        |
| P2         | Upload nativo sem preview da seleção/estado dedicado                                  | Logo compacta, alterar imagem e descartar seleção pendente; sem exclusão remota nova |
| P3         | Status em minúsculas cruas, sucesso inline, texto técnico da estimativa               | Rótulos pt-BR, Sonner e microcopy operacional                                        |

Preservar:identidade petróleo/branco, marca por empresa, wizard cliente/itens/revisão, cálculos BigInt e payloads em centavos/milésimos, autorização Supabase/tenant, paginação e busca, PDF/compartilhamento e armazenamento privado.

Direção: ferramenta operacional compacta, adaptada do Utilitarian Tool/Density-First ao protótipo claro. Público:prestadores de serviços que orçam pelo celular. Conceito: preencher, conferir o total e salvar sem perder contexto. Variância3/movimento2/densidade6; desktop conteúdo:resumo=3:1, mobile uma coluna. Nenhum marketing, gráfico decorativo, animação contínua ou cliente/catalogo novo.

Validação final:360x800,390x844,768x1024,1024x768,1440x900; teclado/foco/AlertDialog, estado de rede lenta controlado no teste, zero overflow, upload e Zod, isolamento, unitários/lint/TS/build e E2E. Não existe Designer configurado: revisão visual estruturada do responsável + duas rodadas de QA independente; não alegar revisão por Designer.
