import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ErroAdministracao } from "./admin-erros";

export type IdentidadeSupabase = Readonly<{
  id: string;
  email: string;
  emailVerificado: boolean;
}>;
export type VerificarIdentidadeSupabase = (
  idAutenticacao: string,
) => Promise<IdentidadeSupabase>;

export async function verificarIdentidadeSupabase(
  idAutenticacao: string,
): Promise<IdentidadeSupabase> {
  const id = z.uuid().safeParse(idAutenticacao);
  if (!id.success)
    throw new ErroAdministracao(
      "Identificador de autenticação Supabase inválido.",
    );
  const endereco = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const segredo =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!endereco || !segredo)
    throw new ErroAdministracao(
      "Provisionamento bloqueado: configure NEXT_PUBLIC_SUPABASE_URL e uma chave administrativa Supabase somente no ambiente do servidor.",
    );
  let url: URL;
  try {
    url = new URL(endereco);
  } catch {
    throw new ErroAdministracao(
      "Configuração administrativa Supabase inválida.",
    );
  }
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new ErroAdministracao(
      "A URL administrativa Supabase deve utilizar HTTPS.",
    );
  try {
    const cliente = createClient(url.origin, segredo, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (entrada, configuracao) =>
          fetch(entrada, {
            ...configuracao,
            signal: AbortSignal.timeout(15_000),
          }),
      },
    });
    const { data, error } = await cliente.auth.admin.getUserById(id.data);
    if (
      error ||
      !data.user ||
      data.user.id !== id.data ||
      !data.user.email ||
      !z.email().safeParse(data.user.email).success
    )
      throw new Error();
    return {
      id: data.user.id,
      email: data.user.email.toLowerCase(),
      emailVerificado: Boolean(data.user.email_confirmed_at),
    };
  } catch {
    throw new ErroAdministracao(
      "Não foi possível verificar a identidade Supabase. Confirme o UUID, a configuração administrativa e a conexão.",
    );
  }
}
