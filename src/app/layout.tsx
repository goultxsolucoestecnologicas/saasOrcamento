import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orçamentos",
  description: "Orçamentos profissionais para prestadores de serviços.",
};

export default function LayoutPrincipal({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
