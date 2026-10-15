import { listarAssinantesAdmin } from "@/servicos/admin";
import { criarAssinanteAdmin } from "@/servicos/admin-convites";
import { responderAdmin, escreverAdmin } from "@/bibliotecas/admin-api";
export async function GET(r: Request) {
  return responderAdmin(() =>
    listarAssinantesAdmin(new URL(r.url).searchParams),
  );
}
export async function POST(r: Request) {
  return escreverAdmin(r, criarAssinanteAdmin, 201);
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
