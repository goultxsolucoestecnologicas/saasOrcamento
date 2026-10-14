import { toNextJsHandler } from "better-auth/next-js";
import { obterAutenticacao } from "@/bibliotecas/autenticacao";

export const runtime = "nodejs";

export async function GET(requisicao: Request) {
  return toNextJsHandler(obterAutenticacao()).GET(requisicao);
}

export async function POST(requisicao: Request) {
  return toNextJsHandler(obterAutenticacao()).POST(requisicao);
}
