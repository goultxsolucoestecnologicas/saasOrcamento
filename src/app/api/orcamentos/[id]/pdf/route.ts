import { renderToBuffer } from "@react-pdf/renderer";
import { DocumentoOrcamento } from "@/funcionalidades/pdf/documento-orcamento";
import { buscarOrcamento } from "@/servicos/orcamentos";
import { buscarEmpresa } from "@/servicos/empresa";
import { buscarLogoEmpresa } from "@/servicos/logos";
import { responderErroApi } from "@/bibliotecas/respostas-api";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orcamento = await buscarOrcamento(id);
    const empresa = await buscarEmpresa();
    const logo = await buscarLogoEmpresa();
    const buffer = await renderToBuffer(
      DocumentoOrcamento({
        orcamento,
        empresa: {
          ...empresa,
          logo: logo
            ? `data:image/png;base64,${logo.conteudo.toString("base64")}`
            : null,
        },
      }),
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="orcamento-${orcamento.numero}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (erro) {
    return responderErroApi(erro);
  }
}
