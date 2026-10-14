import { ErroDominio } from "@/bibliotecas/erro-dominio";
import {
  esquemaOrcamento,
  type OrcamentoEntrada,
} from "@/validacoes/orcamento";

const limiteCentavos = 2_147_483_647n;
function conferirLimite(valor: bigint): number {
  if (valor < 0n || valor > limiteCentavos)
    throw new ErroDominio(
      "O valor calculado ultrapassa o limite permitido para um orçamento.",
    );
  return Number(valor);
}

export function calcularSubtotalItem(
  quantidadeMilesimos: number,
  valorUnitarioCentavos: number,
): number {
  if (
    !Number.isSafeInteger(quantidadeMilesimos) ||
    quantidadeMilesimos < 1 ||
    quantidadeMilesimos > 100_000_000 ||
    !Number.isSafeInteger(valorUnitarioCentavos) ||
    valorUnitarioCentavos < 0 ||
    valorUnitarioCentavos > 100_000_000
  ) {
    throw new ErroDominio("Quantidade ou valor unitário inválido.");
  }
  return conferirLimite(
    (BigInt(quantidadeMilesimos) * BigInt(valorUnitarioCentavos) + 500n) /
      1000n,
  );
}

export function calcularOrcamento(entrada: OrcamentoEntrada) {
  const validacao = esquemaOrcamento.safeParse(entrada);
  if (!validacao.success)
    throw new ErroDominio("Dados do orçamento inválidos.");
  const dados = validacao.data;
  const itens = dados.itens.map((item, ordem) => ({
    ...item,
    ordem,
    subtotalCentavos: calcularSubtotalItem(
      item.quantidadeMilesimos,
      item.valorUnitarioCentavos,
    ),
  }));
  const subtotal = itens.reduce(
    (soma, item) => soma + BigInt(item.subtotalCentavos),
    0n,
  );
  const subtotalCentavos = conferirLimite(subtotal);
  const desconto =
    dados.descontoTipo === "FIXO"
      ? BigInt(dados.descontoValor)
      : (subtotal * BigInt(dados.descontoValor) + 5000n) / 10_000n;
  if (desconto > subtotal)
    throw new ErroDominio("O desconto fixo não pode ser maior que o subtotal.");
  return {
    itens,
    subtotalCentavos,
    descontoCentavos: Number(desconto),
    totalCentavos: conferirLimite(subtotal - desconto),
  };
}
