import { criarOrcamento, listarOrcamentos } from "@/servicos/orcamentos";
import { ErroDominio } from "@/bibliotecas/erro-dominio";
import {
  lerJsonLimitado,
  responderApi,
  verificarOrigem,
} from "@/bibliotecas/respostas-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(requisicao: Request) {
  return responderApi(async () => {
    const parametros = new URL(requisicao.url).searchParams;
    const cursor = parametros.get("antesDeNumero");
    if (
      parametros.getAll("antesDeNumero").length > 1 ||
      (cursor !== null && !/^\d+$/.test(cursor))
    )
      throw new ErroDominio("Cursor de paginação inválido.");
    return listarOrcamentos(
      parametros.get("busca") ?? "",
      cursor === null ? undefined : Number(cursor),
    );
  });
}
export async function POST(requisicao: Request) {
  return responderApi(async () => {
    verificarOrigem(requisicao);
    return criarOrcamento(await lerJsonLimitado(requisicao));
  }, 201);
}
