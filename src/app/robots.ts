import type { MetadataRoute } from "next";
import {
  obterConfiguracaoLanding,
  permitirIndexacao,
} from "@/bibliotecas/configuracao-landing";

export default function robots(): MetadataRoute.Robots {
  const { origem } = obterConfiguracaoLanding();
  return {
    rules: permitirIndexacao(origem)
      ? {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/entrar",
            "/orcamentos",
            "/configuracoes",
            "/api/",
            "/admin",
            "/auth/",
            "/definir-senha",
            "/assinatura-indisponivel",
          ],
        }
      : { userAgent: "*", disallow: "/" },
    ...(origem && permitirIndexacao(origem)
      ? { sitemap: `${origem}/sitemap.xml` }
      : {}),
  };
}
