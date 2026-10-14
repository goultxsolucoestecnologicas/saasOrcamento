import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(requisicao: NextRequest) {
  let resposta = NextResponse.next({ request: requisicao });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave)
    throw new Error("Configuração pública do Supabase ausente.");
  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => requisicao.cookies.getAll(),
      setAll: (valores) => {
        for (const { name, value } of valores)
          requisicao.cookies.set(name, value);
        resposta = NextResponse.next({ request: requisicao });
        for (const { name, value, options } of valores)
          resposta.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getClaims();
  resposta.headers.set("Cache-Control", "private, no-store");
  return resposta;
}

export const config = {
  matcher: [
    "/entrar",
    "/orcamentos/:path*",
    "/configuracoes/:path*",
    "/api/empresa/:path*",
    "/api/orcamentos/:path*",
  ],
};
