"use client";
import { useEffect, useState } from "react";
import { Button } from "@/componentes/ui/button";
import { EmpresaUi, requisitar } from "@/bibliotecas/api-cliente";
export default function Configuracoes() {
  const [empresa, setEmpresa] = useState<EmpresaUi>();
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [logo, setLogo] = useState<File>();
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    requisitar<EmpresaUi>("/api/empresa")
      .then(setEmpresa)
      .catch((e) => setErro(e.message));
  }, []);
  return (
    <>
      <header className="cabecalho">
        <h1>Configurações</h1>
      </header>
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
      {sucesso && (
        <p role="status" className="sucesso">
          {sucesso}
        </p>
      )}
      {!empresa ? (
        <p role="status">Carregando empresa…</p>
      ) : (
        <form
          className="painel configuracoes"
          onSubmit={async (e) => {
            e.preventDefault();
            setOcupado(true);
            setErro("");
            setSucesso("");
            try {
              let atualizada = await requisitar<EmpresaUi>("/api/empresa", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  nome: empresa.nome,
                  telefone: empresa.telefone,
                }),
              });
              if (logo) {
                const dados = new FormData();
                dados.set("logo", logo);
                await requisitar("/api/empresa/logo", {
                  method: "POST",
                  body: dados,
                });
                atualizada = await requisitar<EmpresaUi>("/api/empresa");
                setVersao(versao + 1);
                setLogo(undefined);
              }
              setEmpresa(atualizada);
              window.dispatchEvent(new Event("empresa-atualizada"));
              setSucesso("Configurações salvas.");
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Falha ao salvar.");
            } finally {
              setOcupado(false);
            }
          }}
        >
          <h2>Dados da empresa</h2>
          <label>
            Nome da empresa *
            <input
              required
              maxLength={150}
              value={empresa.nome}
              onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })}
            />
          </label>
          <label>
            Telefone
            <input
              type="tel"
              maxLength={30}
              value={empresa.telefone || ""}
              onChange={(e) =>
                setEmpresa({ ...empresa, telefone: e.target.value })
              }
            />
          </label>
          <h2>Logo da empresa</h2>
          {empresa.logoChave && (
            // Imagem privada exige cookie; não passar pelo otimizador.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="logo-empresa"
              src={`/api/empresa/logo?v=${versao}`}
              alt={`Logo de ${empresa.nome}`}
              width="160"
              height="80"
            />
          )}
          <label>
            Selecionar imagem
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                setErro("");
                if (
                  arquivo &&
                  (!["image/png", "image/jpeg"].includes(arquivo.type) ||
                    arquivo.size > 2 * 1024 * 1024)
                ) {
                  setErro("Selecione uma imagem PNG ou JPEG com até 2 MB.");
                  e.target.value = "";
                  setLogo(undefined);
                  return;
                }
                setLogo(arquivo);
              }}
            />
          </label>
          <p className="texto-secundario">
            PNG ou JPEG, até 2 MB. A imagem aparecerá nos seus orçamentos.
          </p>
          <Button type="submit" disabled={ocupado}>
            {ocupado ? "Salvando…" : "Salvar configurações"}
          </Button>
        </form>
      )}
    </>
  );
}
