import type { Metadata, Viewport } from "next";
import { RegistroPwa } from "@/componentes/registro-pwa";
import "./globals.css";

export const metadata: Metadata = {
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
      </body>
    </html>
  );
}
