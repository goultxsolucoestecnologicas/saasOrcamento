import { alterarUsuarioAdmin } from "@/servicos/admin";
import { escreverAdmin } from "@/bibliotecas/admin-api";
export async function PATCH(
  r: Request,
  c: { params: Promise<{ id: string; idUsuario: string }> },
) {
  return escreverAdmin(r, async (d) => {
    const p = await c.params;
    return alterarUsuarioAdmin(p.id, p.idUsuario, d);
  });
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
