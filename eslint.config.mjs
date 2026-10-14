import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettier,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/bibliotecas/banco.ts",
      "src/bibliotecas/autenticacao.ts",
      "src/bibliotecas/contexto-empresa.ts",
      "src/bibliotecas/dados-empresa.ts",
      "src/**/*.test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/bibliotecas/banco",
                "**/banco",
                "@/gerado/prisma/**",
                "**/gerado/prisma/**",
                "@prisma/client",
              ],
              message:
                "Acesso ao banco é restrito à infraestrutura. Crie operações de domínio com escopo obrigatório dentro de executarNaEmpresa e testes de isolamento.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "src/gerado/**", "next-env.d.ts", "coverage/**"]),
]);
