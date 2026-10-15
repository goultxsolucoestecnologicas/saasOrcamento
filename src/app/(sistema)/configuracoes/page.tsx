"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  EmpresaUi,
  ErroRequisicao,
  requisitar,
} from "@/bibliotecas/api-cliente";
import {
  traduzirErrosValidacao,
  type ErroCampo,
} from "@/validacoes/mensagens-validacao";
import {
  CampoFormulario,
  ErrorAlertDialog,
  EstadoErro,
  LoadingButton,
  PageHeader,
  PageSkeleton,
} from "@/componentes/feedback";
import { FileUpload } from "@/componentes/file-upload";
const esquema = z.object({
  nome: z.string().trim().min(2).max(150),
  telefone: z.string().trim().max(30).nullable(),
});
export default function Configuracoes() {
  const [empresa, setEmpresa] = useState<EmpresaUi>();
  const [cargaErro, setCargaErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const [campos, setCampos] = useState<ErroCampo[]>([]);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [logo, setLogo] = useState<File>();
  const [logoErro, setLogoErro] = useState("");
  const trava = useRef(false);
  useEffect(() => {
    let ativo = true;
    requisitar<EmpresaUi>("/api/empresa")
      .then((e) => {
        if (ativo) setEmpresa(e);
      })
      .catch((e) => {
        if (ativo) setCargaErro(e.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);
  const erros = Object.fromEntries(campos.map((e) => [e.campo, e.mensagem]));
  return (
    <>
      <PageHeader
        titulo="Configurações"
        descricao="Dados e identidade da sua empresa no orçamento."
      />
      {carregando ? (
        <PageSkeleton tipo="configuracoes" cabecalho={false} />
      ) : cargaErro ? (
        <EstadoErro
          mensagem={cargaErro}
          tentarNovamente={() => {
            setCarregando(true);
            setCargaErro("");
            setTentativa((v) => v + 1);
          }}
        />
      ) : (
        empresa && (
          <form
            noValidate
            className="configuracoes"
            onSubmit={async (e) => {
              e.preventDefault();
              if (trava.current) return;
              const resultado = esquema.safeParse({
                nome: empresa.nome,
                telefone: empresa.telefone,
              });
              if (!resultado.success) {
                setCampos(traduzirErrosValidacao(resultado.error.issues));
                setErro("Encontramos informações que precisam ser corrigidas.");
                setAberto(true);
                return;
              }
              if (logoErro) {
                setErro(logoErro);
                setAberto(true);
                return;
              }
              trava.current = true;
              setOcupado(true);
              setCampos([]);
              let dadosSalvos = false;
              try {
                let atual = await requisitar<EmpresaUi>("/api/empresa", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(resultado.data),
                });
                dadosSalvos = true;
                setEmpresa(atual);
                window.dispatchEvent(new Event("empresa-atualizada"));
                if (logo) {
                  const d = new FormData();
                  d.set("logo", logo);
                  await requisitar("/api/empresa/logo", {
                    method: "POST",
                    body: d,
                  });
                  atual = await requisitar<EmpresaUi>("/api/empresa");
                  setLogo(undefined);
                }
                setEmpresa(atual);
                window.dispatchEvent(new Event("empresa-atualizada"));
                toast.success("Configurações salvas.");
              } catch (e) {
                setCampos(e instanceof ErroRequisicao ? e.campos : []);
                setErro(
                  dadosSalvos
                    ? "Os dados da empresa foram salvos, mas não foi possível concluir o envio da logo. Tente novamente."
                    : e instanceof Error
                      ? e.message
                      : "Não foi possível salvar. Tente novamente.",
                );
                setAberto(true);
              } finally {
                trava.current = false;
                setOcupado(false);
              }
            }}
          >
            <div className="configuracoes-secoes">
              <section className="painel">
                <h2>Dados da empresa</h2>
                <CampoFormulario
                  id="nome"
                  rotulo="Nome da empresa"
                  obrigatorio
                  erro={erros.nome}
                >
                  <input
                    maxLength={150}
                    required
                    value={empresa.nome}
                    onChange={(e) => {
                      setEmpresa({ ...empresa, nome: e.target.value });
                      setCampos((c) => c.filter((i) => i.campo !== "nome"));
                    }}
                  />
                </CampoFormulario>
                <CampoFormulario
                  id="telefone"
                  rotulo="Telefone"
                  erro={erros.telefone}
                >
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={30}
                    value={empresa.telefone || ""}
                    onChange={(e) =>
                      setEmpresa({ ...empresa, telefone: e.target.value })
                    }
                  />
                </CampoFormulario>
              </section>
              <section className="painel">
                <h2>Logo da empresa</h2>
                <FileUpload
                  nome={empresa.nome}
                  arquivo={logo}
                  ocupado={ocupado}
                  erro={logoErro}
                  urlAtual={
                    empresa.logoChave
                      ? `/api/empresa/logo?v=${encodeURIComponent(empresa.logoChave)}`
                      : undefined
                  }
                  aoAlterar={setLogo}
                  aoErro={(m) => {
                    setLogoErro(m);
                    if (m) {
                      setErro(m);
                      setAberto(true);
                    }
                  }}
                />
              </section>
            </div>
            <div className="configuracoes-footer">
              <LoadingButton type="submit" ocupado={ocupado}>
                Salvar configurações
              </LoadingButton>
            </div>
          </form>
        )
      )}
      <ErrorAlertDialog
        aberto={aberto}
        titulo="Não foi possível salvar as configurações"
        mensagem={erro}
        campos={campos}
        aoFechar={() => setAberto(false)}
        aposFechar={() =>
          document
            .getElementById(
              campos[0]?.campo || (logoErro ? "logo-alterar" : "nome"),
            )
            ?.focus()
        }
      />
    </>
  );
}
