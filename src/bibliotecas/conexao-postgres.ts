import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PoolConfig } from "pg";

function analisarEndereco(endereco: string) {
  let url: URL;
  try {
    url = new URL(endereco);
  } catch {
    throw new Error("URL PostgreSQL inválida.");
  }
  if (
    !/^postgres(ql)?:$/.test(url.protocol) ||
    !url.hostname ||
    url.searchParams.has("host") ||
    url.searchParams.has("hostaddr")
  )
    throw new Error(
      "URL PostgreSQL inválida ou com substituição de host não permitida.",
    );
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    url.hostname.toLowerCase(),
  );
  const modo = url.searchParams.get("sslmode");
  const ssl = url.searchParams.get("ssl");
  if (
    (!local && (modo === "disable" || ssl === "false" || ssl === "0")) ||
    modo === "no-verify" ||
    ssl === "no-verify" ||
    url.searchParams.get("sslaccept") === "accept_invalid_certs"
  )
    throw new Error(
      "A conexão PostgreSQL remota exige TLS com certificado verificado.",
    );
  if (
    url.searchParams.has("sslkey") ||
    url.searchParams.has("sslidentity") ||
    url.searchParams.has("sslpassword")
  )
    throw new Error(
      "Certificados de cliente PostgreSQL não estão configurados nesta aplicação.",
    );
  return { url, local, modo };
}

function caminhoAutoridade(url: URL, caminho?: string) {
  const informado =
    caminho?.trim() ||
    url.searchParams.get("sslrootcert") ||
    url.searchParams.get("sslcert");
  return informado ? resolve(informado) : undefined;
}

function carregarAutoridade(caminho: string | undefined) {
  if (!caminho) return undefined;
  try {
    const certificado = readFileSync(caminho, "utf8");
    if (!certificado.includes("-----BEGIN CERTIFICATE-----")) throw new Error();
    return certificado;
  } catch {
    throw new Error(
      "Não foi possível carregar o certificado de autoridade PostgreSQL. Confira POSTGRES_CA_CERTIFICADO.",
    );
  }
}

function removerParametrosTls(url: URL) {
  // O parser pg sobrescreve o objeto ssl quando estes parâmetros permanecem na URL.
  for (const chave of [...url.searchParams.keys()]) {
    if (
      chave.toLowerCase().startsWith("ssl") ||
      chave.toLowerCase() === "uselibpqcompat"
    )
      url.searchParams.delete(chave);
  }
}

export function prepararConexaoPostgres(
  endereco: string,
  caminhoCa?: string,
): { configuracao: PoolConfig; esquema: string } {
  const { url, local, modo } = analisarEndereco(endereco);
  const caminho = caminhoAutoridade(url, caminhoCa);
  const ca = carregarAutoridade(caminho);
  const esquema = url.searchParams.get("schema") ?? "public";
  const usarTls =
    !local ||
    (modo !== null && modo !== "disable") ||
    url.searchParams.get("ssl") === "true" ||
    Boolean(ca);
  removerParametrosTls(url);
  return {
    configuracao: {
      connectionString: url.toString(),
      ssl: usarTls
        ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
        : false,
    },
    esquema,
  };
}

export function prepararUrlPrisma(
  endereco: string,
  caminhoCa?: string,
): string {
  if (!endereco) return ""; // prisma generate/validate não precisam de conexão.
  const { url, local, modo } = analisarEndereco(endereco);
  const caminho = caminhoAutoridade(url, caminhoCa);
  if (caminho) carregarAutoridade(caminho);
  const usarTls =
    !local ||
    (modo !== null && modo !== "disable") ||
    url.searchParams.get("ssl") === "true" ||
    Boolean(caminho);
  removerParametrosTls(url);
  if (usarTls) {
    // O engine de migrations Prisma usa sslaccept=strict; require sozinho não basta.
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("sslaccept", "strict");
    if (caminho) url.searchParams.set("sslcert", caminho);
  } else url.searchParams.set("sslmode", "disable");
  return url.toString();
}
