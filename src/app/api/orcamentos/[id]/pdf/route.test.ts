import { beforeEach, describe, expect, it, vi } from "vitest";
const simulacoes = vi.hoisted(() => ({
  buscar: vi.fn(),
  empresa: vi.fn(),
  logo: vi.fn(),
  render: vi.fn(),
  documento: vi.fn(),
}));
vi.mock("@/servicos/orcamentos", () => ({
  buscarOrcamento: simulacoes.buscar,
}));
vi.mock("@/servicos/empresa", () => ({ buscarEmpresa: simulacoes.empresa }));
vi.mock("@/servicos/logos", () => ({ buscarLogoEmpresa: simulacoes.logo }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: simulacoes.render }));
vi.mock("@/funcionalidades/pdf/documento-orcamento", () => ({
  DocumentoOrcamento: simulacoes.documento,
}));
import { GET } from "./route";
import { ErroDominio } from "@/bibliotecas/erro-dominio";
import { ErroAcessoEmpresa } from "@/bibliotecas/contexto-empresa";
beforeEach(() => {
  vi.resetAllMocks();
  simulacoes.buscar.mockResolvedValue({
    numero: 128,
    tipoDocumento: "ORCAMENTO",
  });
  simulacoes.empresa.mockResolvedValue({ nome: "Empresa fictícia" });
  simulacoes.logo.mockResolvedValue(null);
  simulacoes.render.mockResolvedValue(Buffer.from("%PDF-fictício"));
});
const requisicao = () =>
  GET(new Request("http://localhost/api/orcamentos/id/pdf"), {
    params: Promise.resolve({ id: "id" }),
  });
describe("endpoint de documento comercial", () => {
  it.each(["ORCAMENTO", "PEDIDO"])(
    "usa dados autorizados, logo privada e nome de arquivo para %s",
    async (tipoDocumento) => {
      simulacoes.buscar.mockResolvedValue({ numero: 128, tipoDocumento });
      simulacoes.logo.mockResolvedValue({
        conteudo: Buffer.from("png fictício"),
      });
      const resposta = await requisicao();
      expect(resposta.status).toBe(200);
      expect(resposta.headers.get("Content-Disposition")).toContain(
        `${tipoDocumento === "PEDIDO" ? "pedido" : "orcamento"}-128.pdf`,
      );
      expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
      expect(simulacoes.buscar).toHaveBeenCalledWith("id");
      expect(simulacoes.documento).toHaveBeenCalledWith({
        orcamento: { numero: 128, tipoDocumento },
        empresa: {
          nome: "Empresa fictícia",
          logo: `data:image/png;base64,${Buffer.from("png fictício").toString("base64")}`,
        },
      });
    },
  );
  it.each([401, 403, 404])(
    "não gera documento quando acesso autorizado falha com %s",
    async (status) => {
      simulacoes.buscar.mockRejectedValue(
        status === 404
          ? new ErroDominio("Acesso recusado.", 404)
          : new ErroAcessoEmpresa(status as 401 | 403),
      );
      const resposta = await requisicao();
      expect(resposta.status).toBe(status);
      expect(simulacoes.empresa).not.toHaveBeenCalled();
      expect(simulacoes.logo).not.toHaveBeenCalled();
      expect(simulacoes.render).not.toHaveBeenCalled();
    },
  );
  it("não expõe falha técnica de renderização", async () => {
    simulacoes.render.mockRejectedValue(new Error("senha de teste interna"));
    const resposta = await requisicao();
    expect(resposta.status).toBe(500);
    expect(await resposta.text()).not.toContain("senha");
  });
});
