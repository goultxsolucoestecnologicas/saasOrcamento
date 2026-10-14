"use client";
import { useState } from "react";
import { entrarComSenha } from "@/bibliotecas/autenticacao-cliente";
import { Button } from "@/componentes/ui/button";
export default function Entrar() {
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  return (
    <main className="entrada">
      <form
        className="painel"
        onSubmit={async (e) => {
          e.preventDefault();
          setOcupado(true);
          setErro("");
          const dados = new FormData(e.currentTarget);
          try {
            await entrarComSenha(
              String(dados.get("email")),
              String(dados.get("senha")),
            );
            // Recarrega o contexto autenticado sem reutilizar cache da sessão anterior.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign("/orcamentos");
          } catch (e) {
            setErro(e instanceof Error ? e.message : "Falha ao entrar.");
          } finally {
            setOcupado(false);
          }
        }}
      >
        <span className="sobretitulo">Orçamentos</span>
        <h1>Entre na sua empresa</h1>
        <p className="texto-secundario">
          Acesse seus orçamentos e configurações.
        </p>
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          Senha
          <input
            name="senha"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
        <Button type="submit" disabled={ocupado} className="w-full">
          {ocupado ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </main>
  );
}
