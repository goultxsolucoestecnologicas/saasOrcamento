import { z } from "zod";
import { obterAutenticacao } from "@/bibliotecas/autenticacao";
import { obterDestinoAcesso } from "@/bibliotecas/destino-acesso";
import {
  responderApi,
  verificarOrigem,
  lerJsonLimitado,
} from "@/bibliotecas/respostas-api";
import { ErroDominio } from "@/bibliotecas/erro-dominio";
export const dynamic = "force-dynamic";
export async function PUT(requisicao: Request) {
  return responderApi(async () => {
    verificarOrigem(requisicao);
    await obterDestinoAcesso();
    const dados = z
      .object({
        senha: z
          .string()
          .min(12)
          .max(128)
          .regex(/[A-Za-z]/)
          .regex(/[0-9]/),
      })
      .strict()
      .safeParse(await lerJsonLimitado(requisicao));
    if (!dados.success)
      throw new ErroDominio(
        "Use uma senha de 12 a 128 caracteres, incluindo letras e números.",
      );
    const autenticacao = await obterAutenticacao();
    const { error } = await autenticacao.auth.updateUser({
      password: dados.data.senha,
    });
    if (error)
      throw new ErroDominio(
        "Não foi possível atualizar a senha. Solicite um novo convite e tente novamente.",
      );
    return { atualizado: true };
  });
}
