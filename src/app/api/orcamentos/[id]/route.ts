import {
  atualizarOrcamento,
  buscarOrcamento,
  excluirOrcamento,
} from "@/servicos/orcamentos";
import {
  lerJsonLimitado,
  responderApi,
  verificarOrigem,
} from "@/bibliotecas/respostas-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Parametros = { params: Promise<{ id: string }> };

export async function GET(_requisicao: Request, parametros: Parametros) {
  return responderApi(async () =>
    buscarOrcamento((await parametros.params).id),
  );
}
export async function PUT(requisicao: Request, parametros: Parametros) {
  return responderApi(async () => {
    verificarOrigem(requisicao);
    return atualizarOrcamento(
      (await parametros.params).id,
      await lerJsonLimitado(requisicao),
    );
  });
}
export async function DELETE(requisicao: Request, parametros: Parametros) {
  return responderApi(async () => {
    verificarOrigem(requisicao);
    return excluirOrcamento((await parametros.params).id);
  });
}
