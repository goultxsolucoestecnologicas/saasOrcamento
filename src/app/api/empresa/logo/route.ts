import { buscarLogoEmpresa, salvarLogoEmpresa } from "@/servicos/logos";
import {
  cabecalhosPrivados,
  lerLogoMultipart,
  responderApi,
  responderErroApi,
  verificarOrigem,
} from "@/bibliotecas/respostas-api";
import { ErroDominio } from "@/bibliotecas/erro-dominio";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logo = await buscarLogoEmpresa();
    if (!logo) throw new ErroDominio("Logo não encontrada.", 404);
    return new Response(new Uint8Array(logo.conteudo), {
      headers: {
        ...cabecalhosPrivados,
        "Content-Type": logo.tipo,
        "Content-Length": String(logo.conteudo.length),
      },
    });
  } catch (erro) {
    return responderErroApi(erro);
  }
}
export async function POST(requisicao: Request) {
  return responderApi(async () => {
    verificarOrigem(requisicao);
    return salvarLogoEmpresa(await lerLogoMultipart(requisicao));
  }, 201);
}
