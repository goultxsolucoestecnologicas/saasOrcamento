"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type {
  AssinanteAdmin,
  ConfiguracaoAdmin,
  DetalheAssinanteAdmin,
} from "@/bibliotecas/admin-contratos";
import { requisitar, reais } from "@/bibliotecas/api-cliente";
import { Button } from "@/componentes/ui/button";
import { CampoFormulario } from "@/componentes/feedback";
import {
  AcaoConfirmada,
  CabecalhoAdmin,
  DadosAdmin,
  dataCurta,
  EsperaAdmin,
  FormularioAdmin,
  jsonAdmin,
  Selo,
  useDadosAdmin,
  VazioAdmin,
} from "./compartilhados";

export function ListaAssinantesAdmin() {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("");
  const [consulta, setConsulta] = useState("");
  const { dados, erro, atualizar } = useDadosAdmin<AssinanteAdmin[]>(
    `/api/admin/assinantes?${new URLSearchParams({ busca: consulta, situacao })}`,
  );
  return (
    <div className="admin-pagina">
      <CabecalhoAdmin
        titulo="Assinantes"
        descricao="Gerencie empresas, acessos e assinaturas."
      >
        <Button asChild>
          <Link href="/admin/assinantes/novo">
            <Plus aria-hidden="true" />
            Cadastrar empresa
          </Link>
        </Button>
      </CabecalhoAdmin>
      <form
        className="admin-painel admin-filtros"
        onSubmit={(e) => {
          e.preventDefault();
          setConsulta(busca);
        }}
      >
        <CampoFormulario
          id="busca-assinantes"
          rotulo="Buscar por nome ou telefone"
          className="admin-busca"
        >
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            type="search"
            placeholder="Nome ou telefone da empresa"
          />
        </CampoFormulario>
        <CampoFormulario id="situacao-assinantes" rotulo="Situação">
          <select
            value={situacao}
            onChange={(e) => setSituacao(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="ATIVA">Ativas</option>
            <option value="SUSPENSA">Suspensas</option>
            <option value="CANCELADA">Canceladas</option>
            <option value="ATRASADA">Com pagamento em atraso</option>
          </select>
        </CampoFormulario>
        <Button type="submit" variant="outline">
          <Search aria-hidden="true" />
          Buscar
        </Button>
      </form>
      {!dados ? (
        <EsperaAdmin erro={erro} atualizar={atualizar} />
      ) : !dados.length ? (
        <VazioAdmin />
      ) : (
        <div className="admin-lista">
          {dados.map((e) => (
            <article key={e.idEmpresa} className="admin-registro">
              <div className="admin-registro-topo">
                <h2>
                  <Link href={`/admin/assinantes/${e.idEmpresa}`}>
                    {e.nome || "Empresa sem nome"}
                  </Link>
                </h2>
                <div className="admin-acoes">
                  <Selo situacao={e.situacao} />
                  {e.emAtraso && <Selo situacao="VENCIDA" />}
                </div>
              </div>
              <DadosAdmin
                itens={[
                  ["Telefone", e.telefone],
                  ["Plano", e.nomePlano],
                  [
                    "Usuários ativos",
                    `${e.usuariosAtivos} de ${e.limiteUsuariosAtivos}`,
                  ],
                  ["Cadastro", dataCurta(e.dataCriacao)],
                  ["Próximo vencimento", dataCurta(e.proximoVencimento)],
                  ["Mensalidade", reais(e.valorMensalCentavos)],
                ]}
              />
              <Button asChild variant="outline">
                <Link href={`/admin/assinantes/${e.idEmpresa}`}>
                  Ver detalhes
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function NovoAssinanteAdmin() {
  const router = useRouter();
  const config = useDadosAdmin<ConfiguracaoAdmin>("/api/admin/configuracoes");
  return (
    <div className="admin-pagina">
      <CabecalhoAdmin
        titulo="Cadastrar empresa"
        descricao="Crie a assinatura e envie um convite seguro ao primeiro usuário."
      >
        <Button asChild variant="outline">
          <Link href="/admin/assinantes">Voltar aos assinantes</Link>
        </Button>
      </CabecalhoAdmin>
      <section className="admin-painel">
        <h2>Dados do novo assinante</h2>
        {!config.dados ? (
          <EsperaAdmin erro={config.erro} atualizar={config.atualizar} />
        ) : (
          <>
            <p className="admin-aviso">
              {config.dados.nomePlano} ·{" "}
              {reais(config.dados.valorMensalCentavos)}/mês · até{" "}
              {config.dados.limiteUsuariosAtivos} usuários ativos.
            </p>
            <FormularioAdmin
              campos={[
                { nome: "nome", rotulo: "Nome da empresa", obrigatorio: true },
                { nome: "telefone", rotulo: "Telefone", tipo: "tel" },
                {
                  nome: "nomeUsuario",
                  rotulo: "Nome do primeiro usuário",
                  obrigatorio: true,
                },
                {
                  nome: "emailUsuario",
                  rotulo: "E-mail do primeiro usuário",
                  tipo: "email",
                  obrigatorio: true,
                },
                {
                  nome: "dataInicio",
                  rotulo: "Data de início",
                  tipo: "date",
                  obrigatorio: true,
                },
                {
                  nome: "primeiroVencimento",
                  rotulo: "Primeiro vencimento",
                  tipo: "date",
                  obrigatorio: true,
                },
              ]}
              texto="Cadastrar e preparar convite"
              aviso="O usuário receberá um convite para definir a própria senha. Nenhuma senha temporária será exibida ou enviada pelo painel."
              enviar={(d) => requisitar("/api/admin/assinantes", jsonAdmin(d))}
              aoSalvar={(resultado) => {
                const novo = resultado as { idEmpresa?: string };
                router.push(
                  novo.idEmpresa
                    ? `/admin/assinantes/${novo.idEmpresa}`
                    : "/admin/assinantes",
                );
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}

export function DetalheAssinantePainel({
  id,
  usuarios = false,
}: {
  id: string;
  usuarios?: boolean;
}) {
  const { dados, erro, atualizar } = useDadosAdmin<DetalheAssinanteAdmin>(
    `/api/admin/assinantes/${encodeURIComponent(id)}`,
  );
  if (!dados) return <EsperaAdmin erro={erro} atualizar={atualizar} />;
  const base = `/api/admin/assinantes/${encodeURIComponent(id)}`;
  return (
    <div className="admin-pagina">
      <CabecalhoAdmin
        titulo={dados.nome || "Empresa sem nome"}
        descricao="Dados, usuários e histórico do assinante."
      >
        <Button asChild variant="outline">
          <Link href="/admin/assinantes">Voltar aos assinantes</Link>
        </Button>
      </CabecalhoAdmin>
      <nav className="admin-abas" aria-label="Detalhes do assinante">
        <Link
          href={`/admin/assinantes/${id}`}
          aria-current={!usuarios ? "page" : undefined}
        >
          Empresa e assinatura
        </Link>
        <Link
          href={`/admin/assinantes/${id}/usuarios`}
          aria-current={usuarios ? "page" : undefined}
        >
          Usuários
        </Link>
      </nav>
      {dados.usuarios.some((usuario) => usuario.convitePendente) && (
        <aside className="admin-aviso" role="status">
          Há convite pendente de envio. O cadastro e a vaga estão preservados,
          mas o acesso ainda não foi concluído. Verifique SMTP, URLs de
          redirecionamento e a chave administrativa Supabase; depois use
          “Reenviar convite” na aba Usuários.
        </aside>
      )}
      {usuarios ? (
        <>
          <section className="admin-painel">
            <h2>Usuários da empresa</h2>
            <p className="admin-secundario">
              {dados.usuariosAtivos} de {dados.limiteUsuariosAtivos} vagas
              ativas. Convites pendentes também reservam uma vaga.
            </p>
          </section>
          <div className="admin-lista">
            {dados.usuarios.map((u) => (
              <article className="admin-registro" key={u.id}>
                <div className="admin-registro-topo">
                  <h2>{u.nome}</h2>
                  <Selo
                    situacao={
                      u.convitePendente
                        ? "PENDENTE"
                        : u.ativo
                          ? "ATIVO"
                          : "INATIVO"
                    }
                  />
                </div>
                <DadosAdmin
                  itens={[
                    ["E-mail", u.email],
                    [
                      "Acesso",
                      u.convitePendente
                        ? "Convite pendente"
                        : u.ativo
                          ? "Ativo"
                          : "Desativado",
                    ],
                  ]}
                />
                {u.convitePendente ? (
                  <AcaoConfirmada
                    texto="Reenviar convite"
                    titulo="Reenviar convite?"
                    mensagem={`Enviar novamente o convite de acesso para ${u.email}?`}
                    executar={() =>
                      requisitar(
                        `${base}/convites/${u.id}/reenviar`,
                        jsonAdmin({}),
                      )
                    }
                    aoConcluir={atualizar}
                  />
                ) : (
                  <AcaoConfirmada
                    texto={u.ativo ? "Desativar" : "Reativar"}
                    titulo={
                      u.ativo ? "Desativar usuário?" : "Reativar usuário?"
                    }
                    mensagem={
                      u.ativo
                        ? "O usuário perderá acesso. Os dados e orçamentos serão preservados."
                        : "O acesso será restabelecido se houver uma vaga disponível no plano."
                    }
                    perigosa={u.ativo}
                    executar={() =>
                      requisitar(
                        `${base}/usuarios/${u.id}`,
                        jsonAdmin({ ativo: !u.ativo }, "PATCH"),
                      )
                    }
                    aoConcluir={atualizar}
                  />
                )}
              </article>
            ))}
          </div>
          <section className="admin-painel">
            <h2>Adicionar usuário</h2>
            <FormularioAdmin
              campos={[
                { nome: "nome", rotulo: "Nome do usuário", obrigatorio: true },
                {
                  nome: "email",
                  rotulo: "E-mail",
                  tipo: "email",
                  obrigatorio: true,
                },
              ]}
              texto="Enviar convite"
              aviso="O limite do plano é verificado no servidor. Administradores da plataforma não consomem vagas."
              enviar={(d) => requisitar(`${base}/usuarios`, jsonAdmin(d))}
              aoSalvar={atualizar}
            />
          </section>
        </>
      ) : (
        <>
          <section className="admin-painel">
            <h2>Assinatura</h2>
            <DadosAdmin
              itens={[
                ["Situação", <Selo key="situacao" situacao={dados.situacao} />],
                ["Plano", dados.nomePlano],
                ["Mensalidade", reais(dados.valorMensalCentavos)],
                ["Início", dataCurta(dados.dataInicio)],
                ["Próximo vencimento", dataCurta(dados.proximoVencimento)],
                ["Acesso até", dataCurta(dados.dataDireitoAcesso)],
              ]}
            />
            <div className="admin-formulario-rodape">
              {(["ATIVA", "SUSPENSA", "CANCELADA"] as const)
                .filter((s) => s !== dados.situacao)
                .map((s) => (
                  <AcaoConfirmada
                    key={s}
                    texto={
                      s === "ATIVA"
                        ? "Ativar assinatura"
                        : s === "SUSPENSA"
                          ? "Suspender assinatura"
                          : "Cancelar assinatura"
                    }
                    titulo={
                      s === "ATIVA"
                        ? "Ativar assinatura?"
                        : s === "SUSPENSA"
                          ? "Suspender assinatura?"
                          : "Cancelar assinatura?"
                    }
                    mensagem={
                      s === "ATIVA"
                        ? "A empresa terá acesso novamente aos dados existentes."
                        : "O acesso às funções de negócio será bloqueado. Os usuários, orçamentos e histórico serão preservados."
                    }
                    perigosa={s !== "ATIVA"}
                    executar={() =>
                      requisitar(
                        `${base}/assinatura`,
                        jsonAdmin({ situacao: s, confirmar: true }),
                      )
                    }
                    aoConcluir={atualizar}
                  />
                ))}
            </div>
          </section>
          <section className="admin-painel">
            <h2>Dados da empresa</h2>
            <FormularioAdmin
              key={`${dados.nome}-${dados.telefone}`}
              campos={[
                { nome: "nome", rotulo: "Nome da empresa", valor: dados.nome },
                {
                  nome: "telefone",
                  rotulo: "Telefone",
                  tipo: "tel",
                  valor: dados.telefone || "",
                },
              ]}
              enviar={(d) => requisitar(base, jsonAdmin(d, "PUT"))}
              aoSalvar={atualizar}
            />
          </section>
          <section className="admin-painel">
            <div className="admin-cabecalho">
              <h2>Histórico de cobranças</h2>
              <Button asChild variant="outline">
                <Link href={`/admin/cobrancas?idEmpresa=${id}`}>
                  Gerenciar cobranças
                </Link>
              </Button>
            </div>
            {dados.cobrancas.length ? (
              <div className="admin-lista">
                {dados.cobrancas.map((c) => (
                  <div key={c.idCobranca} className="admin-registro">
                    <Selo situacao={c.situacao} />
                    <DadosAdmin
                      itens={[
                        ["Valor", reais(c.valorCentavos)],
                        ["Vencimento", dataCurta(c.dataVencimento)],
                        ["Pagamento", dataCurta(c.pagamento?.dataPagamento)],
                      ]}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-secundario">Nenhuma cobrança registrada.</p>
            )}
          </section>
          <section className="admin-painel">
            <h2>Histórico administrativo</h2>
            {dados.auditorias.length ? (
              <ul className="admin-historico">
                {dados.auditorias.map((a) => (
                  <li key={a.idAuditoria}>
                    <strong>{a.acao.replaceAll("_", " ").toLowerCase()}</strong>
                    <p className="admin-secundario">
                      {a.nomeAdministrador} · {dataCurta(a.dataCriacao)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-secundario">Nenhuma operação registrada.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
