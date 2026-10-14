import { Button } from "@/componentes/ui/button";

export default function PaginaInicial() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-12">
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        Orçamentos profissionais
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Um lugar para organizar seus orçamentos.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        A estrutura inicial está pronta. O acesso é disponibilizado mediante
        cadastro da sua empresa.
      </p>
      <div className="mt-8">
        <Button disabled>Acesso em preparação</Button>
      </div>
    </main>
  );
}
