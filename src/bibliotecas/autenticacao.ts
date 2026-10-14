import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { obterAmbiente } from "@/bibliotecas/ambiente";

export async function obterAutenticacao() {
  const armazenamento = await cookies();
  const ambiente = obterAmbiente();
  return createServerClient(
    ambiente.NEXT_PUBLIC_SUPABASE_URL,
    ambiente.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => armazenamento.getAll(),
        setAll: (valores) => {
          // Server Components são somente leitura; o proxy persiste a renovação.
          for (const { name, value, options } of valores) {
            try {
              armazenamento.set(name, value, options);
            } catch {}
          }
        },
      },
    },
  );
}

export async function obterIdentidadeVerificada(): Promise<string | null> {
  const supabase = await obterAutenticacao();
  // Verificação remota. Nunca autorizar por getSession ou user_metadata.
  const { data, error } = await supabase.auth.getUser();
  return error ? null : (data.user?.id ?? null);
}
