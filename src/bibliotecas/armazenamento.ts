import "server-only";
import path from "node:path";
import { obterAmbiente } from "./ambiente";

// Base privada e persistente; nenhuma rota de upload/download é exposta na T01.
export function obterDiretorioArmazenamento(): string {
  const diretorio = path.resolve(
    process.cwd(),
    obterAmbiente().ARMAZENAMENTO_LOCAL_DIRETORIO,
  );
  const relativoPublico = path.relative(
    path.resolve(process.cwd(), "public"),
    diretorio,
  );
  if (
    !relativoPublico ||
    (!relativoPublico.startsWith(`..${path.sep}`) &&
      relativoPublico !== ".." &&
      !path.isAbsolute(relativoPublico))
  ) {
    throw new Error("O armazenamento privado deve ficar fora de public.");
  }
  return diretorio;
}
