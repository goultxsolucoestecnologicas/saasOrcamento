import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/gerado/prisma/client";
import { criarEscopoEmpresa } from "./escopo-empresa";

const modelos = [
  "empresa",
  "assinatura",
  "orcamento",
  "orcamentoItem",
] as const;
const metodos = [
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "create",
  "createMany",
  "createManyAndReturn",
  "upsert",
];
function criarSimulacao() {
  const delegates = Object.fromEntries(
    modelos.map((modelo) => [
      modelo,
      Object.fromEntries(
        metodos.map((metodo) => [metodo, vi.fn().mockResolvedValue([])]),
      ),
    ]),
  ) as Record<
    (typeof modelos)[number],
    Record<string, ReturnType<typeof vi.fn>>
  >;
  const transacao = {
    ...delegates,
    usuario: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  } as unknown as Prisma.TransactionClient;
  const escopo = criarEscopoEmpresa(transacao, "empresa-a");
  return { delegates, escopo, transacao };
}

describe("escopo automático dos delegates de domínio", () => {
  let simulacao: ReturnType<typeof criarSimulacao>;
  beforeEach(() => {
    simulacao = criarSimulacao();
  });

  it.each(modelos)(
    "injeta empresa em consulta sem filtro de %s",
    async (modelo) => {
      const consultar = simulacao.escopo[modelo]
        .findMany as () => Promise<unknown>;
      await consultar();
      expect(simulacao.delegates[modelo].findMany).toHaveBeenCalledWith({
        where: { idEmpresa: "empresa-a" },
      });
    },
  );

  it.each([
    "findFirst",
    "findUnique",
    "count",
    "aggregate",
    "groupBy",
    "delete",
    "deleteMany",
  ])("protege %s contra OR e empresa forjada", async (metodo) => {
    const delegate = simulacao.escopo.orcamento as unknown as Record<
      string,
      (entrada: unknown) => Promise<unknown>
    >;
    const where = {
      idEmpresa: "empresa-b",
      OR: [{ idEmpresa: "empresa-b" }, {}],
    };
    await delegate[metodo]({ where });
    expect(simulacao.delegates.orcamento[metodo]).toHaveBeenCalledWith({
      where: { ...where, idEmpresa: "empresa-a" },
    });
  });

  it("não expõe SQL bruto, autenticação ou métodos desconhecidos", () => {
    const escopo = simulacao.escopo as unknown as Record<string, unknown>;
    expect(escopo.$queryRaw).toBeUndefined();
    expect(escopo.$executeRaw).toBeUndefined();
    expect(escopo.usuario).toBeUndefined();
    expect(escopo.sessao).toBeUndefined();
    expect(escopo.conta).toBeUndefined();
    expect(
      (escopo.orcamento as Record<string, unknown>).findRaw,
    ).toBeUndefined();
    expect(
      (escopo.orcamento as Record<string, unknown>).constructor,
    ).toBeUndefined();
  });

  it("injeta escopo em atualização válida sem filtro informado", async () => {
    await simulacao.escopo.orcamento.updateMany({
      data: { clienteNome: "Novo" },
    });
    expect(simulacao.delegates.orcamento.updateMany).toHaveBeenCalledWith({
      where: { idEmpresa: "empresa-a" },
      data: { clienteNome: "Novo" },
    });
  });

  it("sobrescreve empresa forjada na criação", async () => {
    await simulacao.escopo.orcamento.create({
      data: { idEmpresa: "empresa-b", numero: 1, clienteNome: "Cliente" },
    });
    expect(simulacao.delegates.orcamento.create).toHaveBeenCalledWith({
      data: { idEmpresa: "empresa-a", numero: 1, clienteNome: "Cliente" },
    });
  });

  it("injeta empresa em cada criação em lote", async () => {
    await simulacao.escopo.orcamentoItem.createMany({
      data: [
        {
          idEmpresa: "empresa-b",
          idOrcamento: "orcamento",
          descricao: "Serviço",
          quantidadeMilesimos: 1000,
          valorUnitarioCentavos: 100,
          subtotalCentavos: 100,
          ordem: 0,
        },
      ],
    });
    expect(simulacao.delegates.orcamentoItem.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ idEmpresa: "empresa-a" })],
    });
  });

  it.each([
    { idEmpresa: "empresa-b" },
    { idEmpresa: { set: "empresa-b" } },
    { empresa: { connect: { idEmpresa: "empresa-b" } } },
    { orcamento: { connect: { idOrcamento: "orcamento-b" } } },
    { itens: { connect: { idItem: "item-b" } } },
  ])("nega reatribuição ou relações aninhadas em atualização", async (data) => {
    const atualizar = simulacao.escopo.orcamento.updateMany as (
      entrada: unknown,
    ) => Promise<unknown>;
    await expect(atualizar({ data })).rejects.toMatchObject({ status: 400 });
    expect(simulacao.delegates.orcamento.updateMany).not.toHaveBeenCalled();
  });

  it("aplica escopo no upsert e protege o ramo de criação", async () => {
    await simulacao.escopo.orcamento.upsert({
      where: { idOrcamento: "orcamento" },
      create: { idEmpresa: "empresa-b", numero: 1, clienteNome: "Cliente" },
      update: { clienteNome: "Novo" },
    });
    expect(simulacao.delegates.orcamento.upsert).toHaveBeenCalledWith({
      where: { idOrcamento: "orcamento", idEmpresa: "empresa-a" },
      create: { idEmpresa: "empresa-a", numero: 1, clienteNome: "Cliente" },
      update: { clienteNome: "Novo" },
    });
    await expect(
      simulacao.escopo.orcamento.upsert({
        where: { idOrcamento: "orcamento" },
        create: { idEmpresa: "empresa-a", numero: 1, clienteNome: "Cliente" },
        update: { idEmpresa: "empresa-b" },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("herda o tenant da FK composta do pai em itens aninhados", async () => {
    await simulacao.escopo.orcamento.create({
      data: {
        idEmpresa: "empresa-a",
        numero: 1,
        clienteNome: "Cliente",
        itens: {
          create: [
            {
              descricao: "Serviço",
              quantidadeMilesimos: 1000,
              valorUnitarioCentavos: 100,
              subtotalCentavos: 100,
              ordem: 0,
            },
          ],
        },
      },
    });
    expect(simulacao.delegates.orcamento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        itens: {
          create: [expect.objectContaining({ descricao: "Serviço" })],
        },
      }),
    });
    const dados = simulacao.delegates.orcamento.create.mock.calls[0][0].data;
    expect(dados.idEmpresa).toBe("empresa-a");
    expect(dados.itens.create[0]).not.toHaveProperty("idEmpresa");
  });

  it("nega item aninhado de outra empresa e connect existente", async () => {
    const criar = simulacao.escopo.orcamento.create as (
      entrada: unknown,
    ) => Promise<unknown>;
    await expect(
      criar({ data: { itens: { create: [{ idEmpresa: "empresa-b" }] } } }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      criar({ data: { itens: { connect: { idItem: "item-b" } } } }),
    ).rejects.toMatchObject({ status: 400 });
    expect(simulacao.delegates.orcamento.create).not.toHaveBeenCalled();
  });

  it("createMany aninhado usa somente a FK herdada do pai", async () => {
    const criar = simulacao.escopo.orcamento.create as (
      entrada: unknown,
    ) => Promise<unknown>;
    await criar({
      data: {
        idEmpresa: "empresa-b",
        itens: {
          createMany: {
            data: [{ idEmpresa: "empresa-a", descricao: "Serviço" }],
          },
        },
      },
    });
    expect(simulacao.delegates.orcamento.create).toHaveBeenCalledWith({
      data: {
        idEmpresa: "empresa-a",
        itens: { createMany: { data: [{ descricao: "Serviço" }] } },
      },
    });
    await expect(
      criar({
        data: { itens: { createMany: { data: [{ idEmpresa: "empresa-b" }] } } },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("nega navegação por include aos modelos de autenticação", async () => {
    const consultar = simulacao.escopo.empresa.findMany as (
      entrada: unknown,
    ) => Promise<unknown>;
    await expect(
      consultar({ include: { usuarios: { include: { contas: true } } } }),
    ).rejects.toMatchObject({ status: 400 });
    expect(simulacao.delegates.empresa.findMany).not.toHaveBeenCalled();
  });
});
