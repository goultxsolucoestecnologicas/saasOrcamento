import { z } from "zod";

const esquemaAmbiente = z.object({
  DATABASE_URL: z.url().refine((valor) => /^postgres(ql)?:\/\//.test(valor), {
    message: "Utilize uma URL de conexão PostgreSQL.",
  }),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  APP_URL: z.url(),
  ARMAZENAMENTO_LOCAL_DIRETORIO: z.string().trim().min(1),
});

export type Ambiente = z.infer<typeof esquemaAmbiente>;

let ambiente: Ambiente | undefined;

export function obterAmbiente(): Ambiente {
  if (ambiente) return ambiente;

  const resultado = esquemaAmbiente.safeParse(process.env);
  if (!resultado.success) {
    const campos = resultado.error.issues
      .map((erro) => erro.path.join("."))
      .join(", ");
    throw new Error(
      `Variáveis de ambiente ausentes ou inválidas: ${campos}. Consulte .env.example.`,
    );
  }

  ambiente = resultado.data;
  return ambiente;
}
