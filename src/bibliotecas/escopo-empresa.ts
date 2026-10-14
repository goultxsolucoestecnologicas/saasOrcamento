import "server-only";
import type { Prisma } from "@/gerado/prisma/client";
import { ErroDominio } from "@/bibliotecas/erro-dominio";

export type TransacaoEmpresa = Pick<
  Prisma.TransactionClient,
  "empresa" | "assinatura" | "orcamento" | "orcamentoItem"
>;
type ModeloEmpresa = keyof TransacaoEmpresa;
type Registro = Record<string, unknown>;

const leituras = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
const atualizacoes = new Set(["update", "updateMany", "updateManyAndReturn"]);
const criacoes = new Set(["create", "createMany", "createManyAndReturn"]);
const exclusoes = new Set(["delete", "deleteMany"]);
const relacoesProtegidas = new Set([
  "empresa",
  "orcamento",
  "assinatura",
  "orcamentos",
  "usuario",
  "usuarios",
  "contas",
  "sessoes",
]);

function registro(valor: unknown): Registro {
  if (valor === undefined) return {};
  if (typeof valor !== "object" || valor === null || Array.isArray(valor))
    throw new ErroDominio("Operação de dados inválida.");
  return valor as Registro;
}

function negarRelacoesAutenticacao(valor: unknown): void {
  if (Array.isArray(valor)) {
    valor.forEach(negarRelacoesAutenticacao);
    return;
  }
  if (typeof valor !== "object" || valor === null) return;
  for (const [campo, conteudo] of Object.entries(valor)) {
    if (["usuario", "usuarios", "contas", "sessoes"].includes(campo))
      throw new ErroDominio(
        "Esta operação não permite acesso aos dados de autenticação.",
      );
    negarRelacoesAutenticacao(conteudo);
  }
}

function criarDados(
  valor: unknown,
  modelo: ModeloEmpresa,
  idEmpresa: string,
  itemAninhado = false,
): Registro {
  const dados = registro(valor);
  if (
    itemAninhado &&
    dados.idEmpresa !== undefined &&
    dados.idEmpresa !== idEmpresa
  )
    throw new ErroDominio("O item deve pertencer à empresa autenticada.");
  for (const campo of Object.keys(dados)) {
    if (relacoesProtegidas.has(campo))
      throw new ErroDominio(
        "Vínculos de empresa devem ser definidos pelo contexto autenticado.",
      );
  }
  const protegidos: Registro = { ...dados, idEmpresa };
  if (itemAninhado) {
    // A FK composta herda os campos do pai; o Prisma não os aceita aqui.
    if (dados.idOrcamento !== undefined)
      throw new ErroDominio(
        "O vínculo do item deve ser definido pelo orçamento pai.",
      );
    delete protegidos.idEmpresa;
  }
  if (dados.itens !== undefined) {
    if (modelo !== "orcamento")
      throw new ErroDominio("Operação aninhada inválida.");
    const itens = registro(dados.itens);
    if (
      Object.keys(itens).some(
        (campo) => campo !== "create" && campo !== "createMany",
      ) ||
      (itens.create !== undefined && itens.createMany !== undefined)
    )
      throw new ErroDominio("Somente a criação de novos itens é permitida.");
    if (itens.create !== undefined) {
      const criados = Array.isArray(itens.create)
        ? itens.create
        : [itens.create];
      protegidos.itens = {
        create: criados.map((item) =>
          criarDados(item, "orcamentoItem", idEmpresa, true),
        ),
      };
    } else if (itens.createMany !== undefined) {
      const criados = registro(itens.createMany);
      if (
        Object.keys(criados).some(
          (campo) => campo !== "data" && campo !== "skipDuplicates",
        )
      )
        throw new ErroDominio("Operação aninhada inválida.");
      const linhas = Array.isArray(criados.data)
        ? criados.data
        : [criados.data];
      protegidos.itens = {
        createMany: {
          ...criados,
          data: linhas.map((item) =>
            criarDados(item, "orcamentoItem", idEmpresa, true),
          ),
        },
      };
    } else throw new ErroDominio("Informe os itens a criar.");
  }
  return protegidos;
}

function atualizarDados(valor: unknown): Registro {
  const dados = registro(valor);
  if (
    Object.keys(dados).some(
      (campo) =>
        campo === "idEmpresa" ||
        campo === "itens" ||
        relacoesProtegidas.has(campo),
    )
  )
    throw new ErroDominio(
      "Não é permitido alterar os vínculos de empresa por esta operação.",
    );
  return { ...dados };
}

function protegerArgumentos(
  metodo: string,
  valor: unknown,
  modelo: ModeloEmpresa,
  idEmpresa: string,
): Registro {
  const argumentos = registro(valor);
  negarRelacoesAutenticacao(argumentos);
  const where = { ...registro(argumentos.where), idEmpresa };
  if (leituras.has(metodo) || exclusoes.has(metodo))
    return { ...argumentos, where };
  if (atualizacoes.has(metodo))
    return { ...argumentos, where, data: atualizarDados(argumentos.data) };
  if (criacoes.has(metodo)) {
    const data = Array.isArray(argumentos.data)
      ? argumentos.data.map((linha) => criarDados(linha, modelo, idEmpresa))
      : criarDados(argumentos.data, modelo, idEmpresa);
    return { ...argumentos, data };
  }
  if (metodo === "upsert")
    return {
      ...argumentos,
      where,
      create: criarDados(argumentos.create, modelo, idEmpresa),
      update: atualizarDados(argumentos.update),
    };
  throw new ErroDominio("Operação de dados indisponível neste contexto.");
}

export function criarEscopoEmpresa(
  transacao: Prisma.TransactionClient,
  idEmpresa: string,
): TransacaoEmpresa {
  function protegerDelegate(modelo: ModeloEmpresa) {
    const delegate = transacao[modelo] as unknown as Registro;
    return new Proxy(
      {},
      {
        get(_alvo, propriedade) {
          if (
            typeof propriedade !== "string" ||
            !(
              leituras.has(propriedade) ||
              atualizacoes.has(propriedade) ||
              criacoes.has(propriedade) ||
              exclusoes.has(propriedade) ||
              propriedade === "upsert"
            )
          )
            return undefined;
          return async (argumentos?: unknown) => {
            const protegidos = protegerArgumentos(
              propriedade,
              argumentos,
              modelo,
              idEmpresa,
            );
            const metodo = delegate[propriedade];
            if (typeof metodo !== "function")
              throw new ErroDominio(
                "Operação de dados indisponível neste contexto.",
              );
            return Reflect.apply(metodo, delegate, [protegidos]);
          };
        },
        set() {
          throw new ErroDominio("O contexto de dados não pode ser modificado.");
        },
      },
    );
  }
  return Object.freeze({
    empresa: protegerDelegate("empresa"),
    assinatura: protegerDelegate("assinatura"),
    orcamento: protegerDelegate("orcamento"),
    orcamentoItem: protegerDelegate("orcamentoItem"),
  }) as TransacaoEmpresa;
}
