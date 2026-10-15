import { describe, expect, it } from "vitest";
import { afterEach, vi } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import {
  obterConfiguracaoLanding,
  permitirIndexacao,
} from "./configuracao-landing";

describe("configuração pública da landing", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("sem configuração não inventa contato, marca de cliente ou documentos legais", () => {
    expect(obterConfiguracaoLanding({})).toEqual({
      nome: "OrçaFácil",
      logo: null,
      contato: null,
      origem: null,
      privacidade: null,
      termos: null,
      responsavel: null,
    });
  });
  it("expõe somente os campos comerciais permitidos", () => {
    const resultado = obterConfiguracaoLanding({
      LANDING_NOME: " Produto ",
      LANDING_WHATSAPP_URL:
        "https://wa.me/5500000000000?text=Quero%20come%C3%A7ar",
      LANDING_SITE_URL: "https://produto.example/caminho",
      LANDING_LOGO: "/marca/logo.svg",
      DATABASE_URL: "postgresql://privado",
      SUPABASE_SECRET_KEY: "privado",
    });
    expect(resultado.nome).toBe("Produto");
    expect(resultado.origem).toBe("https://produto.example");
    expect(resultado.logo).toBe("/marca/logo.svg");
    expect(JSON.stringify(resultado)).not.toContain("privado");
  });
  it.each([
    "javascript:alert(1)",
    "https://wa.me.evil.example/5500000000000",
    "https://usuario:senha@wa.me/5500000000000",
    "https://wa.me/abc",
    "http://wa.me/5500000000000",
  ])("bloqueia contato inválido: %s", (contato) => {
    expect(() =>
      obterConfiguracaoLanding({ LANDING_WHATSAPP_URL: contato }),
    ).toThrow("LANDING_WHATSAPP_URL");
  });
  it("aceita contato WhatsApp API sem criar checkout", () => {
    expect(
      obterConfiguracaoLanding({
        LANDING_WHATSAPP_URL:
          "https://api.whatsapp.com/send?phone=5500000000000",
      }).contato,
    ).toBeTruthy();
  });
  it("recusa logo dinâmica e ignora links legais inseguros", () => {
    expect(() =>
      obterConfiguracaoLanding({ LANDING_LOGO: "/api/empresa/logo.png" }),
    ).toThrow();
    expect(
      obterConfiguracaoLanding({
        LANDING_PRIVACIDADE_URL: "javascript:alert(1)",
        LANDING_TERMOS_URL: "//malicioso.example",
      }).privacidade,
    ).toBeNull();
  });
  it("indexação permanece desabilitada sem origem publicada", () => {
    expect(permitirIndexacao(null)).toBe(false);
    expect(permitirIndexacao("http://localhost:3002")).toBe(false);
    expect(permitirIndexacao("https://produto.example")).toBe(true);
  });
  it("SEO publicado mantém URLs autenticadas fora do sitemap e bloqueadas em robots", () => {
    vi.stubEnv("LANDING_SITE_URL", "https://produto.example");
    expect(robots().rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/entrar", "/orcamentos", "/configuracoes", "/api/"],
    });
    expect(robots().sitemap).toBe("https://produto.example/sitemap.xml");
    expect(sitemap()).toEqual([
      {
        url: "https://produto.example",
        changeFrequency: "monthly",
        priority: 1,
      },
    ]);
  });
});
