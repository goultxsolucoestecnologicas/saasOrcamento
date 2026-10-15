import { CobrancasPainel } from "@/componentes/admin/cobrancas";
export default async function PaginaCobrancas({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; idEmpresa?: string }>;
}) {
  const consulta = await searchParams;
  return (
    <CobrancasPainel
      situacaoInicial={consulta.situacao}
      idEmpresaInicial={consulta.idEmpresa}
    />
  );
}
