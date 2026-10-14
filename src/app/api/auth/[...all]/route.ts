export const runtime = "nodejs";
// Contratos legados não aceitam mais sessões do provedor anterior.
export function GET() {
  return new Response(null, { status: 410 });
}
export function POST() {
  return new Response(null, { status: 410 });
}
