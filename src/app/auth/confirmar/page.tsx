"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { obterAutenticacaoCliente } from "@/bibliotecas/autenticacao-cliente";

export default function ConfirmarConvite() {
  const iniciou = useRef(false);
  const [erro, setErro] = useState("");
  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;
    const parametros = new URLSearchParams(window.location.search);
    const fragmento = new URLSearchParams(window.location.hash.slice(1));
    const token = parametros.get("token_hash");
    const tipo = parametros.get("type");
    // Remove imediatamente os tokens da barra e do histórico, sem os registrar.
    window.history.replaceState(null, "", "/auth/confirmar");
    void (async () => {
      const auth = obterAutenticacaoCliente().auth;
      if (token && (tipo === "invite" || tipo === "recovery")) {
        const { error } = await auth.verifyOtp({
          token_hash: token,
          type: tipo,
        });
        if (error) throw new Error();
      } else if (
        fragmento.get("access_token") &&
        fragmento.get("refresh_token")
      ) {
        const { error } = await auth.setSession({
          access_token: fragmento.get("access_token")!,
          refresh_token: fragmento.get("refresh_token")!,
        });
        if (error) throw new Error();
      } else throw new Error();
      const { data, error } = await auth.getUser();
      if (error || !data.user) throw new Error();
      window.location.replace("/definir-senha");
    })().catch(() =>
      setErro(
        "Este convite é inválido ou expirou. Solicite um novo convite ao administrador.",
      ),
    );
  }, []);
  return (
    <main className="entrada">
      <section className="painel">
        <h1>Confirmação de acesso</h1>
        {erro ? (
          <>
            <p role="alert">{erro}</p>
            <Link href="/entrar">Voltar para entrar</Link>
          </>
        ) : (
          <p role="status">Validando seu convite…</p>
        )}
      </section>
    </main>
  );
}
