import { ErroDominio } from "@/bibliotecas/erro-dominio";

export function dataCalendario(valor: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor))
    throw new ErroDominio("Informe uma data válida (AAAA-MM-DD).");
  const data = new Date(`${valor}T00:00:00.000Z`);
  if (
    !Number.isFinite(data.getTime()) ||
    data.toISOString().slice(0, 10) !== valor ||
    valor < "2000-01-01" ||
    valor > "2199-12-31"
  )
    throw new ErroDominio("Informe uma data válida entre 2000 e 2199.");
  return data;
}
export function hojeSaoPaulo(instante = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instante);
  return ["year", "month", "day"]
    .map((chave) => partes.find((p) => p.type === chave)!.value)
    .join("-");
}
export function diasEntre(inicio: string, fim: string): number {
  return Math.round(
    (dataCalendario(fim).getTime() - dataCalendario(inicio).getTime()) /
      86400000,
  );
}
export function avaliarVencimento(
  vencimento: string,
  paga: boolean,
  tolerancia: number,
  hoje = hojeSaoPaulo(),
) {
  const dias = diasEntre(hoje, vencimento);
  return {
    dias,
    emAtraso: !paga && dias < 0,
    elegivelSuspensao: !paga && dias < -tolerancia,
  };
}
export function proximoMes(data: string): string {
  const origem = dataCalendario(data);
  const dia = origem.getUTCDate();
  origem.setUTCDate(1);
  origem.setUTCMonth(origem.getUTCMonth() + 1);
  const ultimo = new Date(
    Date.UTC(origem.getUTCFullYear(), origem.getUTCMonth() + 1, 0),
  ).getUTCDate();
  origem.setUTCDate(Math.min(dia, ultimo));
  return origem.toISOString().slice(0, 10);
}
export function decidirQuitacao(
  situacao: string,
  pagamentoExistente: boolean,
): "CONFIRMAR" | "JA_CONFIRMADO" {
  if (situacao === "PAGA" && pagamentoExistente) return "JA_CONFIRMADO";
  if (situacao !== "PENDENTE" || pagamentoExistente)
    throw new ErroDominio("Esta cobrança não pode ser quitada.");
  return "CONFIRMAR";
}
