"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Share2, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { OrcamentoUi, reais, requisitar } from "@/bibliotecas/api-cliente";
export function DetalheOrcamento({
  id,
  mostrarPdf = false,
}: {
  id: string;
  mostrarPdf?: boolean;
}) {
  const router = useRouter();
  const [orcamento, setOrcamento] = useState<OrcamentoUi>();
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [prever, setPrever] = useState(mostrarPdf);
  useEffect(() => {
    requisitar<OrcamentoUi>(`/api/orcamentos/${id}`)
      .then(setOrcamento)
      .catch((e) => setErro(e.message));
  }, [id]);
  async function baixar(compartilhar: boolean) {
    setOcupado(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/orcamentos/${id}/pdf`, {
        cache: "no-store",
      });
      if (!resposta.ok) {
        if (resposta.status === 401) {
          // Recarrega após expirar a sessão para descartar o estado privado.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/entrar");
        }
        throw new Error("Não foi possível gerar o PDF.");
      }
      const blob = await resposta.blob();
      const arquivo = new File([blob], `orcamento-${orcamento?.numero}.pdf`, {
        type: "application/pdf",
      });
      if (
        compartilhar &&
        navigator.canShare?.({ files: [arquivo] }) &&
        navigator.share
      ) {
        await navigator.share({
          files: [arquivo],
          title: `Orçamento ${orcamento?.numero}`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = arquivo.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setErro(e instanceof Error ? e.message : "Falha ao gerar PDF.");
    } finally {
      setOcupado(false);
    }
  }
  return (
    <>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      {!orcamento ? (
        <p role="status">Carregando orçamento…</p>
      ) : (
        <>
          <header className="cabecalho">
            <h1>Orçamento #{String(orcamento.numero).padStart(5, "0")}</h1>
            <span className="status">{orcamento.situacao.toLowerCase()}</span>
          </header>
          <div className="formulario-grade">
            <section className="painel">
              <h2>Resumo do orçamento</h2>
              <div className="dados-cliente">
                <strong>{orcamento.clienteNome}</strong>
                <p>{orcamento.clienteEndereco}</p>
                <p>{orcamento.clienteCidade}</p>
                <p>{orcamento.clienteDocumento}</p>
                <p>{orcamento.clienteTelefone}</p>
              </div>
              <h2>Itens</h2>
              {orcamento.itens.map((i, n) => (
                <div className="linha-resumo" key={n}>
                  <span>
                    {i.descricao}
                    <small>
                      {i.quantidadeMilesimos / 1000} {i.unidade} ×{" "}
                      {reais(i.valorUnitarioCentavos)}
                    </small>
                  </span>
                  <strong>{reais(i.subtotalCentavos || 0)}</strong>
                </div>
              ))}
              <div className="total">
                <span>Total do orçamento</span>
                <strong>{reais(orcamento.totalCentavos)}</strong>
              </div>
              {orcamento.observacoes && (
                <>
                  <h2>Observações</h2>
                  <p className="observacoes">{orcamento.observacoes}</p>
                </>
              )}
              {orcamento.validadeDias && (
                <p className="texto-secundario">
                  Validade: {orcamento.validadeDias} dias
                </p>
              )}
              <div className="acoes">
                <Button asChild variant="outline">
                  <Link href={`/orcamentos/${id}/editar`}>
                    <Pencil />
                    Editar
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setConfirmando(true)}>
                  <Trash2 />
                  Excluir
                </Button>
              </div>
              {confirmando && (
                <div className="confirmacao" role="alert">
                  <p>
                    Excluir este orçamento? Esta ação não pode ser desfeita.
                  </p>
                  <div className="acoes">
                    <Button
                      variant="outline"
                      disabled={ocupado}
                      onClick={() => setConfirmando(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={ocupado}
                      onClick={async () => {
                        setOcupado(true);
                        try {
                          await requisitar(`/api/orcamentos/${id}`, {
                            method: "DELETE",
                          });
                          router.push("/orcamentos");
                        } catch (e) {
                          setErro(
                            e instanceof Error
                              ? e.message
                              : "Falha ao excluir.",
                          );
                        } finally {
                          setOcupado(false);
                        }
                      }}
                    >
                      Confirmar exclusão
                    </Button>
                  </div>
                </div>
              )}
            </section>
            <section className="painel">
              <h2>Documento PDF</h2>
              <p className="texto-secundario">
                Baixe ou compartilhe o orçamento com seu cliente.
              </p>
              <div className="acoes-pdf">
                <Button disabled={ocupado} onClick={() => baixar(false)}>
                  <Download />
                  {ocupado ? "Preparando…" : "Baixar PDF"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={ocupado}
                  onClick={() => baixar(true)}
                >
                  <Share2 />
                  Compartilhar
                </Button>
                <Button variant="outline" onClick={() => setPrever(!prever)}>
                  <FileText />
                  {prever ? "Fechar prévia" : "Pré-visualizar"}
                </Button>
              </div>
              {prever && (
                <iframe
                  className="previa-pdf"
                  title="Pré-visualização do PDF do orçamento"
                  src={`/api/orcamentos/${id}/pdf?visualizar=1`}
                />
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
