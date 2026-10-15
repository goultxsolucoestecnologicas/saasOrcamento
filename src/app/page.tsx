import type { Metadata } from "next";
import { LandingPage } from "@/componentes/landing-page";
import {
  obterConfiguracaoLanding,
  permitirIndexacao,
} from "@/bibliotecas/configuracao-landing";

export function generateMetadata(): Metadata {
  const configuracao = obterConfiguracaoLanding();
  const titulo = `${configuracao.nome} | Orçamentos profissionais pelo celular`;
  const descricao =
    "Crie orçamentos online para prestadores de serviços, personalize com sua logo e compartilhe em PDF. Plano Profissional: R$ 29,99/mês por empresa, até dois usuários.";
  return {
    title: titulo,
    description: descricao,
    ...(configuracao.origem
      ? {
          metadataBase: new URL(configuracao.origem),
          alternates: { canonical: "/" },
        }
      : {}),
    robots: {
      index: permitirIndexacao(configuracao.origem),
      follow: permitirIndexacao(configuracao.origem),
    },
    openGraph: {
      title: titulo,
      description: descricao,
      type: "website",
      locale: "pt_BR",
      siteName: configuracao.nome,
      ...(configuracao.origem
        ? {
            url: configuracao.origem,
            images: [
              {
                url: "/opengraph-image",
                width: 1200,
                height: 630,
                alt: `${configuracao.nome}: sistema de orçamentos para prestadores de serviços`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
    },
  };
}

export default function PaginaInicial() {
  return <LandingPage configuracao={obterConfiguracaoLanding()} />;
}
