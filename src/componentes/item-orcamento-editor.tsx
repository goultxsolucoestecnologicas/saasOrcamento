"use client";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { CampoFormulario } from "@/componentes/feedback";
import { calcularSubtotalItem } from "@/funcionalidades/orcamentos/calculos";
import { decimalInteiro, reais } from "@/bibliotecas/api-cliente";

export type ItemFormulario = {
  chave: string;
  descricao: string;
  unidade: string;
  quantidade: string;
  valor: string;
};
export function idCampoItem(chave: string, campo: string) {
  return `item-${chave}-${campo}`;
}
export function subtotalItemFormulario(item: ItemFormulario): number | null {
  try {
    return calcularSubtotalItem(
      decimalInteiro(item.quantidade, 3),
      decimalInteiro(item.valor, 2),
    );
  } catch {
    return null;
  }
}
export function ItemOrcamentoEditor({
  item,
  indice,
  erros,
  ocupado,
  podeDuplicar,
  aoAlterar,
  aoValidar,
  aoDuplicar,
  aoRemover,
}: {
  item: ItemFormulario;
  indice: number;
  erros: Record<string, string>;
  ocupado: boolean;
  podeDuplicar: boolean;
  aoAlterar: (campo: keyof ItemFormulario, valor: string) => void;
  aoValidar: (campo: string) => void;
  aoDuplicar: () => void;
  aoRemover: () => void;
}) {
  const subtotal = subtotalItemFormulario(item);
  const prefixo = `itens.${indice}.`;
  return (
    <div
      className="item-editor"
      role="group"
      aria-label={`Serviço ${indice + 1}`}
    >
      <div className="item-descricao">
        <CampoFormulario
          id={idCampoItem(item.chave, "descricao")}
          rotulo={`Descrição do serviço ${indice + 1}`}
          obrigatorio
          erro={erros[`${prefixo}descricao`]}
        >
          <input
            value={item.descricao}
            maxLength={500}
            disabled={ocupado}
            onChange={(e) => aoAlterar("descricao", e.target.value)}
            onBlur={() => aoValidar(`${prefixo}descricao`)}
          />
        </CampoFormulario>
      </div>
      <div className="item-quantidade">
        <CampoFormulario
          id={idCampoItem(item.chave, "quantidadeMilesimos")}
          rotulo="Quantidade"
          obrigatorio
          erro={erros[`${prefixo}quantidadeMilesimos`]}
        >
          <input
            inputMode="decimal"
            value={item.quantidade}
            disabled={ocupado}
            onChange={(e) => aoAlterar("quantidade", e.target.value)}
            onBlur={() => aoValidar(`${prefixo}quantidadeMilesimos`)}
          />
        </CampoFormulario>
      </div>
      <div className="item-unidade">
        <CampoFormulario
          id={idCampoItem(item.chave, "unidade")}
          rotulo="Unidade"
          erro={erros[`${prefixo}unidade`]}
        >
          <select
            value={item.unidade}
            disabled={ocupado}
            onChange={(e) => aoAlterar("unidade", e.target.value)}
          >
            {[
              ...new Set([
                "m²",
                "m",
                "un",
                "h",
                "dia",
                "serviço",
                item.unidade,
              ]),
            ].map((unidade) => (
              <option key={unidade}>{unidade}</option>
            ))}
          </select>
        </CampoFormulario>
      </div>
      <div className="item-valor">
        <CampoFormulario
          id={idCampoItem(item.chave, "valorUnitarioCentavos")}
          rotulo="Valor unitário (R$)"
          obrigatorio
          erro={erros[`${prefixo}valorUnitarioCentavos`]}
        >
          <input
            inputMode="decimal"
            value={item.valor}
            disabled={ocupado}
            onChange={(e) => aoAlterar("valor", e.target.value)}
            onBlur={() => aoValidar(`${prefixo}valorUnitarioCentavos`)}
          />
        </CampoFormulario>
      </div>
      <div className="item-total">
        <span>Total do item</span>
        <strong>{subtotal === null ? "—" : reais(subtotal)}</strong>
      </div>
      <div className="item-acoes">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={ocupado || !podeDuplicar}
          aria-label={`Duplicar serviço ${indice + 1}`}
          title="Duplicar serviço"
          onClick={aoDuplicar}
        >
          <Copy />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={ocupado}
          aria-label={`Remover serviço ${indice + 1}`}
          title="Remover serviço"
          onClick={aoRemover}
        >
          <Trash2 className="text-destructive" />
        </Button>
      </div>
    </div>
  );
}
