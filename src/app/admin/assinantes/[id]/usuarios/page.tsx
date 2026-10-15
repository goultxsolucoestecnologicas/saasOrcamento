import { DetalheAssinantePainel } from "@/componentes/admin/assinantes";
export default async function PaginaUsuariosAssinante({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalheAssinantePainel id={id} usuarios />;
}
