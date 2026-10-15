import { z } from "zod";

const textoOpcional = (limite: number) =>
  z.string().trim().max(limite).nullable().optional();
export const esquemaDataEmissao = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((valor) => {
    const data = new Date(valor + "T00:00:00.000Z");
    return (
      valor.slice(0, 4) !== "0000" &&
      !Number.isNaN(data.getTime()) &&
      data.toISOString().slice(0, 10) === valor
    );
  }, "Informe uma data válida.");
/** Converte instante para a data civil de São Paulo, sem depender do navegador. */
export function dataCivilSaoPaulo(data: Date | string = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(data));
  const obter = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)!.value;
  return obter("year") + "-" + obter("month") + "-" + obter("day");
}
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
    clienteNumeroEndereco: textoOpcional(20),
    clienteInscricaoEstadual: textoOpcional(30),
    tipoDocumento: z.enum(["ORCAMENTO", "PEDIDO"]).optional(),
    dataEmissao: esquemaDataEmissao.optional(),
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
