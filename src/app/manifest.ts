import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orçamentos",
    short_name: "Orçamentos",
    description: "Orçamentos profissionais para sua empresa.",
    start_url: "/orcamentos",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f8",
    theme_color: "#008582",
    lang: "pt-BR",
    icons: [
      {
        src: "/icone-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icone-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icone.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
