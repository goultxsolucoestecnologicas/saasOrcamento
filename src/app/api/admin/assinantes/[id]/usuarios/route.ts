import { adicionarUsuarioAdmin } from "@/servicos/admin-convites";
import { escreverAdmin } from "@/bibliotecas/admin-api";
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  return escreverAdmin(
    r,
    async (d) => adicionarUsuarioAdmin((await c.params).id, d),
    201,
  );
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
