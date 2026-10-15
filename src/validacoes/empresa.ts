import { z } from "zod";
const textoOpcional = (limite: number) =>
  z.string().trim().max(limite).nullable().optional();
export const estadosBrasileiros = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;
export const esquemaEmpresa = z
  .object({
    nome: z.string().trim().max(150).optional(),
    telefone: textoOpcional(30),
    descricaoAtividade: textoOpcional(300),
    nomeResponsavel: textoOpcional(150),
    cidade: textoOpcional(120),
    estado: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (valor) =>
          valor === "" || estadosBrasileiros.some((uf) => uf === valor),
        "Informe uma UF brasileira válida.",
      )
      .nullable()
      .optional(),
    instagram: textoOpcional(150),
    facebook: textoOpcional(150),
    slogan: textoOpcional(200),
  })
  .strict();
export type EmpresaEntrada = z.infer<typeof esquemaEmpresa>;
