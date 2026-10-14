import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { resolve } from "node:path";
const simulacoes = vi.hoisted(() => ({
  update: vi.fn(),
  findUnique: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  readFile: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({
  mkdir: simulacoes.mkdir,
  writeFile: simulacoes.writeFile,
  unlink: simulacoes.unlink,
  readFile: simulacoes.readFile,
}));
vi.mock("@/bibliotecas/ambiente", () => ({
  obterAmbiente: () => ({ ARMAZENAMENTO_LOCAL_DIRETORIO: ".dados/uploads" }),
}));
vi.mock("@/bibliotecas/dados-empresa", () => ({
  executarComDadosDaEmpresa: async (
    operacao: (transacao: unknown, contexto: unknown) => Promise<unknown>,
  ) =>
    operacao(
      {
        empresa: {
          update: simulacoes.update,
          findUnique: simulacoes.findUnique,
        },
      },
      { idEmpresa: "6e531a29-ef50-46a2-88bb-55904df9c763" },
    ),
}));
import {
  buscarLogoEmpresa,
  normalizarLogo,
  resolverCaminhoLogo,
  salvarLogoEmpresa,
} from "./logos";
const idEmpresa = "6e531a29-ef50-46a2-88bb-55904df9c763";
const idArquivo = "c330fc37-c2e1-4052-8510-8cad0c0c40cb";
async function criarArquivo(
  tipo: "png" | "jpeg" = "png",
  largura = 2,
  altura = 2,
) {
  const imagem = sharp({
    create: {
      width: largura,
      height: altura,
      channels: 3,
      background: "#ffffff",
    },
  });
  const conteudo = await (
    tipo === "png" ? imagem.png() : imagem.jpeg()
  ).toBuffer();
  return new File([new Uint8Array(conteudo)], `logo.${tipo}`, {
    type: `image/${tipo}`,
  });
}

describe("logos privadas", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    simulacoes.unlink.mockResolvedValue(undefined);
  });
  it.each(["png", "jpeg"] as const)(
    "decodifica %s real e normaliza para PNG",
    async (tipo) => {
      const conteudo = await normalizarLogo(await criarArquivo(tipo));
      const metadados = await sharp(conteudo).metadata();
      expect(metadados.format).toBe("png");
      expect(metadados.width).toBe(2);
      expect(metadados.exif).toBeUndefined();
    },
  );
  it("recusa SVG, MIME forjado e PNG truncado", async () => {
    await expect(
      normalizarLogo(
        new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      normalizarLogo(new File(["<svg/>"], "logo.png", { type: "image/png" })),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      normalizarLogo(
        new File(
          [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
          "logo.png",
          { type: "image/png" },
        ),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("recusa mais de 2MB antes de decodificar", async () => {
    await expect(
      normalizarLogo(
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], "logo.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("recusa imagens acima de 16 milhões de pixels", async () => {
    await expect(
      normalizarLogo(await criarArquivo("png", 4001, 4000)),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("rejeita traversal e chaves de outra empresa", () => {
    expect(() =>
      resolverCaminhoLogo(".dados/uploads", idEmpresa, `../${idArquivo}.png`),
    ).toThrow();
    expect(() =>
      resolverCaminhoLogo(
        ".dados/uploads",
        idEmpresa,
        `empresa-b/${idArquivo}.png`,
      ),
    ).toThrow();
    expect(
      resolverCaminhoLogo(
        ".dados/uploads",
        idEmpresa,
        `${idEmpresa}/${idArquivo}.png`,
      ),
    ).toBe(resolve(".dados/uploads", idEmpresa, `${idArquivo}.png`));
  });
  it("grava arquivo exclusivo e vincula somente a empresa do contexto", async () => {
    simulacoes.update.mockResolvedValue({ logoChave: "chave" });
    await salvarLogoEmpresa(await criarArquivo());
    expect(simulacoes.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(idEmpresa),
      expect.any(Buffer),
      { flag: "wx", mode: 0o600 },
    );
    expect(simulacoes.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idEmpresa },
        data: {
          logoChave: expect.stringMatching(
            new RegExp(`^${idEmpresa}/.+\\.png$`),
          ),
        },
      }),
    );
    expect(simulacoes.unlink).not.toHaveBeenCalled();
  });
  it("remove só o arquivo novo quando atualização do banco falha", async () => {
    simulacoes.update.mockRejectedValue(new Error("Falha de banco"));
    await expect(salvarLogoEmpresa(await criarArquivo())).rejects.toThrow(
      "Falha de banco",
    );
    expect(simulacoes.unlink).toHaveBeenCalledWith(
      simulacoes.writeFile.mock.calls[0][0],
    );
  });
  it("não remove arquivo preexistente quando escrita exclusiva falha", async () => {
    simulacoes.writeFile.mockRejectedValue(
      Object.assign(new Error(), { code: "EEXIST" }),
    );
    await expect(salvarLogoEmpresa(await criarArquivo())).rejects.toThrow();
    expect(simulacoes.unlink).not.toHaveBeenCalled();
    expect(simulacoes.update).not.toHaveBeenCalled();
  });
  it("retorna null quando não há logo e impede leitura de chave alheia", async () => {
    simulacoes.findUnique.mockResolvedValue({ logoChave: null });
    expect(await buscarLogoEmpresa()).toBeNull();
    simulacoes.findUnique.mockResolvedValue({
      logoChave: `empresa-b/${idArquivo}.png`,
    });
    await expect(buscarLogoEmpresa()).rejects.toMatchObject({ status: 404 });
    expect(simulacoes.readFile).not.toHaveBeenCalled();
  });
});
