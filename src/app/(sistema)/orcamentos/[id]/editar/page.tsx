import { FormularioOrcamento } from "@/componentes/formulario-orcamento";
export default async function EditarOrcamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FormularioOrcamento id={id} />;
}
