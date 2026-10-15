import { listarVencimentosAdmin } from "@/servicos/admin";
import { responderAdmin } from "@/bibliotecas/admin-api";
export async function GET(r: Request) {
  return responderAdmin(() =>
    listarVencimentosAdmin(new URL(r.url).searchParams),
  );
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
