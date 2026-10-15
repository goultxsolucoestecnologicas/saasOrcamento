"use client";
import { obterAutenticacaoCliente } from "@/bibliotecas/autenticacao-cliente";
import { Button } from "@/componentes/ui/button";
export default function AssinaturaIndisponivel() {
  return (
    <main className="entrada">
      <section className="painel">
        <h1>Acesso indisponível</h1>
        <p>
          O acesso da sua empresa está suspenso ou a assinatura foi encerrada.
          Seus dados e orçamentos foram preservados.
        </p>
        <p>
          Entre em contato com o responsável pelo OrçaFácil para regularizar sua
          assinatura.
        </p>
        <Button
          onClick={async () => {
            await obterAutenticacaoCliente().auth.signOut();
            // Descarte o cache privado após encerrar a sessão.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign("/entrar");
          }}
        >
          Sair da conta
        </Button>
      </section>
    </main>
  );
}
