export interface EmpresaUi {
  idEmpresa: string;
  nome: string;
  telefone: string | null;
  logoChave: string | null;
  descricaoAtividade?: string | null;
  nomeResponsavel?: string | null;
  cidade?: string | null;
  estado?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  slogan?: string | null;
}
export interface ItemUi {
  descricao: string;
  unidade: string;
  quantidadeMilesimos: number;
  valorUnitarioCentavos: number;
  subtotalCentavos?: number;
}
export interface OrcamentoUi {
  idOrcamento: string;
  numero: number;
  situacao: string;
  clienteNome: string;
  clienteTelefone: string | null;
  clienteEndereco: string | null;
  clienteCidade: string | null;
  clienteDocumento: string | null;
  clienteNumeroEndereco?: string | null;
  clienteInscricaoEstadual?: string | null;
  tipoDocumento?: "ORCAMENTO" | "PEDIDO";
  dataEmissao?: string | null;
  observacoes: string | null;
  validadeDias: number | null;
  descontoTipo: "FIXO" | "PERCENTUAL";
  descontoValor: number;
  subtotalCentavos: number;
  totalCentavos: number;
  dataCriacao: string;
  itens: ItemUi[];
}
export interface PaginaOrcamentosUi {
  orcamentos: OrcamentoUi[];
  proximoNumero: number | null;
}
export class ErroRequisicao extends Error {
  constructor(
    mensagem: string,
    public readonly campos: { campo: string; mensagem: string }[] = [],
    public readonly status?: number,
  ) {
    super(mensagem);
  }
}
export async function requisitar<T>(
  url: string,
  opcoes?: RequestInit,
): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(url, { ...opcoes, cache: "no-store" });
  } catch (erro) {
    if (erro instanceof Error && erro.name === "AbortError") throw erro;
    throw new ErroRequisicao(
      "Não foi possível conectar. Verifique sua conexão e tente novamente.",
    );
  }
  const corpo = await resposta
    .json()
    .then((valor) =>
      valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {},
    )
    .catch(() => ({}));
  if (resposta.status === 401) {
    // Recarrega após expirar a sessão para descartar o estado privado.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/entrar");
  }
  if (!resposta.ok)
    throw new ErroRequisicao(
      typeof corpo.erro === "string"
        ? corpo.erro
        : "Não foi possível concluir a operação. Tente novamente.",
      Array.isArray(corpo.campos)
        ? corpo.campos.filter(
            (c: { campo?: unknown; mensagem?: unknown }) =>
              c !== null &&
              typeof c === "object" &&
              typeof c.campo === "string" &&
              typeof c.mensagem === "string",
          )
        : [],
      resposta.status,
    );
  return corpo.dados as T;
}
export const reais = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    valor / 100,
  );
export function decimalInteiro(texto: string, casas: number): number {
  const limpo = texto.trim();
  if (
    limpo.includes(",") &&
    !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(limpo)
  )
    throw new Error("Informe um número válido.");
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const partes = normalizado.match(/^(\d+)(?:\.(\d+))?$/);
  if (!partes || (partes[2]?.length ?? 0) > casas)
    throw new Error(
      `Informe um valor positivo com até ${casas} casas decimais.`,
    );
  const valor =
    Number(partes[1]) * 10 ** casas +
    Number((partes[2] || "").padEnd(casas, "0"));
  if (!Number.isSafeInteger(valor))
    throw new Error("Valor acima do limite permitido.");
  return valor;
}
export const decimalTexto = (valor: number, casas: number) =>
  `${Math.floor(valor / 10 ** casas)},${String(valor % 10 ** casas).padStart(casas, "0")}`;
