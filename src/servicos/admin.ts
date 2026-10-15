import "server-only";
import { z } from "zod";
import { executarComoAdministrador } from "@/bibliotecas/admin-autorizacao";
import { ErroDominio } from "@/bibliotecas/erro-dominio";
import {
  avaliarVencimento,
  dataCalendario,
  hojeSaoPaulo,
  proximoMes,
  decidirQuitacao,
} from "@/bibliotecas/admin-regras";
import type { Prisma } from "@/gerado/prisma/client";
import type {
  AssinanteAdmin,
  CobrancaAdmin,
  ConfiguracaoAdmin,
  DetalheAssinanteAdmin,
  ResumoAdmin,
} from "@/bibliotecas/admin-contratos";

type Banco = Prisma.TransactionClient;
type Admin = { idAdmin: string; nome: string };
const data = z.string().refine((v) => {
  try {
    dataCalendario(v);
    return true;
  } catch {
    return false;
  }
}, "Informe uma data válida.");
const texto = z.string().trim().min(1).max(160);
const telefone = z.string().trim().max(30).optional().default("");
const centavos = z.number().int().min(1).max(100_000_000);
const id = z.uuid();
export const esquemaCriarAssinante = z
  .object({
    nome: texto,
    telefone,
    nomeUsuario: texto,
    emailUsuario: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    dataInicio: data,
    primeiroVencimento: data,
  })
  .strict()
  .refine((v) => v.primeiroVencimento >= v.dataInicio, {
    path: ["primeiroVencimento"],
    message: "O vencimento deve ser igual ou posterior ao início.",
  });
export const esquemaCriarCobranca = z
  .object({
    idEmpresa: id,
    valorCentavos: centavos,
    dataVencimento: data,
    acessoAte: data,
    observacoes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((v) => v.acessoAte >= v.dataVencimento, {
    path: ["acessoAte"],
    message: "O acesso deve terminar após o vencimento.",
  });
export const esquemaConfiguracao = z
  .object({
    nomePlano: texto,
    valorMensalCentavos: centavos,
    limiteUsuariosAtivos: z.literal(2),
    toleranciaDias: z.number().int().min(0).max(30),
    nomeComercial: texto,
    contatoComercial: z.string().trim().max(160).nullable(),
  })
  .strict();
export function validarAdmin<T>(esquema: z.ZodType<T>, entrada: unknown): T {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success)
    throw new ErroDominio(
      "Confira os campos informados.",
      400,
      resultado.error.issues.map((issue) => ({
        campo: issue.path.join("."),
        mensagem:
          issue.code === "unrecognized_keys"
            ? "Há campos não permitidos."
            : issue.code === "custom"
              ? issue.message
              : "Informe um valor válido para este campo.",
      })),
    );
  return resultado.data;
}
export function validarIdAdmin(valor: string): string {
  return validarAdmin(id, valor);
}
async function auditar(
  banco: Banco,
  admin: Admin,
  acao: string,
  entidade: string,
  idEntidade: string,
  informacoes: Prisma.InputJsonObject = {},
) {
  await banco.auditoriaAdministrativa.create({
    data: { idAdmin: admin.idAdmin, acao, entidade, idEntidade, informacoes },
  });
}
const padrao: ConfiguracaoAdmin = {
  nomePlano: "Profissional",
  valorMensalCentavos: 2999,
  limiteUsuariosAtivos: 2,
  toleranciaDias: 3,
  nomeComercial: "OrçaFácil",
  contatoComercial: null,
};
async function configuracao(banco: Banco): Promise<ConfiguracaoAdmin> {
  return (
    (await banco.configuracaoAdministrativa.findUnique({
      where: { id: "principal" },
    })) ?? padrao
  );
}
export async function buscarConfiguracaoAdmin() {
  return executarComoAdministrador(configuracao);
}
export async function atualizarConfiguracaoAdmin(entrada: unknown) {
  const dados = validarAdmin(esquemaConfiguracao, entrada);
  return executarComoAdministrador(async (banco, admin) => {
    const anterior = await configuracao(banco);
    const atual = await banco.configuracaoAdministrativa.upsert({
      where: { id: "principal" },
      create: { id: "principal", ...dados },
      update: dados,
    });
    await auditar(
      banco,
      admin,
      "CONFIGURACAO_ALTERADA",
      "configuracao",
      "principal",
      {
        anterior: {
          nomePlano: anterior.nomePlano,
          valorMensalCentavos: anterior.valorMensalCentavos,
          toleranciaDias: anterior.toleranciaDias,
        },
        atual: {
          nomePlano: atual.nomePlano,
          valorMensalCentavos: atual.valorMensalCentavos,
          toleranciaDias: atual.toleranciaDias,
        },
      },
    );
    return atual;
  });
}
const incluirEmpresa = {
  assinatura: true,
  usuarios: { select: { id: true, ativo: true } },
  cobrancas: {
    where: { situacao: "PENDENTE" as const },
    orderBy: { dataVencimento: "asc" as const },
    take: 1,
  },
};
type EmpresaCarregada = Prisma.EmpresaGetPayload<{
  include: typeof incluirEmpresa;
}>;
function dtoEmpresa(e: EmpresaCarregada): AssinanteAdmin {
  return {
    idEmpresa: e.idEmpresa,
    nome: e.nome,
    telefone: e.telefone,
    dataCriacao: e.dataCriacao.toISOString(),
    nomePlano: e.assinatura?.nomePlano ?? "Sem assinatura",
    valorMensalCentavos: e.assinatura?.valorMensalCentavos ?? 0,
    limiteUsuariosAtivos: e.assinatura?.limiteUsuariosAtivos ?? 2,
    usuariosAtivos: e.usuarios.filter((u) => u.ativo).length,
    proximoVencimento:
      e.cobrancas[0]?.dataVencimento.toISOString().slice(0, 10) ??
      e.assinatura?.dataVencimento?.toISOString().slice(0, 10) ??
      null,
    situacao: e.assinatura?.situacao ?? "SUSPENSA",
    emAtraso: Boolean(
      e.cobrancas[0] &&
      e.cobrancas[0].dataVencimento < dataCalendario(hojeSaoPaulo()),
    ),
  };
}
const incluirCobranca = {
  empresa: { select: { nome: true } },
  pagamento: { include: { administrador: { select: { nome: true } } } },
};
type CobrancaCarregada = Prisma.CobrancaGetPayload<{
  include: typeof incluirCobranca;
}>;
function dtoCobranca(c: CobrancaCarregada, tolerancia: number): CobrancaAdmin {
  const v = c.dataVencimento.toISOString().slice(0, 10);
  const prazo = avaliarVencimento(v, c.situacao !== "PENDENTE", tolerancia);
  return {
    idCobranca: c.idCobranca,
    idEmpresa: c.idEmpresa,
    nomeEmpresa: c.empresa.nome,
    idAssinatura: c.idAssinatura,
    valorCentavos: c.valorCentavos,
    dataEmissao: c.dataEmissao.toISOString(),
    dataVencimento: v,
    acessoAte: c.acessoAte.toISOString().slice(0, 10),
    situacao:
      c.situacao === "PENDENTE" && prazo.emAtraso ? "VENCIDA" : c.situacao,
    observacoes: c.observacoes,
    dias: prazo.dias,
    elegivelSuspensao: prazo.elegivelSuspensao,
    pagamento: c.pagamento
      ? {
          idPagamento: c.pagamento.idPagamento,
          dataPagamento: c.pagamento.dataPagamento.toISOString().slice(0, 10),
          dataConfirmacao: c.pagamento.dataConfirmacao.toISOString(),
          formaPagamento: c.pagamento.formaPagamento,
          nomeAdministrador: c.pagamento.administrador.nome,
        }
      : null,
  };
}
export async function listarAssinantesAdmin(
  parametros: URLSearchParams = new URLSearchParams(),
) {
  return executarComoAdministrador(async (banco) => {
    const busca = (parametros.get("busca") ?? parametros.get("q") ?? "")
      .trim()
      .slice(0, 160);
    const situacao = parametros.get("situacao");
    const where: Prisma.EmpresaWhereInput = {
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca, mode: "insensitive" } },
              { telefone: { contains: busca } },
            ],
          }
        : {}),
      ...(["ATIVA", "SUSPENSA", "CANCELADA"].includes(situacao ?? "")
        ? {
            assinatura: {
              situacao: situacao as "ATIVA" | "SUSPENSA" | "CANCELADA",
            },
          }
        : {}),
      ...(situacao === "ATRASADA"
        ? {
            cobrancas: {
              some: {
                situacao: "PENDENTE",
                dataVencimento: { lt: dataCalendario(hojeSaoPaulo()) },
              },
            },
          }
        : {}),
    };
    return (
      await banco.empresa.findMany({
        where,
        include: incluirEmpresa,
        orderBy: { dataCriacao: "desc" },
        take: 500,
      })
    ).map(dtoEmpresa);
  });
}
async function listarCobrancas(banco: Banco, parametros: URLSearchParams) {
  const config = await configuracao(banco);
  const situacao = parametros.get("situacao");
  const inicio = parametros.get("inicio"),
    fim = parametros.get("fim"),
    idEmpresa = parametros.get("idEmpresa");
  const where: Prisma.CobrancaWhereInput = {
    ...(idEmpresa ? { idEmpresa: validarIdAdmin(idEmpresa) } : {}),
    ...(["PAGA", "PENDENTE", "CANCELADA"].includes(situacao ?? "")
      ? { situacao: situacao as "PAGA" | "PENDENTE" | "CANCELADA" }
      : {}),
    ...(situacao === "VENCIDA"
      ? {
          situacao: "PENDENTE",
          dataVencimento: { lt: dataCalendario(hojeSaoPaulo()) },
        }
      : {}),
  };
  const grupo = parametros.get("grupo");
  const hoje = dataCalendario(hojeSaoPaulo());
  if (grupo === "REGULARIZADOS") where.situacao = "PAGA";
  if (grupo === "VENCIDOS") {
    where.situacao = "PENDENTE";
    where.dataVencimento = { lt: hoje };
  }
  if (grupo === "HOJE") {
    where.situacao = "PENDENTE";
    where.dataVencimento = hoje;
  }
  if (grupo === "PROXIMOS") {
    const limite = new Date(hoje);
    limite.setUTCDate(limite.getUTCDate() + 7);
    where.situacao = "PENDENTE";
    where.dataVencimento = { gte: hoje, lte: limite };
  }
  if (inicio || fim)
    where.AND = [
      ...(inicio ? [{ dataVencimento: { gte: dataCalendario(inicio) } }] : []),
      ...(fim ? [{ dataVencimento: { lte: dataCalendario(fim) } }] : []),
    ];
  return (
    await banco.cobranca.findMany({
      where,
      include: incluirCobranca,
      orderBy: { dataVencimento: "asc" },
      take: 1000,
    })
  ).map((c) => dtoCobranca(c, config.toleranciaDias));
}
export async function listarCobrancasAdmin(
  parametros: URLSearchParams = new URLSearchParams(),
) {
  return executarComoAdministrador((b) => listarCobrancas(b, parametros));
}
export async function listarVencimentosAdmin(
  parametros: URLSearchParams = new URLSearchParams(),
) {
  return executarComoAdministrador(async (banco) => {
    const itens = await listarCobrancas(banco, parametros);
    const grupo = parametros.get("grupo");
    return itens.filter((c) =>
      grupo === "REGULARIZADOS"
        ? c.situacao === "PAGA"
        : grupo === "HOJE"
          ? c.situacao === "PENDENTE" && c.dias === 0
          : grupo === "PROXIMOS"
            ? c.situacao === "PENDENTE" && c.dias >= 0 && c.dias <= 7
            : grupo === "VENCIDOS"
              ? c.situacao === "VENCIDA"
              : c.situacao !== "CANCELADA",
    );
  });
}
export async function buscarResumoAdmin(): Promise<ResumoAdmin> {
  return executarComoAdministrador(async (banco) => {
    const hoje = hojeSaoPaulo();
    const inicio = dataCalendario(`${hoje.slice(0, 7)}-01`);
    const fim = dataCalendario(proximoMes(`${hoje.slice(0, 7)}-01`));
    const [
      totalEmpresas,
      empresasAtivas,
      empresasSuspensas,
      empresasEmAtraso,
      mrr,
      recebido,
      pendente,
      cobrancas,
    ] = await Promise.all([
      banco.empresa.count(),
      banco.empresa.count({
        where: { ativa: true, assinatura: { situacao: "ATIVA" } },
      }),
      banco.empresa.count({ where: { assinatura: { situacao: "SUSPENSA" } } }),
      banco.empresa.count({
        where: {
          cobrancas: {
            some: {
              situacao: "PENDENTE",
              dataVencimento: { lt: dataCalendario(hoje) },
            },
          },
        },
      }),
      banco.assinatura.aggregate({
        _sum: { valorMensalCentavos: true },
        where: { situacao: "ATIVA", empresa: { ativa: true } },
      }),
      banco.pagamento.aggregate({
        _sum: { valorCentavos: true },
        where: { dataPagamento: { gte: inicio, lt: fim } },
      }),
      banco.cobranca.aggregate({
        _sum: { valorCentavos: true },
        where: { situacao: "PENDENTE" },
      }),
      listarCobrancas(banco, new URLSearchParams({ grupo: "PROXIMOS" })),
    ]);
    return {
      totalEmpresas,
      empresasAtivas,
      empresasSuspensas,
      empresasEmAtraso,
      mrrCentavos: mrr._sum.valorMensalCentavos ?? 0,
      recebidoMesCentavos: recebido._sum.valorCentavos ?? 0,
      pendenteCentavos: pendente._sum.valorCentavos ?? 0,
      proximosVencimentos: cobrancas.slice(0, 10),
    };
  });
}
export async function buscarAssinanteAdmin(
  idEmpresa: string,
): Promise<DetalheAssinanteAdmin> {
  validarIdAdmin(idEmpresa);
  return executarComoAdministrador(async (banco) => {
    const e = await banco.empresa.findUnique({
      where: { idEmpresa },
      include: incluirEmpresa,
    });
    if (!e?.assinatura) throw new ErroDominio("Assinante não encontrado.", 404);
    const [usuarios, convites, cobrancas, auditorias] = await Promise.all([
      banco.usuario.findMany({
        where: { idEmpresa },
        select: { id: true, name: true, email: true, ativo: true },
      }),
      banco.conviteAdministrativo.findMany({
        where: { idEmpresa, situacao: { not: "CONCLUIDO" } },
      }),
      listarCobrancas(banco, new URLSearchParams({ idEmpresa })),
      banco.auditoriaAdministrativa.findMany({
        where: {
          OR: [
            { idEntidade: idEmpresa },
            { idEntidade: e.assinatura.idAssinatura },
          ],
        },
        include: { administrador: { select: { nome: true } } },
        orderBy: { dataCriacao: "desc" },
        take: 50,
      }),
    ]);
    return {
      ...dtoEmpresa(e),
      idAssinatura: e.assinatura.idAssinatura,
      dataInicio: e.assinatura.dataInicio?.toISOString().slice(0, 10) ?? null,
      dataDireitoAcesso:
        e.assinatura.dataDireitoAcesso?.toISOString().slice(0, 10) ?? null,
      usuarios: [
        ...usuarios.map((u) => ({
          id: u.id,
          nome: u.name,
          email: u.email,
          ativo: u.ativo,
        })),
        ...convites.map((c) => ({
          id: c.idConvite,
          nome: c.nome,
          email: c.email,
          ativo: false,
          convitePendente: true,
        })),
      ],
      cobrancas,
      auditorias: auditorias.map((a) => ({
        idAuditoria: a.idAuditoria,
        acao: a.acao,
        entidade: a.entidade,
        dataCriacao: a.dataCriacao.toISOString(),
        nomeAdministrador: a.administrador.nome,
      })),
    };
  });
}
export async function atualizarAssinanteAdmin(
  idEmpresa: string,
  entrada: unknown,
) {
  validarIdAdmin(idEmpresa);
  const dados = validarAdmin(
    z.object({ nome: texto, telefone }).strict(),
    entrada,
  );
  return executarComoAdministrador(async (banco, admin) => {
    if (!(await banco.empresa.findUnique({ where: { idEmpresa } })))
      throw new ErroDominio("Assinante não encontrado.", 404);
    await banco.empresa.update({
      where: { idEmpresa },
      data: { ...dados, telefone: dados.telefone || null },
    });
    await auditar(banco, admin, "EMPRESA_EDITADA", "empresa", idEmpresa);
    return { idEmpresa };
  });
}
export async function alterarAssinaturaAdmin(
  idEmpresa: string,
  entrada: unknown,
) {
  validarIdAdmin(idEmpresa);
  const dados = validarAdmin(
    z
      .object({
        situacao: z.enum(["ATIVA", "SUSPENSA", "CANCELADA"]),
        confirmar: z.literal(true),
      })
      .strict(),
    entrada,
  );
  return executarComoAdministrador(async (banco, admin) => {
    const anterior = await banco.assinatura.findUnique({
      where: { idEmpresa },
    });
    if (!anterior) throw new ErroDominio("Assinatura não encontrada.", 404);
    await banco.assinatura.update({
      where: { idEmpresa },
      data: { situacao: dados.situacao },
    });
    await banco.empresa.update({
      where: { idEmpresa },
      data: { ativa: dados.situacao === "ATIVA" },
    });
    await auditar(
      banco,
      admin,
      "ASSINATURA_ALTERADA",
      "assinatura",
      anterior.idAssinatura,
      { anterior: anterior.situacao, atual: dados.situacao },
    );
    return { situacao: dados.situacao };
  });
}
export async function criarCobrancaAdmin(entrada: unknown) {
  const dados = validarAdmin(esquemaCriarCobranca, entrada);
  return executarComoAdministrador(async (banco, admin) => {
    const assinatura = await banco.assinatura.findUnique({
      where: { idEmpresa: dados.idEmpresa },
    });
    if (!assinatura) throw new ErroDominio("Assinatura não encontrada.", 404);
    const c = await banco.cobranca.create({
      data: {
        ...dados,
        idAssinatura: assinatura.idAssinatura,
        dataVencimento: dataCalendario(dados.dataVencimento),
        acessoAte: dataCalendario(dados.acessoAte),
      },
    });
    await auditar(banco, admin, "COBRANCA_CRIADA", "empresa", dados.idEmpresa, {
      idCobranca: c.idCobranca,
      valorCentavos: c.valorCentavos,
    });
    return { idCobranca: c.idCobranca };
  });
}
export async function atualizarCobrancaAdmin(
  idCobranca: string,
  entrada: unknown,
) {
  validarIdAdmin(idCobranca);
  const dados = validarAdmin(
    z.union([
      z.object({ observacoes: z.string().trim().max(1000) }).strict(),
      z
        .object({ cancelar: z.literal(true), confirmar: z.literal(true) })
        .strict(),
    ]),
    entrada,
  );
  return executarComoAdministrador(async (banco, admin) => {
    let c = await banco.cobranca.findUnique({ where: { idCobranca } });
    if (!c) throw new ErroDominio("Cobrança não encontrada.", 404);
    await banco.assinatura.update({
      where: { idAssinatura: c.idAssinatura },
      data: { dataAtualizacao: new Date() },
    });
    c = (await banco.cobranca.findUnique({ where: { idCobranca } }))!;
    if ("cancelar" in dados && c.situacao !== "PENDENTE")
      throw new ErroDominio(
        "Somente cobranças não quitadas podem ser canceladas.",
      );
    await banco.cobranca.update({
      where: { idCobranca },
      data:
        "cancelar" in dados
          ? { situacao: "CANCELADA" }
          : { observacoes: dados.observacoes || null },
    });
    await auditar(
      banco,
      admin,
      "cancelar" in dados ? "COBRANCA_CANCELADA" : "COBRANCA_EDITADA",
      "empresa",
      c.idEmpresa,
      { idCobranca },
    );
    return { idCobranca };
  });
}
/** Regra única para quitação. Gateway futuro deve entrar por autorização própria e reutilizar esta transação. */
export async function quitarCobranca(
  banco: Banco,
  admin: Admin,
  idCobranca: string,
  dataPagamento: string,
  formaPagamento: string,
) {
  const primeira = await banco.cobranca.findUnique({ where: { idCobranca } });
  if (!primeira) throw new ErroDominio("Cobrança não encontrada.", 404);
  const assinatura = await banco.assinatura.update({
    where: { idAssinatura: primeira.idAssinatura },
    data: { dataAtualizacao: new Date() },
  });
  const c = (await banco.cobranca.findUnique({
    where: { idCobranca },
    include: { pagamento: true },
  }))!;
  if (decidirQuitacao(c.situacao, Boolean(c.pagamento)) === "JA_CONFIRMADO")
    return { idCobranca, jaConfirmado: true };
  await banco.pagamento.create({
    data: {
      idCobranca,
      valorCentavos: c.valorCentavos,
      dataPagamento: dataCalendario(dataPagamento),
      formaPagamento,
      idAdmin: admin.idAdmin,
    },
  });
  await banco.cobranca.update({
    where: { idCobranca },
    data: { situacao: "PAGA" },
  });
  const acessoAte =
    assinatura.dataDireitoAcesso && assinatura.dataDireitoAcesso > c.acessoAte
      ? assinatura.dataDireitoAcesso
      : c.acessoAte;
  await banco.assinatura.update({
    where: { idAssinatura: c.idAssinatura },
    data: {
      dataDireitoAcesso: acessoAte,
      dataVencimento: acessoAte,
      ...(assinatura.situacao !== "CANCELADA" ? { situacao: "ATIVA" } : {}),
    },
  });
  if (assinatura.situacao !== "CANCELADA")
    await banco.empresa.update({
      where: { idEmpresa: c.idEmpresa },
      data: { ativa: true },
    });
  await auditar(banco, admin, "PAGAMENTO_CONFIRMADO", "empresa", c.idEmpresa, {
    idCobranca,
    valorCentavos: c.valorCentavos,
    acessoAte: acessoAte.toISOString().slice(0, 10),
  });
  return { idCobranca, jaConfirmado: false };
}
export async function confirmarPagamentoAdmin(
  idCobranca: string,
  entrada: unknown,
) {
  validarIdAdmin(idCobranca);
  const dados = validarAdmin(
    z
      .object({
        dataPagamento: data,
        formaPagamento: z
          .enum(["PIX", "TRANSFERENCIA", "DINHEIRO", "OUTRO"])
          .default("PIX"),
        confirmar: z.literal(true),
      })
      .strict()
      .refine((v) => v.dataPagamento <= hojeSaoPaulo(), {
        path: ["dataPagamento"],
        message: "O pagamento não pode estar no futuro.",
      }),
    entrada,
  );
  return executarComoAdministrador((b, a) =>
    quitarCobranca(b, a, idCobranca, dados.dataPagamento, dados.formaPagamento),
  );
}
export async function alterarUsuarioAdmin(
  idEmpresa: string,
  idUsuario: string,
  entrada: unknown,
) {
  validarIdAdmin(idEmpresa);
  validarIdAdmin(idUsuario);
  const dados = validarAdmin(
    z.object({ ativo: z.boolean() }).strict(),
    entrada,
  );
  return executarComoAdministrador(async (banco, admin) => {
    const empresa = await banco.empresa.findUnique({ where: { idEmpresa } });
    if (!empresa) throw new ErroDominio("Empresa não encontrada.", 404);
    await banco.empresa.update({
      where: { idEmpresa },
      data: { dataAtualizacao: new Date() },
    });
    const u = await banco.usuario.findFirst({
      where: { id: idUsuario, idEmpresa },
    });
    if (!u) throw new ErroDominio("Usuário não encontrado nesta empresa.", 404);
    if (dados.ativo && !u.ativo) {
      const ativos = await banco.usuario.count({
        where: { idEmpresa, ativo: true },
      });
      const reservados = await banco.conviteAdministrativo.count({
        where: { idEmpresa, situacao: { not: "CONCLUIDO" } },
      });
      if (ativos + reservados >= 2)
        throw new ErroDominio(
          "A empresa já possui duas vagas ocupadas ou reservadas.",
        );
    }
    await banco.usuario.update({
      where: { id: idUsuario },
      data: { ativo: dados.ativo },
    });
    await auditar(banco, admin, "USUARIO_ALTERADO", "empresa", idEmpresa, {
      idUsuario,
      ativo: dados.ativo,
    });
    return { id: idUsuario, ativo: dados.ativo };
  });
}
export { auditar, configuracao };
