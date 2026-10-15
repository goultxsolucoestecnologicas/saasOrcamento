import {
  buscarAssinanteAdmin,
  atualizarAssinanteAdmin,
} from "@/servicos/admin";
import { responderAdmin, escreverAdmin } from "@/bibliotecas/admin-api";
type Contexto = { params: Promise<{ id: string }> };
export async function GET(r: Request, c: Contexto) {
  return responderAdmin(async () => buscarAssinanteAdmin((await c.params).id));
}
export async function PUT(r: Request, c: Contexto) {
  return escreverAdmin(r, async (d) =>
    atualizarAssinanteAdmin((await c.params).id, d),
  );
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
