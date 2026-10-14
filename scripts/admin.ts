import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/gerado/prisma/client";
import {
  executarComandoAdministrativo,
  interpretarArgumentos,
  mensagemErroAdministrativo,
  ErroAdministracao,
} from "./administracao";

async function lerSenha(): Promise<string> {
  const senhaAmbiente = process.env.SENHA_NOVO_USUARIO;
  delete process.env.SENHA_NOVO_USUARIO;
  if (senhaAmbiente !== undefined) return senhaAmbiente;
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new ErroAdministracao(
      "Defina SENHA_NOVO_USUARIO ou utilize um terminal interativo para informar a senha.",
    );
  process.stdout.write("Senha do novo usuário (entrada oculta): ");
  return new Promise((resolve, reject) => {
    let senha = "";
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    const finalizar = () => {
      process.stdin.off("data", receber);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const receber = (entrada: string) => {
      for (const caractere of entrada) {
        if (caractere === "\u0003") {
          finalizar();
          reject(new ErroAdministracao("Operação cancelada."));
          return;
        }
        if (caractere === "\r" || caractere === "\n") {
          finalizar();
          resolve(senha);
          return;
        }
        if (caractere === "\u007f" || caractere === "\b")
          senha = senha.slice(0, -1);
        else if (caractere >= " " && caractere !== "\u007f") senha += caractere;
      }
    };
    process.stdin.on("data", receber);
  });
}

async function executar() {
  let banco: PrismaClient | undefined;
  try {
    const comando = interpretarArgumentos(process.argv.slice(2));
    const senha =
      comando.comando === "criar-usuario" ? await lerSenha() : undefined;
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
    const resultado = await executarComandoAdministrativo(
      banco,
      comando,
      senha,
    );
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
