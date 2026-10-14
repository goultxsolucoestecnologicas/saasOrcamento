import { DetalheOrcamento } from "@/componentes/detalhe-orcamento";
export default async function Orcamento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pdf?: string }>;
}) {
  const { id } = await params;
  const { pdf } = await searchParams;
  return <DetalheOrcamento id={id} mostrarPdf={pdf === "1"} />;
}
