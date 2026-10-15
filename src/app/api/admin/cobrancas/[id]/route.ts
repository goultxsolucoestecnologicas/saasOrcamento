import { atualizarCobrancaAdmin } from "@/servicos/admin";
import { escreverAdmin } from "@/bibliotecas/admin-api";
export async function PATCH(
  r: Request,
  c: { params: Promise<{ id: string }> },
) {
  return escreverAdmin(r, async (d) =>
    atualizarCobrancaAdmin((await c.params).id, d),
  );
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
