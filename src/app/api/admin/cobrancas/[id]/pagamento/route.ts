import { confirmarPagamentoAdmin } from "@/servicos/admin";
import { escreverAdmin } from "@/bibliotecas/admin-api";
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  return escreverAdmin(r, async (d) =>
    confirmarPagamentoAdmin((await c.params).id, d),
  );
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
