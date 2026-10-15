export type ConfiguracaoLanding = {
  nome: string;
  logo: string | null;
  contato: string | null;
  origem: string | null;
  privacidade: string | null;
  termos: string | null;
  responsavel: string | null;
};

function enderecoPublico(valor?: string): string | null {
  if (!valor?.trim()) return null;
  const texto = valor.trim();
  if (/^\/(?!\/)[a-z0-9/_.-]+$/i.test(texto)) return texto;
  try {
    const url = new URL(texto);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function obterConfiguracaoLanding(
  ambiente: Record<string, string | undefined> = process.env,
): ConfiguracaoLanding {
  let contato: string | null = null;
  if (ambiente.LANDING_WHATSAPP_URL?.trim()) {
    try {
      const url = new URL(ambiente.LANDING_WHATSAPP_URL.trim());
      const waMe =
        url.hostname === "wa.me" && /^\/[1-9]\d{7,14}\/?$/.test(url.pathname);
      const api =
        url.hostname === "api.whatsapp.com" &&
        url.pathname === "/send" &&
        /^[1-9]\d{7,14}$/.test(url.searchParams.get("phone") ?? "");
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        (!waMe && !api)
      )
        throw new Error();
      contato = url.href;
    } catch {
      throw new Error(
        "LANDING_WHATSAPP_URL deve ser um link HTTPS válido do WhatsApp comercial.",
      );
    }
  }
  let origem: string | null = null;
  if (ambiente.LANDING_SITE_URL?.trim()) {
    try {
      const url = new URL(ambiente.LANDING_SITE_URL.trim());
      if (
        url.username ||
        url.password ||
        (url.protocol !== "https:" &&
          !(
            url.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(url.hostname)
          ))
      )
        throw new Error();
      origem = url.origin;
    } catch {
      throw new Error(
        "LANDING_SITE_URL deve ser a origem pública HTTPS do produto.",
      );
    }
  }
  const logo = ambiente.LANDING_LOGO?.trim();
  if (
    logo &&
    (!/^\/(?!\/)[a-z0-9/_.-]+\.(?:png|jpe?g|webp|svg)$/i.test(logo) ||
      logo.startsWith("/api/"))
  )
    throw new Error(
      "LANDING_LOGO deve apontar para uma imagem estática em public.",
    );
  return {
    nome: ambiente.LANDING_NOME?.trim().slice(0, 80) || "OrçaFácil",
    logo: logo || null,
    contato,
    origem,
    privacidade: enderecoPublico(ambiente.LANDING_PRIVACIDADE_URL),
    termos: enderecoPublico(ambiente.LANDING_TERMOS_URL),
    responsavel: ambiente.LANDING_RESPONSAVEL?.trim().slice(0, 160) || null,
  };
}

export function permitirIndexacao(origem: string | null) {
  return Boolean(
    origem &&
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(origem).hostname),
  );
}
