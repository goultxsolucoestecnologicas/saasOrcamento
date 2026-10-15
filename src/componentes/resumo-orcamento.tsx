import { decimalInteiro, reais } from "@/bibliotecas/api-cliente";
import { calcularOrcamento } from "@/funcionalidades/orcamentos/calculos";
import { esquemaOrcamento } from "@/validacoes/orcamento";
import type { ItemFormulario } from "@/componentes/item-orcamento-editor";

export type ValoresResumo = {
  subtotalCentavos: number;
  descontoCentavos: number;
  totalCentavos: number;
};
/** A estimativa usa apenas valores; nunca substitui a validação do salvamento. */
export function calcularPreviaOrcamento(
  itens: ItemFormulario[],
  descontoTipo: "FIXO" | "PERCENTUAL",
  desconto: string,
): ValoresResumo | null {
  try {
    const entrada = esquemaOrcamento.parse({
      clienteNome: "Prévia",
      descontoTipo,
      descontoValor: decimalInteiro(desconto, 2),
      itens: itens.map((item) => ({
        descricao: "Prévia",
        unidade: "un",
        quantidadeMilesimos: decimalInteiro(item.quantidade, 3),
        valorUnitarioCentavos: decimalInteiro(item.valor, 2),
      })),
    });
    return calcularOrcamento(entrada);
  } catch {
    return null;
  }
}
export function ResumoOrcamento({
  valores,
  compacto = false,
}: {
  valores: ValoresResumo | null;
  compacto?: boolean;
}) {
  if (compacto)
    return (
      <div
        className="resumo-mobile-compacto"
        aria-live="polite"
        aria-atomic="true"
      >
        <span>Total do orçamento</span>
        <strong>{valores ? reais(valores.totalCentavos) : "—"}</strong>
      </div>
    );
  return (
    <div className="valores-resumo" aria-live="polite" aria-atomic="true">
      <div className="linha-resumo">
        <span>Subtotal</span>
        <strong>{valores ? reais(valores.subtotalCentavos) : "—"}</strong>
      </div>
      <div className="linha-resumo">
        <span>Desconto</span>
        <strong>{valores ? reais(valores.descontoCentavos) : "—"}</strong>
      </div>
      <div className="total">
        <span>Total do orçamento</span>
        <strong>{valores ? reais(valores.totalCentavos) : "—"}</strong>
      </div>
      {!valores && (
        <p className="texto-secundario">
          Confira os valores dos itens e do desconto para calcular o total.
        </p>
      )}
    </div>
  );
}
