import { buscarResumoAdmin } from "@/servicos/admin";
import { responderAdmin } from "@/bibliotecas/admin-api";
export async function GET() {
  return responderAdmin(buscarResumoAdmin);
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
