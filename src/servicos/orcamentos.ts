import "server-only";
import { executarComDadosDaEmpresa } from "@/bibliotecas/dados-empresa";
import { ErroDominio } from "@/bibliotecas/erro-dominio";
import { calcularOrcamento } from "@/funcionalidades/orcamentos/calculos";
import { esquemaIdOrcamento, esquemaOrcamento } from "@/validacoes/orcamento";
import { traduzirErrosValidacao } from "@/validacoes/mensagens-validacao";

const incluirItens = { itens: { orderBy: { ordem: "asc" as const } } };
function validarId(id: string) {
  const resultado = esquemaIdOrcamento.safeParse(id);
  if (!resultado.success)
    throw new ErroDominio("Identificador de orçamento inválido.");
  return resultado.data;
}

function prepararOrcamento(entrada: unknown) {
  const resultado = esquemaOrcamento.safeParse(entrada);
  if (!resultado.success)
    throw new ErroDominio(
      "Dados do orçamento inválidos. Confira o cliente, os itens e os descontos.",
      400,
      traduzirErrosValidacao(resultado.error.issues),
    );
  const { itens, ...dados } = resultado.data;
  const calculo = calcularOrcamento({ ...dados, itens });
  return {
    dados: {
      ...dados,
      clienteTelefone: dados.clienteTelefone ?? null,
      clienteEndereco: dados.clienteEndereco ?? null,
      clienteCidade: dados.clienteCidade ?? null,
      clienteDocumento: dados.clienteDocumento ?? null,
      observacoes: dados.observacoes ?? null,
      validadeDias: dados.validadeDias ?? null,
      subtotalCentavos: calculo.subtotalCentavos,
      totalCentavos: calculo.totalCentavos,
    },
    itens: calculo.itens,
  };
}

export async function listarOrcamentos(busca = "", antesDeNumero?: number) {
  if (typeof busca !== "string" || busca.trim().length > 150)
    throw new ErroDominio("A busca deve conter até 150 caracteres.");
  if (
    antesDeNumero !== undefined &&
    (!Number.isInteger(antesDeNumero) ||
      antesDeNumero < 1 ||
      antesDeNumero > 2_147_483_647)
  )
    throw new ErroDominio("Cursor de paginação inválido.");
  const termo = busca.trim();
  const numeroBusca = /^#?\d+$/.test(termo)
    ? Number(termo.replace(/^#/, ""))
    : undefined;
  const numeroValido =
    numeroBusca !== undefined &&
    Number.isInteger(numeroBusca) &&
    numeroBusca >= 1 &&
    numeroBusca <= 2_147_483_647;
  return executarComDadosDaEmpresa(async (transacao, contexto) => {
    const encontrados = await transacao.orcamento.findMany({
      where: {
        idEmpresa: contexto.idEmpresa,
        ...(antesDeNumero !== undefined
          ? { numero: { lt: antesDeNumero } }
          : {}),
        ...(termo
          ? {
              OR: [
                {
                  clienteNome: {
                    contains: termo,
                    mode: "insensitive" as const,
                  },
                },
                ...(numeroValido ? [{ numero: numeroBusca }] : []),
              ],
            }
          : {}),
      },
      orderBy: { numero: "desc" },
      take: 51,
      include: incluirItens,
    });
    const orcamentos = encontrados.slice(0, 50);
    return {
      orcamentos,
      proximoNumero: encontrados.length > 50 ? orcamentos[49].numero : null,
    };
  });
}

export async function buscarOrcamento(id: string) {
  const idOrcamento = validarId(id);
  return executarComDadosDaEmpresa(async (transacao, contexto) => {
    const orcamento = await transacao.orcamento.findFirst({
      where: { idOrcamento, idEmpresa: contexto.idEmpresa },
      include: incluirItens,
    });
    if (!orcamento) throw new ErroDominio("Orçamento não encontrado.", 404);
    return orcamento;
  });
}

export async function criarOrcamento(entrada: unknown) {
  const { dados, itens } = prepararOrcamento(entrada);
  return executarComDadosDaEmpresa(async (transacao, contexto) => {
    const empresa = await transacao.empresa.update({
      where: { idEmpresa: contexto.idEmpresa },
      data: { proximoNumeroOrcamento: { increment: 1 } },
      select: { proximoNumeroOrcamento: true },
    });
    return transacao.orcamento.create({
      data: {
        ...dados,
        numero: empresa.proximoNumeroOrcamento - 1,
        idEmpresa: contexto.idEmpresa,
        itens: {
          create: itens,
        },
      },
      include: incluirItens,
    });
  });
}

export async function atualizarOrcamento(id: string, entrada: unknown) {
  const idOrcamento = validarId(id);
  const { dados, itens } = prepararOrcamento(entrada);
  return executarComDadosDaEmpresa(async (transacao, contexto) => {
    const where = { idOrcamento, idEmpresa: contexto.idEmpresa };
    const alteracao = await transacao.orcamento.updateMany({
      where,
      data: dados,
    });
    if (alteracao.count !== 1)
      throw new ErroDominio("Orçamento não encontrado.", 404);
    await transacao.orcamentoItem.deleteMany({ where });
    await transacao.orcamentoItem.createMany({
      data: itens.map((item) => ({ ...item, ...where })),
    });
    const orcamento = await transacao.orcamento.findFirst({
      where,
      include: incluirItens,
    });
    if (!orcamento) throw new ErroDominio("Orçamento não encontrado.", 404);
    return orcamento;
  });
}

export async function excluirOrcamento(id: string) {
  const idOrcamento = validarId(id);
  return executarComDadosDaEmpresa(async (transacao, contexto) => {
    const exclusao = await transacao.orcamento.deleteMany({
      where: { idOrcamento, idEmpresa: contexto.idEmpresa },
    });
    if (exclusao.count !== 1)
      throw new ErroDominio("Orçamento não encontrado.", 404);
    return { idOrcamento };
  });
}
