import type { ZodIssue } from "zod";

export type ErroCampo = { campo: string; mensagem: string };

const rotulos: Record<string, string> = {
  nome: "Nome da empresa",
  telefone: "Telefone",
  clienteNome: "Nome do cliente",
  clienteTelefone: "Telefone do cliente",
  clienteEndereco: "Endereço",
  clienteCidade: "Cidade",
  clienteDocumento: "CPF/CNPJ",
  observacoes: "Observações",
  validadeDias: "Validade",
  situacao: "Situação",
  descontoTipo: "Tipo de desconto",
  descontoValor: "Desconto",
  itens: "Serviços",
  descricao: "Descrição do serviço",
  unidade: "Unidade",
  quantidadeMilesimos: "Quantidade",
  valorUnitarioCentavos: "Valor unitário",
};

function campoConhecido(path: ZodIssue["path"]): string {
  if (
    path.length === 1 &&
    typeof path[0] === "string" &&
    Object.hasOwn(rotulos, path[0])
  )
    return path[0];
  if (
    path.length === 3 &&
    path[0] === "itens" &&
    typeof path[1] === "number" &&
    Number.isSafeInteger(path[1]) &&
    path[1] >= 0 &&
    path[1] < 100 &&
    typeof path[2] === "string" &&
    [
      "descricao",
      "unidade",
      "quantidadeMilesimos",
      "valorUnitarioCentavos",
    ].includes(path[2])
  )
    return path.join(".");
  return "";
}

function mensagemSegura(issue: ZodIssue, campo: string): string {
  if (!campo)
    return "Confira os dados enviados. Há um campo inválido ou não permitido.";
  const chave = campo.split(".").at(-1)!;
  const rotulo = rotulos[chave];
  if (issue.code === "custom" && chave === "descontoValor")
    return "O percentual de desconto não pode ultrapassar 100%.";
  if (issue.code === "too_small" || issue.code === "too_big") {
    if (chave === "quantidadeMilesimos")
      return "Informe uma quantidade entre 0,001 e 100.000.";
    if (chave === "valorUnitarioCentavos")
      return "Informe um valor unitário entre R$ 0,00 e R$ 1.000.000,00.";
    if (chave === "descontoValor")
      return "Informe um desconto entre R$ 0,00 e R$ 1.000.000,00.";
    if (chave === "validadeDias")
      return "Informe uma validade entre 1 e 365 dias.";
    if (chave === "itens") return "Inclua entre 1 e 100 serviços.";
    if (issue.code === "too_small")
      return `Preencha ${rotulo.toLocaleLowerCase("pt-BR")}.`;
    if (issue.origin === "string")
      return `${rotulo}: use no máximo ${String(issue.maximum)} caracteres.`;
  }
  if (
    issue.code === "invalid_type" &&
    [
      "quantidadeMilesimos",
      "valorUnitarioCentavos",
      "descontoValor",
      "validadeDias",
    ].includes(chave)
  )
    return `${rotulo}: informe um número válido.`;
  return `${rotulo}: confira o valor informado.`;
}

/** Traduz somente campos conhecidos; nunca replica mensagens, valores ou chaves recebidos. */
export function traduzirErrosValidacao(
  issues: readonly ZodIssue[],
): ErroCampo[] {
  const campos = new Map<string, ErroCampo>();
  for (const issue of issues) {
    const campo = campoConhecido(issue.path);
    if (!campos.has(campo))
      campos.set(campo, { campo, mensagem: mensagemSegura(issue, campo) });
  }
  return [...campos.values()];
}
