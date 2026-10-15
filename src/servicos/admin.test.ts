import { describe, expect, it, vi } from "vitest";
vi.mock("@/bibliotecas/admin-autorizacao", () => ({
  executarComoAdministrador: vi.fn(),
}));
import { quitarCobranca } from "./admin";
import type { Prisma } from "@/gerado/prisma/client";

function preparar(
  situacao = "PENDENTE",
  assinaturaSituacao = "SUSPENSA",
  acessoExistente: Date | null = null,
) {
  const cobranca = {
    idCobranca: "c",
    idEmpresa: "e",
    idAssinatura: "a",
    situacao,
    valorCentavos: 2999,
    acessoAte: new Date("2026-11-15T00:00:00Z"),
    pagamento: situacao === "PAGA" ? { idPagamento: "p" } : null,
  };
  const banco = {
    cobranca: { findUnique: vi.fn(async () => cobranca), update: vi.fn() },
    assinatura: {
      update: vi.fn(async () => ({
        situacao: assinaturaSituacao,
        dataDireitoAcesso: acessoExistente,
      })),
    },
    pagamento: { create: vi.fn() },
    empresa: { update: vi.fn() },
    auditoriaAdministrativa: { create: vi.fn() },
  };
  return { banco, tx: banco as unknown as Prisma.TransactionClient };
}
describe("quitação manual transacional", () => {
  it("persiste somente o valor da cobrança e libera assinatura suspensa", async () => {
    const { banco, tx } = preparar();
    await expect(
      quitarCobranca(
        tx,
        { idAdmin: "admin", nome: "Responsável" },
        "c",
        "2026-10-15",
        "PIX",
      ),
    ).resolves.toEqual({ idCobranca: "c", jaConfirmado: false });
    expect(banco.pagamento.create).toHaveBeenCalledWith({
      data: {
        idCobranca: "c",
        valorCentavos: 2999,
        dataPagamento: new Date("2026-10-15T00:00:00Z"),
        formaPagamento: "PIX",
        idAdmin: "admin",
      },
    });
    expect(banco.cobranca.update).toHaveBeenCalledWith({
      where: { idCobranca: "c" },
      data: { situacao: "PAGA" },
    });
    expect(banco.assinatura.update).toHaveBeenLastCalledWith({
      where: { idAssinatura: "a" },
      data: {
        dataDireitoAcesso: new Date("2026-11-15"),
        dataVencimento: new Date("2026-11-15"),
        situacao: "ATIVA",
      },
    });
    expect(banco.empresa.update).toHaveBeenCalledWith({
      where: { idEmpresa: "e" },
      data: { ativa: true },
    });
    expect(banco.auditoriaAdministrativa.create).toHaveBeenCalledTimes(1);
  });
  it("confirmação repetida não duplica pagamento nem auditoria", async () => {
    const { banco, tx } = preparar("PAGA");
    await expect(
      quitarCobranca(
        tx,
        { idAdmin: "admin", nome: "Admin" },
        "c",
        "2026-10-15",
        "PIX",
      ),
    ).resolves.toMatchObject({ jaConfirmado: true });
    expect(banco.pagamento.create).not.toHaveBeenCalled();
    expect(banco.auditoriaAdministrativa.create).not.toHaveBeenCalled();
    expect(banco.cobranca.update).not.toHaveBeenCalled();
  });
  it("não confirma cobrança cancelada nem restaura assinatura cancelada por quitação histórica", async () => {
    const cancelada = preparar("CANCELADA");
    await expect(
      quitarCobranca(
        cancelada.tx,
        { idAdmin: "admin", nome: "Admin" },
        "c",
        "2026-10-15",
        "PIX",
      ),
    ).rejects.toThrow();
    expect(cancelada.banco.pagamento.create).not.toHaveBeenCalled();
    const historica = preparar("PENDENTE", "CANCELADA");
    await quitarCobranca(
      historica.tx,
      { idAdmin: "admin", nome: "Admin" },
      "c",
      "2026-10-15",
      "PIX",
    );
    expect(historica.banco.empresa.update).not.toHaveBeenCalled();
    expect(historica.banco.assinatura.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ situacao: "ATIVA" }),
      }),
    );
  });
  it("pagamento antigo nunca reduz o direito de acesso já quitado", async () => {
    const { banco, tx } = preparar("PENDENTE", "ATIVA", new Date("2027-01-15"));
    await quitarCobranca(
      tx,
      { idAdmin: "admin", nome: "Admin" },
      "c",
      "2026-10-15",
      "PIX",
    );
    expect(banco.assinatura.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dataDireitoAcesso: new Date("2027-01-15"),
          dataVencimento: new Date("2027-01-15"),
        }),
      }),
    );
  });
  it("bloqueia a assinatura antes de reler a cobrança para serializar quitações simultâneas", async () => {
    const { banco, tx } = preparar();
    await quitarCobranca(
      tx,
      { idAdmin: "admin", nome: "Admin" },
      "c",
      "2026-10-15",
      "PIX",
    );
    expect(banco.assinatura.update.mock.invocationCallOrder[0]).toBeLessThan(
      banco.cobranca.findUnique.mock.invocationCallOrder[1],
    );
    expect(banco.cobranca.findUnique.mock.invocationCallOrder[1]).toBeLessThan(
      banco.pagamento.create.mock.invocationCallOrder[0],
    );
  });
});
