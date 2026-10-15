import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  executarComoAdministrador,
  obterAdministradorPlataforma,
} from "@/bibliotecas/admin-autorizacao";
import { obterAmbiente } from "@/bibliotecas/ambiente";
import { ErroDominio } from "@/bibliotecas/erro-dominio";
import { dataCalendario, proximoMes } from "@/bibliotecas/admin-regras";
import {
  auditar,
  configuracao,
  esquemaCriarAssinante,
  validarAdmin,
  validarIdAdmin,
} from "@/servicos/admin";

function clienteServidor() {
  const segredo = process.env.SUPABASE_SECRET_KEY;
  if (!segredo)
    throw new ErroDominio(
      "Configure a chave administrativa Supabase no servidor para enviar convites.",
    );
  return createClient(obterAmbiente().NEXT_PUBLIC_SUPABASE_URL, segredo, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (entrada, opcoes) =>
        fetch(entrada, { ...opcoes, signal: AbortSignal.timeout(15000) }),
    },
  });
}
/** Reserva persistente antes de chamar Auth: falhas externas nunca deixam usuários com senha padrão ou acesso sem vínculo. */
export async function enviarConviteAdmin(idEmpresa: string, idConvite: string) {
  validarIdAdmin(idEmpresa);
  validarIdAdmin(idConvite);
  await obterAdministradorPlataforma();
  const reserva = await executarComoAdministrador(async (banco) => {
    await banco.empresa.update({
      where: { idEmpresa },
      data: { dataAtualizacao: new Date() },
    });
    const convite = await banco.conviteAdministrativo.findFirst({
      where: { idConvite, idEmpresa },
    });
    if (!convite) throw new ErroDominio("Convite não encontrado.", 404);
    if (
      convite.situacao === "ENVIANDO" &&
      convite.dataTentativa &&
      Date.now() - convite.dataTentativa.getTime() < 120000
    )
      throw new ErroDominio(
        "O convite está sendo enviado. Aguarde antes de tentar novamente.",
      );
    if (convite.situacao === "CONCLUIDO") return convite;
    await banco.conviteAdministrativo.update({
      where: { idConvite },
      data: { situacao: "ENVIANDO", dataTentativa: new Date() },
    });
    return convite;
  });
  if (reserva.situacao === "CONCLUIDO") return { idConvite, enviado: true };
  let idSupabase = reserva.idSupabase;
  try {
    const cliente = clienteServidor();
    if (!idSupabase) {
      const { data, error } = await cliente.auth.admin.inviteUserByEmail(
        reserva.email,
        { redirectTo: `${obterAmbiente().APP_URL}/auth/confirmar` },
      );
      if (error || !data.user?.id) throw new Error("convite_indisponivel");
      idSupabase = data.user.id;
      // Persiste o UUID confirmado pela API Auth; nunca vincula identidades por email/metadata do navegador.
      await executarComoAdministrador((b) =>
        b.conviteAdministrativo.update({
          where: { idConvite },
          data: { idSupabase },
        }),
      );
    } else {
      const { error } = await cliente.auth.resetPasswordForEmail(
        reserva.email,
        { redirectTo: `${obterAmbiente().APP_URL}/auth/confirmar` },
      );
      if (error) throw new Error("reenvio_indisponivel");
    }
    const identidade = idSupabase;
    await executarComoAdministrador(async (banco, admin) => {
      await banco.empresa.update({
        where: { idEmpresa },
        data: { dataAtualizacao: new Date() },
      });
      const ativos = await banco.usuario.count({
        where: { idEmpresa, ativo: true },
      });
      const jaExiste = await banco.usuario.findUnique({
        where: { idAutenticacaoSupabase: identidade },
      });
      if (jaExiste && jaExiste.idEmpresa !== idEmpresa)
        throw new ErroDominio(
          "A identidade já está vinculada a outra empresa.",
        );
      if (!jaExiste && ativos >= 2)
        throw new ErroDominio("Limite de dois usuários ativos atingido.");
      if (!jaExiste)
        await banco.usuario.create({
          data: {
            name: reserva.nome,
            email: reserva.email,
            idEmpresa,
            idAutenticacaoSupabase: identidade,
            emailVerified: false,
            ativo: true,
          },
        });
      await banco.conviteAdministrativo.update({
        where: { idConvite },
        data: { situacao: "CONCLUIDO" },
      });
      await auditar(banco, admin, "USUARIO_CONVIDADO", "empresa", idEmpresa, {
        idConvite,
      });
    });
    return { idConvite, enviado: true };
  } catch {
    await executarComoAdministrador(async (banco, admin) => {
      await banco.conviteAdministrativo.update({
        where: { idConvite },
        data: { situacao: "PENDENTE" },
      });
      await auditar(banco, admin, "CONVITE_PENDENTE", "empresa", idEmpresa, {
        idConvite,
      });
    });
    return {
      idConvite,
      enviado: false,
      aviso:
        "O cadastro está preservado, mas o convite aguarda envio. Verifique SMTP, URLs de redirecionamento e a chave administrativa Supabase. Use reenviar convite após regularizar.",
    };
  }
}
export async function criarAssinanteAdmin(entrada: unknown) {
  const dados = validarAdmin(esquemaCriarAssinante, entrada);
  const resultado = await executarComoAdministrador(async (banco, admin) => {
    const existente = await banco.usuario.findUnique({
      where: { email: dados.emailUsuario },
    });
    const conviteExistente = await banco.conviteAdministrativo.findUnique({
      where: { email: dados.emailUsuario },
    });
    if (existente || conviteExistente)
      throw new ErroDominio(
        "Este e-mail já possui um cadastro ou convite. Consulte o assinante existente.",
      );
    const config = await configuracao(banco);
    const empresa = await banco.empresa.create({
      data: { nome: dados.nome, telefone: dados.telefone || null },
    });
    const assinatura = await banco.assinatura.create({
      data: {
        idEmpresa: empresa.idEmpresa,
        nomePlano: config.nomePlano,
        valorMensalCentavos: config.valorMensalCentavos,
        limiteUsuariosAtivos: 2,
        situacao: "ATIVA",
        dataInicio: dataCalendario(dados.dataInicio),
        dataVencimento: dataCalendario(dados.primeiroVencimento),
      },
    });
    await banco.cobranca.create({
      data: {
        idEmpresa: empresa.idEmpresa,
        idAssinatura: assinatura.idAssinatura,
        valorCentavos: config.valorMensalCentavos,
        dataVencimento: dataCalendario(dados.primeiroVencimento),
        acessoAte: dataCalendario(proximoMes(dados.primeiroVencimento)),
      },
    });
    const convite = await banco.conviteAdministrativo.create({
      data: {
        idEmpresa: empresa.idEmpresa,
        nome: dados.nomeUsuario,
        email: dados.emailUsuario,
      },
    });
    await auditar(
      banco,
      admin,
      "EMPRESA_CRIADA",
      "empresa",
      empresa.idEmpresa,
      { idAssinatura: assinatura.idAssinatura, idConvite: convite.idConvite },
    );
    return { idEmpresa: empresa.idEmpresa, idConvite: convite.idConvite };
  });
  return {
    ...resultado,
    convite: await enviarConviteAdmin(resultado.idEmpresa, resultado.idConvite),
  };
}
export async function adicionarUsuarioAdmin(
  idEmpresa: string,
  entrada: unknown,
) {
  validarIdAdmin(idEmpresa);
  const dados = validarAdmin(
    z
      .object({
        nome: z.string().trim().min(1).max(160),
        email: z
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
      })
      .strict(),
    entrada,
  );
  const convite = await executarComoAdministrador(async (banco, admin) => {
    if (!(await banco.empresa.findUnique({ where: { idEmpresa } })))
      throw new ErroDominio("Empresa não encontrada.", 404);
    await banco.empresa.update({
      where: { idEmpresa },
      data: { dataAtualizacao: new Date() },
    });
    const ativos = await banco.usuario.count({
      where: { idEmpresa, ativo: true },
    });
    const pendentes = await banco.conviteAdministrativo.count({
      where: { idEmpresa, situacao: { not: "CONCLUIDO" } },
    });
    if (ativos + pendentes >= 2)
      throw new ErroDominio(
        "A empresa já possui duas vagas ocupadas ou reservadas.",
      );
    if (
      (await banco.usuario.findUnique({ where: { email: dados.email } })) ||
      (await banco.conviteAdministrativo.findUnique({
        where: { email: dados.email },
      }))
    )
      throw new ErroDominio("Este e-mail já possui cadastro ou convite.");
    const c = await banco.conviteAdministrativo.create({
      data: { idEmpresa, ...dados },
    });
    await auditar(banco, admin, "CONVITE_CRIADO", "empresa", idEmpresa, {
      idConvite: c.idConvite,
    });
    return c;
  });
  return enviarConviteAdmin(idEmpresa, convite.idConvite);
}
