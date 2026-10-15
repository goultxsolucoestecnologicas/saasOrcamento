import type { MetadataRoute } from "next";
import {
  obterConfiguracaoLanding,
  permitirIndexacao,
} from "@/bibliotecas/configuracao-landing";

export default function sitemap(): MetadataRoute.Sitemap {
  const { origem } = obterConfiguracaoLanding();
  return origem && permitirIndexacao(origem)
    ? [{ url: origem, changeFrequency: "monthly", priority: 1 }]
    : [];
}
