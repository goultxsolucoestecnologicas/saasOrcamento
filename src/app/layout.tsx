import type { Metadata, Viewport } from "next";
import { RegistroPwa } from "@/componentes/registro-pwa";
import "./globals.css";
import { Notificacoes } from "@/componentes/notificacoes";
import { obterConfiguracaoLanding } from "@/bibliotecas/configuracao-landing";

const { origem } = obterConfiguracaoLanding();

export const metadata: Metadata = {
  ...(origem ? { metadataBase: new URL(origem) } : {}),
  robots: { index: false, follow: false },
  title: "Orçamentos",
  description: "Orçamentos profissionais para prestadores de serviços.",
};
export const viewport: Viewport = {
  themeColor: "#008582",
  width: "device-width",
  initialScale: 1,
};

export default function LayoutPrincipal({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <RegistroPwa />
        {children}
        <Notificacoes />
      </body>
    </html>
  );
}
