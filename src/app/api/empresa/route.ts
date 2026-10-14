import { atualizarEmpresa, buscarEmpresa } from "@/servicos/empresa";
import {
  lerJsonLimitado,
  responderApi,
  verificarOrigem,
} from "@/bibliotecas/respostas-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return responderApi(buscarEmpresa);
}
export async function PUT(requisicao: Request) {
  return responderApi(async () => {
    verificarOrigem(requisicao);
    return atualizarEmpresa(await lerJsonLimitado(requisicao));
  });
}
