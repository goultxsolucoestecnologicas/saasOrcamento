"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | undefined;

export function obterAutenticacaoCliente(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chavePublica)
    throw new Error(
      "A autenticação está indisponível. Tente novamente mais tarde.",
    );
  cliente = createBrowserClient(url, chavePublica);
  return cliente;
}

export async function entrarComSenha(
  email: string,
  senha: string,
): Promise<string> {
  const auth = obterAutenticacaoCliente().auth;
  const mensagem = "E-mail ou senha inválidos, ou acesso indisponível.";
  try {
    const resultado = await auth.signInWithPassword({ email, password: senha });
    if (resultado.error) throw new Error(mensagem);
  } catch {
    throw new Error(mensagem);
  }
  try {
    const acesso = await fetch("/api/acesso", { cache: "no-store" });
    if (!acesso.ok) throw new Error(mensagem);
    const corpo = await acesso.json();
    const destino = corpo?.dados?.destino;
    if (
      !["/admin", "/orcamentos", "/assinatura-indisponivel"].includes(destino)
    )
      throw new Error(mensagem);
    return destino;
  } catch {
    await auth.signOut().catch(() => undefined);
    throw new Error(mensagem);
  }
}
