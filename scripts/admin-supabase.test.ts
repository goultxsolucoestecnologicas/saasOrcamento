import { test } from "node:test";
import assert from "node:assert/strict";
import { verificarIdentidadeSupabase } from "./admin-supabase";
const id = "c43b4b6c-89a1-4584-9fde-21ebfe03184f";

test("provisionamento sem chave administrativa falha antes de qualquer chamada remota", async (contexto) => {
  const segredo = process.env.SUPABASE_SECRET_KEY;
  const legado = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const chamada = contexto.mock.method(globalThis, "fetch", async () => {
    throw new Error("Chamada indevida");
  });
  try {
    await assert.rejects(
      verificarIdentidadeSupabase(id),
      /Provisionamento bloqueado/,
    );
    assert.equal(chamada.mock.callCount(), 0);
  } finally {
    if (segredo !== undefined) process.env.SUPABASE_SECRET_KEY = segredo;
    if (legado !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = legado;
  }
});

test("SDK verifica UUID e email remoto sem persistir sessão", async (contexto) => {
  const endereco = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const segredo = process.env.SUPABASE_SECRET_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto-ficticio.example";
  process.env.SUPABASE_SECRET_KEY = "chave-administrativa-somente-teste";
  contexto.mock.method(globalThis, "fetch", async (entrada: unknown) => {
    assert.equal(
      String(entrada),
      `https://projeto-ficticio.example/auth/v1/admin/users/${id}`,
    );
    return new Response(
      JSON.stringify({
        id,
        email: "ANA@example.com",
        email_confirmed_at: "2026-10-14T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
  try {
    assert.deepEqual(await verificarIdentidadeSupabase(id), {
      id,
      email: "ana@example.com",
      emailVerificado: true,
    });
  } finally {
    if (endereco === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = endereco;
    if (segredo === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = segredo;
  }
});

test("erros remotos não expõem configuração nem mensagens do provedor", async (contexto) => {
  const endereco = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const segredo = process.env.SUPABASE_SECRET_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto-ficticio.example";
  process.env.SUPABASE_SECRET_KEY = "chave-administrativa-somente-teste";
  contexto.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({ msg: "URL e segredo não devem aparecer" }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
  );
  try {
    await assert.rejects(
      verificarIdentidadeSupabase(id),
      (erro: unknown) =>
        erro instanceof Error &&
        erro.message.includes("Não foi possível verificar") &&
        !erro.message.includes("chave-administrativa") &&
        !erro.message.includes("example"),
    );
  } finally {
    if (endereco === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = endereco;
    if (segredo === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = segredo;
  }
});
