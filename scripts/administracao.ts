import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  verificarIdentidadeSupabase,
  type VerificarIdentidadeSupabase,
} from "./admin-supabase";
import { ErroAdministracao } from "./admin-erros";
export { ErroAdministracao } from "./admin-erros";
import type { Prisma, PrismaClient } from "../src/gerado/prisma/client";

const id = z.uuid();
const nome = z.string().trim().min(2).max(150);
const esquemaComando = z.discriminatedUnion("comando", [
  z
    .object({
      comando: z.literal("criar-empresa"),
      nome,
      telefone: z.string().trim().min(1).max(30).optional(),
    })
    .strict(),
  z
    .object({
      comando: z.literal("criar-usuario"),
      empresa: id,
      "autenticacao-supabase": id,
      nome,
      email: z
        .email()
        .max(254)
        .transform((valor) => valor.toLowerCase()),
    })
    .strict(),
  z.object({ comando: z.literal("ativar-empresa"), empresa: id }).strict(),
  z.object({ comando: z.literal("suspender-empresa"), empresa: id }).strict(),
  z.object({ comando: z.literal("ativar-usuario"), usuario: id }).strict(),
  z.object({ comando: z.literal("desativar-usuario"), usuario: id }).strict(),
  z
    .object({
      comando: z.literal("vincular-usuario"),
      usuario: id,
      "autenticacao-supabase": id,
    })
    .strict(),
]);

export type ComandoAdministrativo = z.infer<typeof esquemaComando>;

export function interpretarArgumentos(
  argumentos: string[],
): ComandoAdministrativo {
  try {
    const { values, positionals } = parseArgs({
      args: argumentos,
      allowPositionals: true,
      strict: true,
      options: {
        nome: { type: "string" },
        telefone: { type: "string" },
        empresa: { type: "string" },
        usuario: { type: "string" },
        email: { type: "string" },
        "autenticacao-supabase": { type: "string" },
      },
    });
    if (positionals.length !== 1) throw new Error();
    return esquemaComando.parse({ comando: positionals[0], ...values });
  } catch {
    throw new ErroAdministracao(
      "Comando ou opções inválidos. Informe somente os campos necessários; nunca envie a senha como argumento.",
    );
  }
}

async function travarEmpresa(
  transacao: Prisma.TransactionClient,
  idEmpresa: string,
) {
  await transacao.empresa.update({
    where: { idEmpresa },
    data: { proximoNumeroOrcamento: { increment: 0 } },
  });
}

async function validarVagaUsuario(
  transacao: Prisma.TransactionClient,
  idEmpresa: string,
) {
  const quantidade = await transacao.usuario.count({
    where: { idEmpresa, ativo: true },
  });
  if (quantidade >= 2)
    throw new ErroAdministracao("A empresa já possui dois usuários ativos.");
}

export async function executarComandoAdministrativo(
  banco: PrismaClient,
  comando: ComandoAdministrativo,
  verificarIdentidade: VerificarIdentidadeSupabase = verificarIdentidadeSupabase,
): Promise<{ mensagem: string; id?: string }> {
  // Revalida também chamadas internas da biblioteca, sem confiar apenas no parser CLI.
  comando = esquemaComando.parse(comando);
  if (comando.comando === "criar-empresa") {
    const empresa = await banco.$transaction((transacao) =>
      transacao.empresa.create({
        data: {
          nome: comando.nome,
          telefone: comando.telefone,
          assinatura: { create: {} },
        },
        select: { idEmpresa: true },
      }),
    );
    return { mensagem: "Empresa e assinatura criadas.", id: empresa.idEmpresa };
  }
  if (comando.comando === "criar-usuario") {
    const identidade = await verificarIdentidade(
      comando["autenticacao-supabase"],
    );
    if (
      identidade.id !== comando["autenticacao-supabase"] ||
      identidade.email.toLowerCase() !== comando.email
    )
      throw new ErroAdministracao(
        "O email informado não corresponde à identidade Supabase verificada.",
      );
    const idUsuario = randomUUID();
    await banco.$transaction(async (transacao) => {
      await travarEmpresa(transacao, comando.empresa);
      await validarVagaUsuario(transacao, comando.empresa);
      await transacao.usuario.create({
        data: {
          id: idUsuario,
          idEmpresa: comando.empresa,
          name: comando.nome,
          email: comando.email,
          emailVerified: identidade.emailVerificado,
          idAutenticacaoSupabase: identidade.id,
        },
      });
    });
    return { mensagem: "Usuário criado.", id: idUsuario };
  }
  if (comando.comando === "vincular-usuario") {
    const identidade = await verificarIdentidade(
      comando["autenticacao-supabase"],
    );
    if (identidade.id !== comando["autenticacao-supabase"])
      throw new ErroAdministracao(
        "A identidade Supabase não corresponde ao UUID informado.",
      );
    await banco.$transaction(async (transacao) => {
      const usuario = await transacao.usuario.findUnique({
        where: { id: comando.usuario },
        select: { idEmpresa: true },
      });
      if (!usuario) throw new ErroAdministracao("Usuário não encontrado.");
      await travarEmpresa(transacao, usuario.idEmpresa);
      const atual = await transacao.usuario.findUnique({
        where: { id: comando.usuario, idEmpresa: usuario.idEmpresa },
        select: { email: true, idAutenticacaoSupabase: true },
      });
      if (
        !atual ||
        atual.email.toLowerCase() !== identidade.email.toLowerCase()
      )
        throw new ErroAdministracao(
          "O email do usuário local não corresponde à identidade Supabase verificada.",
        );
      if (
        atual.idAutenticacaoSupabase &&
        atual.idAutenticacaoSupabase !== identidade.id
      )
        throw new ErroAdministracao(
          "O usuário já está vinculado a outra identidade Supabase.",
        );
      await transacao.usuario.update({
        where: { id: comando.usuario, idEmpresa: usuario.idEmpresa },
        data: {
          idAutenticacaoSupabase: identidade.id,
          emailVerified: identidade.emailVerificado,
        },
      });
    });
    return {
      mensagem: "Identidade Supabase vinculada ao usuário existente.",
      id: comando.usuario,
    };
  }
  if (
    comando.comando === "ativar-empresa" ||
    comando.comando === "suspender-empresa"
  ) {
    const ativa = comando.comando === "ativar-empresa";
    await banco.$transaction(async (transacao) => {
      await transacao.empresa.update({
        where: { idEmpresa: comando.empresa },
        data: { ativa },
      });
      await transacao.assinatura.update({
        where: { idEmpresa: comando.empresa },
        data: { situacao: ativa ? "ATIVA" : "SUSPENSA" },
      });
      if (!ativa)
        await transacao.sessao.deleteMany({
          where: { usuario: { idEmpresa: comando.empresa } },
        });
    });
    return {
      mensagem: ativa
        ? "Empresa e assinatura ativadas."
        : "Empresa e assinatura suspensas.",
    };
  }
  const ativo = comando.comando === "ativar-usuario";
  await banco.$transaction(async (transacao) => {
    const usuario = await transacao.usuario.findUnique({
      where: { id: comando.usuario },
      select: { idEmpresa: true },
    });
    if (!usuario) throw new ErroAdministracao("Usuário não encontrado.");
    await travarEmpresa(transacao, usuario.idEmpresa);
    const atual = await transacao.usuario.findUnique({
      where: { id: comando.usuario },
      select: { ativo: true },
    });
    if (!atual) throw new ErroAdministracao("Usuário não encontrado.");
    if (ativo && !atual.ativo)
      await validarVagaUsuario(transacao, usuario.idEmpresa);
    await transacao.usuario.update({
      where: { id: comando.usuario },
      data: { ativo },
    });
    if (!ativo)
      await transacao.sessao.deleteMany({ where: { userId: comando.usuario } });
  });
  return { mensagem: ativo ? "Usuário ativado." : "Usuário desativado." };
}

export function mensagemErroAdministrativo(erro: unknown): string {
  if (erro instanceof ErroAdministracao) return erro.message;
  if (erro instanceof z.ZodError) return "Dados administrativos inválidos.";
  const codigo =
    typeof erro === "object" && erro !== null && "code" in erro
      ? erro.code
      : undefined;
  if (codigo === "P2002")
    return "Já existe um registro com esses dados únicos.";
  if (codigo === "P2025")
    return "Empresa, assinatura ou usuário não encontrado.";
  if (codigo === "P2034") return "Operação concorrente; execute novamente.";
  return "Não foi possível concluir a operação. Verifique a conexão, as migrations e o limite de usuários ativos.";
}
