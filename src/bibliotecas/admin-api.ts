import "server-only";
import {
  responderApi,
  verificarOrigem,
  lerJsonLimitado,
} from "@/bibliotecas/respostas-api";
import { obterAdministradorPlataforma } from "@/bibliotecas/admin-autorizacao";
export function responderAdmin(operacao: () => Promise<unknown>, status = 200) {
  return responderApi(async () => {
    await obterAdministradorPlataforma();
    return operacao();
  }, status);
}
export function escreverAdmin(
  requisicao: Request,
  operacao: (dados: unknown) => Promise<unknown>,
  status = 200,
) {
  return responderAdmin(async () => {
    verificarOrigem(requisicao);
    return operacao(await lerJsonLimitado(requisicao));
  }, status);
}
