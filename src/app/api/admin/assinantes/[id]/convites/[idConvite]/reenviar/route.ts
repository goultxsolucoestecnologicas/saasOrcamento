import { enviarConviteAdmin } from "@/servicos/admin-convites";
import { escreverAdmin } from "@/bibliotecas/admin-api";
export async function POST(
  r: Request,
  c: { params: Promise<{ id: string; idConvite: string }> },
) {
  return escreverAdmin(r, async () => {
    const p = await c.params;
    return enviarConviteAdmin(p.id, p.idConvite);
  });
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
