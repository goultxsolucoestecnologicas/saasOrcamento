import { z } from "zod";

const textoOpcional = (limite: number) =>
  z.string().trim().max(limite).nullable().optional();
export const esquemaIdOrcamento = z.uuid();
export const esquemaItemOrcamento = z
  .object({
    descricao: z.string().trim().min(1).max(500),
    unidade: z.string().trim().min(1).max(20).default("un"),
    quantidadeMilesimos: z.number().int().min(1).max(100_000_000),
    valorUnitarioCentavos: z.number().int().min(0).max(100_000_000),
  })
  .strict();

export const esquemaOrcamento = z
  .object({
    clienteNome: z.string().trim().min(1).max(150),
    clienteTelefone: textoOpcional(30),
    clienteEndereco: textoOpcional(300),
    clienteCidade: textoOpcional(120),
    clienteDocumento: textoOpcional(30),
    observacoes: textoOpcional(4000),
    validadeDias: z.number().int().min(1).max(365).nullable().optional(),
    situacao: z
      .enum(["RASCUNHO", "ENVIADO", "APROVADO", "RECUSADO", "CANCELADO"])
      .default("RASCUNHO"),
    descontoTipo: z.enum(["FIXO", "PERCENTUAL"]).default("FIXO"),
    descontoValor: z.number().int().min(0).max(100_000_000).default(0),
    itens: z.array(esquemaItemOrcamento).min(1).max(100),
  })
  .strict()
  .superRefine((valor, contexto) => {
    if (valor.descontoTipo === "PERCENTUAL" && valor.descontoValor > 10_000)
      contexto.addIssue({
        code: "custom",
        path: ["descontoValor"],
        message: "O percentual não pode ultrapassar 100%.",
      });
  });

export type ItemOrcamentoEntrada = z.infer<typeof esquemaItemOrcamento>;
export type OrcamentoEntrada = z.infer<typeof esquemaOrcamento>;
