import { DetalheAssinantePainel } from "@/componentes/admin/assinantes";
export default async function PaginaAssinante({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalheAssinantePainel id={id} />;
}
