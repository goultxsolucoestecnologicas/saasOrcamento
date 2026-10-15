"use client";
import { EstadoErro } from "@/componentes/feedback";
export default function ErroAdmin({ reset }: { reset: () => void }) {
  return (
    <EstadoErro
      mensagem="Não foi possível carregar o painel. Tente novamente em instantes."
      tentarNovamente={reset}
    />
  );
}
