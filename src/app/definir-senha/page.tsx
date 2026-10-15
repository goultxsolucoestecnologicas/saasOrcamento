"use client";
import { useState } from "react";
import { ErrorAlertDialog, LoadingButton } from "@/componentes/feedback";
import { obterAutenticacaoCliente } from "@/bibliotecas/autenticacao-cliente";
export default function DefinirSenha() {
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  return (
    <main className="entrada">
      <form
        className="painel"
        onSubmit={async (evento) => {
          evento.preventDefault();
          setErro("");
          const dados = new FormData(evento.currentTarget);
          if (dados.get("senha") !== dados.get("confirmacao")) {
            setErro("As senhas precisam ser iguais.");
            return;
          }
          setOcupado(true);
          try {
            const resposta = await fetch("/api/acesso/senha", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ senha: dados.get("senha") }),
            });
            if (!resposta.ok)
              throw new Error(
                "Não foi possível definir sua senha. Verifique o convite e utilize uma senha forte com pelo menos 12 caracteres.",
              );
            await obterAutenticacaoCliente().auth.signOut();
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign("/entrar");
          } catch (e) {
            setErro(
              e instanceof Error
                ? e.message
                : "Não foi possível definir a senha.",
            );
          } finally {
            setOcupado(false);
          }
        }}
      >
        <h1>Defina sua senha</h1>
        <p>
          Use uma senha exclusiva com pelo menos 12 caracteres, incluindo letras
          e números.
        </p>
        <label>
          Nova senha
          <input
            name="senha"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirme a senha
          <input
            name="confirmacao"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
        <LoadingButton type="submit" ocupado={ocupado} textoOcupado="Salvando…">
          Salvar senha e entrar
        </LoadingButton>
      </form>
      <ErrorAlertDialog
        aberto={!!erro}
        titulo="Verifique sua senha"
        mensagem={erro}
        aoFechar={() => setErro("")}
      />
    </main>
  );
}
