import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { obterAmbiente } from "@/bibliotecas/ambiente";
import { obterBanco } from "@/bibliotecas/banco";

function criarAutenticacao() {
  const ambiente = obterAmbiente();

  return betterAuth({
    appName: "Orçamentos",
    baseURL: ambiente.BETTER_AUTH_URL,
    secret: ambiente.BETTER_AUTH_SECRET,
    trustedOrigins: [ambiente.APP_URL],
    database: prismaAdapter(obterBanco(), { provider: "postgresql" }),
    emailAndPassword: { enabled: true, disableSignUp: true },
    user: {
      modelName: "usuario",
      additionalFields: {
        idEmpresa: { type: "string", required: true, input: false },
        ativo: {
          type: "boolean",
          required: true,
          defaultValue: true,
          input: false,
        },
      },
    },
    session: { modelName: "sessao", cookieCache: { enabled: false } },
    account: { modelName: "conta" },
    verification: { modelName: "verificacao" },
    databaseHooks: {
      session: {
        create: {
          before: async (sessao) => {
            const usuario = await obterBanco().usuario.findUnique({
              where: { id: sessao.userId },
              select: {
                ativo: true,
                empresa: {
                  select: {
                    ativa: true,
                    assinatura: { select: { situacao: true } },
                  },
                },
              },
            });
            if (
              !usuario?.ativo ||
              !usuario.empresa.ativa ||
              usuario.empresa.assinatura?.situacao !== "ATIVA"
            ) {
              throw new APIError("FORBIDDEN", {
                message: "Acesso à empresa indisponível.",
              });
            }
          },
        },
      },
    },
  });
}

let autenticacao: ReturnType<typeof criarAutenticacao> | undefined;

export function obterAutenticacao() {
  autenticacao ??= criarAutenticacao();
  return autenticacao;
}
