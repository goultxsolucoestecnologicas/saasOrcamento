import { beforeEach, describe, expect, it, vi } from "vitest";

const simulacoes = vi.hoisted(() => ({
  transacao: {
    empresa: { update: vi.fn() },
    orcamento: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    orcamentoItem: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}));
vi.mock("@/bibliotecas/dados-empresa", () => ({
  executarComDadosDaEmpresa: async (
    operacao: (transacao: unknown, contexto: unknown) => Promise<unknown>,
  ) =>
    operacao(simulacoes.transacao, {
      idEmpresa: "empresa-a",
      idUsuario: "usuario-a",
    }),
}));
import {
  atualizarOrcamento,
  buscarOrcamento,
  criarOrcamento,
  excluirOrcamento,
  listarOrcamentos,
} from "./orcamentos";
import { esquemaOrcamento } from "@/validacoes/orcamento";
import { traduzirErrosValidacao } from "@/validacoes/mensagens-validacao";
import type { ZodIssue } from "zod";
const idOrcamento = "6e531a29-ef50-46a2-88bb-55904df9c763";
const dados = {
  clienteNome: "Cliente",
  itens: [
    {
      descricao: "Serviço",
      quantidadeMilesimos: 1500,
      valorUnitarioCentavos: 101,
    },
  ],
};

describe("orçamentos com escopo obrigatório", () => {
  beforeEach(() => vi.resetAllMocks());
  it("compartilha mensagens de campo entre validação cliente e servidor", async () => {
    const entrada = {
      ...dados,
      clienteNome: "",
      itens: [
        { descricao: "", quantidadeMilesimos: 0, valorUnitarioCentavos: -1 },
      ],
      descontoTipo: "PERCENTUAL",
      descontoValor: 10001,
    };
    const resultado = esquemaOrcamento.safeParse(entrada);
    expect(resultado.success).toBe(false);
    if (resultado.success) throw new Error("Esperava validação inválida");
    const campos = traduzirErrosValidacao(resultado.error.issues);
    expect(campos).toEqual(
      expect.arrayContaining([
        { campo: "clienteNome", mensagem: "Preencha nome do cliente." },
        {
          campo: "itens.0.descricao",
          mensagem: "Preencha descrição do serviço.",
        },
        {
          campo: "itens.0.quantidadeMilesimos",
          mensagem: "Informe uma quantidade entre 0,001 e 100.000.",
        },
        {
          campo: "descontoValor",
          mensagem: "O percentual de desconto não pode ultrapassar 100%.",
        },
      ]),
    );
    await expect(criarOrcamento(entrada)).rejects.toMatchObject({
      status: 400,
      campos,
    });
    expect(simulacoes.transacao.empresa.update).not.toHaveBeenCalled();
  });
  it("não replica mensagem arbitrária ou caminhos desconhecidos da validação", () => {
    const issues: ZodIssue[] = [
      {
        code: "custom",
        path: ["senha-secreta"],
        message: "postgres://segredo",
      },
      {
        code: "custom",
        path: ["itens", "segredo", "descricao"],
        message: "senha secreta",
      },
      { code: "custom", path: ["clienteNome"], message: "segredo interno" },
    ];
    const campos = traduzirErrosValidacao(issues);
    expect(campos).toHaveLength(2);
    expect(JSON.stringify(campos)).not.toContain("segredo");
    expect(campos[1]).toEqual({
      campo: "clienteNome",
      mensagem: "Nome do cliente: confira o valor informado.",
    });
  });
  it("lista a empresa autenticada com paginação e itens ordenados", async () => {
    simulacoes.transacao.orcamento.findMany.mockResolvedValue([]);
    expect(await listarOrcamentos()).toEqual({
      orcamentos: [],
      proximoNumero: null,
    });
    expect(simulacoes.transacao.orcamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idEmpresa: "empresa-a" },
        take: 51,
        orderBy: { numero: "desc" },
        include: { itens: { orderBy: { ordem: "asc" } } },
      }),
    );
  });
  it("busca cliente no servidor e preserva escopo e cursor", async () => {
    simulacoes.transacao.orcamento.findMany.mockResolvedValue([]);
    await listarOrcamentos(" Ana ", 100);
    expect(simulacoes.transacao.orcamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          idEmpresa: "empresa-a",
          numero: { lt: 100 },
          OR: [{ clienteNome: { contains: "Ana", mode: "insensitive" } }],
        },
      }),
    );
  });
  it.each(["123", "#00123"])(
    "busca número exato a partir de %s",
    async (busca) => {
      simulacoes.transacao.orcamento.findMany.mockResolvedValue([]);
      await listarOrcamentos(busca);
      expect(simulacoes.transacao.orcamento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            idEmpresa: "empresa-a",
            OR: [
              { clienteNome: { contains: busca, mode: "insensitive" } },
              { numero: 123 },
            ],
          },
        }),
      );
    },
  );
  it("não envia número acima do inteiro PostgreSQL para o banco", async () => {
    simulacoes.transacao.orcamento.findMany.mockResolvedValue([]);
    await listarOrcamentos("999999999999999999999999999");
    const argumentos = simulacoes.transacao.orcamento.findMany.mock.calls[0][0];
    expect(argumentos.where.OR).toHaveLength(1);
  });
  it("retorna cinquenta resultados e cursor para continuar buscando os antigos", async () => {
    const pagina = Array.from({ length: 51 }, (_, indice) => ({
      numero: 100 - indice,
    }));
    simulacoes.transacao.orcamento.findMany.mockResolvedValue(pagina);
    const resultado = await listarOrcamentos();
    expect(resultado.orcamentos).toHaveLength(50);
    expect(resultado.proximoNumero).toBe(51);
    simulacoes.transacao.orcamento.findMany.mockResolvedValue([{ numero: 50 }]);
    expect(
      await listarOrcamentos("", resultado.proximoNumero ?? undefined),
    ).toEqual({ orcamentos: [{ numero: 50 }], proximoNumero: null });
    expect(simulacoes.transacao.orcamento.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { idEmpresa: "empresa-a", numero: { lt: 51 } },
      }),
    );
  });
  it.each([0, -1, 1.5, NaN, Infinity, 2_147_483_648])(
    "rejeita cursor inválido %s antes de consultar",
    async (cursor) => {
      await expect(listarOrcamentos("", cursor)).rejects.toMatchObject({
        status: 400,
      });
      expect(simulacoes.transacao.orcamento.findMany).not.toHaveBeenCalled();
    },
  );
  it("rejeita busca maior que cento e cinquenta caracteres", async () => {
    await expect(listarOrcamentos("x".repeat(151))).rejects.toMatchObject({
      status: 400,
    });
    expect(simulacoes.transacao.orcamento.findMany).not.toHaveBeenCalled();
  });
  it("nega leitura de identificador de outra empresa", async () => {
    simulacoes.transacao.orcamento.findFirst.mockResolvedValue(null);
    await expect(buscarOrcamento(idOrcamento)).rejects.toMatchObject({
      status: 404,
    });
    expect(simulacoes.transacao.orcamento.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idOrcamento, idEmpresa: "empresa-a" },
      }),
    );
  });
  it("cria número e subtotais no servidor e vincula todos os itens à empresa", async () => {
    simulacoes.transacao.empresa.update.mockResolvedValue({
      proximoNumeroOrcamento: 43,
    });
    await criarOrcamento(dados);
    expect(simulacoes.transacao.empresa.update).toHaveBeenCalledWith({
      where: { idEmpresa: "empresa-a" },
      data: { proximoNumeroOrcamento: { increment: 1 } },
      select: { proximoNumeroOrcamento: true },
    });
    expect(simulacoes.transacao.orcamento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idEmpresa: "empresa-a",
          numero: 42,
          subtotalCentavos: 152,
          totalCentavos: 152,
          itens: {
            create: [
              expect.objectContaining({
                subtotalCentavos: 152,
                ordem: 0,
              }),
            ],
          },
        }),
      }),
    );
  });
  it("não remove itens de outra empresa ao tentar atualizar orçamento alheio", async () => {
    simulacoes.transacao.orcamento.updateMany.mockResolvedValue({ count: 0 });
    await expect(atualizarOrcamento(idOrcamento, dados)).rejects.toMatchObject({
      status: 404,
    });
    expect(simulacoes.transacao.orcamento.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idOrcamento, idEmpresa: "empresa-a" },
      }),
    );
    expect(
      simulacoes.transacao.orcamentoItem.deleteMany,
    ).not.toHaveBeenCalled();
    expect(
      simulacoes.transacao.orcamentoItem.createMany,
    ).not.toHaveBeenCalled();
  });
  it("substitui itens apenas do orçamento e empresa atuais", async () => {
    simulacoes.transacao.orcamento.updateMany.mockResolvedValue({ count: 1 });
    simulacoes.transacao.orcamento.findFirst.mockResolvedValue({ idOrcamento });
    await atualizarOrcamento(idOrcamento, dados);
    expect(simulacoes.transacao.orcamentoItem.deleteMany).toHaveBeenCalledWith({
      where: { idOrcamento, idEmpresa: "empresa-a" },
    });
    expect(simulacoes.transacao.orcamentoItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          idEmpresa: "empresa-a",
          idOrcamento,
          subtotalCentavos: 152,
        }),
      ],
    });
  });
  it("exclusão é filtrada pela empresa e falha para orçamento alheio", async () => {
    simulacoes.transacao.orcamento.deleteMany.mockResolvedValue({ count: 0 });
    await expect(excluirOrcamento(idOrcamento)).rejects.toMatchObject({
      status: 404,
    });
    expect(simulacoes.transacao.orcamento.deleteMany).toHaveBeenCalledWith({
      where: { idOrcamento, idEmpresa: "empresa-a" },
    });
  });
  it("rejeita empresa e totais enviados pelo navegador antes de modificar dados", async () => {
    await expect(
      criarOrcamento({ ...dados, idEmpresa: "empresa-b", totalCentavos: 1 }),
    ).rejects.toMatchObject({ status: 400 });
    expect(simulacoes.transacao.empresa.update).not.toHaveBeenCalled();
  });
  it("rejeita identificador inválido sem realizar leitura", async () => {
    await expect(buscarOrcamento("invalido")).rejects.toMatchObject({
      status: 400,
    });
    expect(simulacoes.transacao.orcamento.findFirst).not.toHaveBeenCalled();
  });
});
