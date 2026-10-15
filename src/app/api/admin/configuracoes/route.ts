import {
  buscarConfiguracaoAdmin,
  atualizarConfiguracaoAdmin,
} from "@/servicos/admin";
import { responderAdmin, escreverAdmin } from "@/bibliotecas/admin-api";
export async function GET() {
  return responderAdmin(buscarConfiguracaoAdmin);
}
export async function PUT(r: Request) {
  return escreverAdmin(r, atualizarConfiguracaoAdmin);
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
