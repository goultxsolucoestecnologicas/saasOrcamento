import { ImageResponse } from "next/og";
import { obterConfiguracaoLanding } from "@/bibliotecas/configuracao-landing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Orçamentos profissionais pelo celular";
export default function ImagemSocial() {
  const { nome } = obterConfiguracaoLanding();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#f4f7f7",
        color: "#14282c",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 700,
          color: "#006b69",
        }}
      >
        {nome}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          maxWidth: 950,
        }}
      >
        Seu trabalho em um orçamento profissional.
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 26,
        }}
      >
        <span>Crie. Personalize. Compartilhe em PDF.</span>
        <span>R$ 29,99/mês por empresa</span>
      </div>
    </div>,
    size,
  );
}
