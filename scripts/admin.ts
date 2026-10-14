import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/gerado/prisma/client";
import {
  executarComandoAdministrativo,
  interpretarArgumentos,
  mensagemErroAdministrativo,
  ErroAdministracao,
} from "./administracao";

async function executar() {
  let banco: PrismaClient | undefined;
  try {
    const comando = interpretarArgumentos(process.argv.slice(2));
    const endereco = process.env.DATABASE_URL;
    if (!endereco)
      throw new ErroAdministracao(
        "Configure DATABASE_URL antes de executar o comando.",
      );
    let url: URL;
    try {
      url = new URL(endereco);
    } catch {
      throw new ErroAdministracao("DATABASE_URL inválida.");
    }
    if (!/^postgres(ql)?:$/.test(url.protocol))
      throw new ErroAdministracao("DATABASE_URL deve utilizar PostgreSQL.");
    banco = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: endereco },
        { schema: url.searchParams.get("schema") ?? "public" },
      ),
    });
    const resultado = await executarComandoAdministrativo(banco, comando);
    console.log(resultado.mensagem);
    if (resultado.id) console.log(`Identificador: ${resultado.id}`);
  } catch (erro) {
    console.error(mensagemErroAdministrativo(erro));
    process.exitCode = 1;
  } finally {
    if (banco)
      await banco.$disconnect().catch(() => {
        process.exitCode = 1;
      });
  }
}

await executar();
