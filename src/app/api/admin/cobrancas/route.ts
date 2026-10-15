import { listarCobrancasAdmin, criarCobrancaAdmin } from "@/servicos/admin";
import { responderAdmin, escreverAdmin } from "@/bibliotecas/admin-api";
export async function GET(r: Request) {
  return responderAdmin(() =>
    listarCobrancasAdmin(new URL(r.url).searchParams),
  );
}
export async function POST(r: Request) {
  return escreverAdmin(r, criarCobrancaAdmin, 201);
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
