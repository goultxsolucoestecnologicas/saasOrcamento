export interface EmpresaUi {
  idEmpresa: string;
  nome: string;
  telefone: string | null;
  logoChave: string | null;
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
export async function requisitar<T>(
  url: string,
  opcoes?: RequestInit,
): Promise<T> {
  const resposta = await fetch(url, { ...opcoes, cache: "no-store" });
  const corpo = await resposta.json();
  if (resposta.status === 401) {
    // Recarrega após expirar a sessão para descartar o estado privado.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/entrar");
  }
  if (!resposta.ok)
    throw new Error(corpo.erro || "Não foi possível concluir a operação.");
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
