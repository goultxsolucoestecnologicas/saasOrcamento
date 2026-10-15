import { obterDestinoAcesso } from "@/bibliotecas/destino-acesso";
import { responderApi } from "@/bibliotecas/respostas-api";
export const dynamic = "force-dynamic";
export async function GET() {
  return responderApi(obterDestinoAcesso);
}
