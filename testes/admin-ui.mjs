import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

// Sessão privada existente, preparada pelo responsável pelo ambiente de testes.
// Este teste não provisiona contas, não envia convites e não altera dados.
const origem = process.env.ADMIN_TEST_ORIGIN || "http://localhost:3003";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origem).hostname));
assert.match(
  new URL(process.env.DATABASE_URL).searchParams.get("schema") || "",
  /^testes_admin_[a-f0-9]{10}$/,
  "Capturas bloqueadas fora do schema de fixtures para evitar dados reais nos artefatos.",
);
const sessao = process.env.ADMIN_TEST_SESSION || ".tmp/admin-session.json";
assert.ok(fs.existsSync(sessao), "Prepare a sessão administrativa de teste.");
const executavel = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  chromium.executablePath(),
]
  .filter(Boolean)
  .find((p) => fs.existsSync(p));
const navegador = await chromium.launch({
  headless: true,
  executablePath: executavel,
});
const contexto = await navegador.newContext({
  storageState: sessao,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
});
const pagina = await contexto.newPage();
pagina.setDefaultTimeout(20000);
const falhas = [];
const erros = [];
let aprovados = 0;
fs.mkdirSync("docs/admin/capturas", { recursive: true });
fs.mkdirSync(".tmp", { recursive: true });
pagina.on("pageerror", (erro) => erros.push(erro.name));
async function verificar(nome, executar) {
  try {
    await executar();
    aprovados++;
    console.log(`OK: ${nome}`);
  } catch (erro) {
    falhas.push(nome);
    console.log(`FALHA: ${nome}`);
    console.log(String(erro.message).slice(0, 1500));
  }
}
async function abrir(caminho, titulo) {
  await pagina.goto(origem + caminho);
  await pagina
    .getByRole("heading", { name: titulo, exact: true, level: 1 })
    .waitFor();
  await pagina
    .getByRole("status", { name: "Carregando conteúdo", exact: true })
    .waitFor({ state: "hidden" });
  await pagina.waitForTimeout(250);
}
async function geometria() {
  const resultado = await pagina.evaluate(() => {
    const visivel = (e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden";
    };
    const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      duplicados: ids.filter((id, i) => ids.indexOf(id) !== i),
      pequenos: [...document.querySelectorAll("button,a,input,select,textarea")]
        .filter(visivel)
        .filter((e) => !e.classList.contains("pular"))
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width < 43.5 || r.height < 43.5;
        })
        .map((e) => e.tagName),
    };
  });
  assert.equal(resultado.overflow, false);
  assert.deepEqual(resultado.duplicados, []);
  assert.deepEqual(resultado.pequenos, []);
}
async function acessibilidade() {
  // Espera a transição de abertura: cores durante a interpolação não são o estado final.
  await pagina.waitForTimeout(350);
  const resultado = await new AxeBuilder({ page: pagina })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    resultado.violations.map((v) => ({
      id: v.id,
      alvos: v.nodes.map((n) => n.target),
    })),
    [],
  );
}
try {
  await verificar(
    "APIs anônimas não retornam dados administrativos",
    async () => {
      const anonimo = await navegador.newContext();
      for (const caminho of [
        "resumo",
        "assinantes",
        "cobrancas",
        "vencimentos",
        "configuracoes",
      ]) {
        const resposta = await anonimo.request.get(
          `${origem}/api/admin/${caminho}`,
        );
        assert.equal(resposta.status(), 401);
        assert.equal((await resposta.json()).dados, undefined);
      }
      await anonimo.close();
    },
  );
  const resposta = await contexto.request.get(`${origem}/api/admin/assinantes`);
  assert.equal(
    resposta.status(),
    200,
    "Sessão precisa ter autorização global de teste.",
  );
  const empresas = (await resposta.json()).dados;
  const empresa = empresas[0];
  for (const largura of process.env.ADMIN_TEST_INTERACOES === "1"
    ? []
    : [320, 390, 768, 1024, 1440, 1920]) {
    await pagina.setViewportSize({ width: largura, height: 900 });
    for (const [caminho, titulo] of [
      ["/admin", "Visão geral"],
      ["/admin/assinantes", "Assinantes"],
      ["/admin/cobrancas", "Cobranças"],
      ["/admin/vencimentos", "Vencimentos"],
      ["/admin/configuracoes", "Configurações"],
      ["/admin/assinantes/novo", "Cadastrar empresa"],
    ]) {
      await verificar(`${largura}px ${titulo}: geometria`, async () => {
        await abrir(caminho, titulo);
        await geometria();
      });
      if ([390, 1440].includes(largura))
        await verificar(`${largura}px ${titulo}: WCAG`, acessibilidade);
      if ([320, 390, 1440].includes(largura) && caminho === "/admin")
        await pagina.screenshot({
          path: `docs/admin/capturas/painel-${largura}.png`,
          fullPage: true,
        });
    }
  }
  await pagina.setViewportSize({ width: 390, height: 900 });
  await verificar("Navegação móvel acessível", async () => {
    await abrir("/admin", "Visão geral");
    await pagina
      .getByRole("button", { name: "Abrir navegação administrativa" })
      .click();
    await pagina.getByRole("dialog").waitFor();
    await acessibilidade();
    await pagina
      .getByRole("dialog")
      .getByRole("link", { name: "Assinantes", exact: true })
      .click();
    await pagina
      .getByRole("heading", { name: "Assinantes", exact: true, level: 1 })
      .waitFor();
    assert.equal(await pagina.getByRole("dialog").count(), 0);
  });
  await verificar("Busca sem resultados preserva filtros", async () => {
    await abrir("/admin/assinantes", "Assinantes");
    await pagina
      .getByLabel("Buscar por nome ou telefone")
      .fill("QA-INEXISTENTE-zzzz-190945");
    await pagina.getByRole("button", { name: "Buscar", exact: true }).click();
    await pagina
      .getByRole("heading", { name: "Nenhum registro encontrado" })
      .waitFor();
    await geometria();
  });
  await verificar(
    "Validação servidor mantém formulário e foco no campo",
    async () => {
      await abrir("/admin/assinantes/novo", "Cadastrar empresa");
      await pagina
        .getByRole("button", { name: "Cadastrar e preparar convite" })
        .click();
      await pagina.getByRole("alertdialog").waitFor();
      await acessibilidade();
      await pagina.getByRole("alertdialog").getByRole("button").first().click();
      await pagina.waitForTimeout(100);
      assert.ok(await pagina.locator('[aria-invalid="true"]').count());
      assert.equal(
        await pagina.evaluate(() =>
          document.activeElement?.getAttribute("aria-invalid"),
        ),
        "true",
      );
    },
  );
  if (empresa) {
    await verificar(
      "Detalhes e confirmação de suspensão sem alterar dados",
      async () => {
        await abrir(
          `/admin/assinantes/${empresa.idEmpresa}`,
          empresa.nome || "Empresa sem nome",
        );
        await geometria();
        await acessibilidade();
        await pagina
          .getByRole("button", {
            name:
              empresa.situacao === "ATIVA"
                ? "Suspender assinatura"
                : "Ativar assinatura",
            exact: true,
          })
          .click();
        await pagina.getByRole("alertdialog").waitFor();
        await acessibilidade();
        await pagina
          .getByRole("button", { name: "Voltar", exact: true })
          .click();
        const atual = (
          await (
            await contexto.request.get(
              `${origem}/api/admin/assinantes/${empresa.idEmpresa}`,
            )
          ).json()
        ).dados;
        assert.equal(atual.situacao, empresa.situacao);
      },
    );
  }
  await verificar("Duas cobranças abertas mantêm IDs únicos", async () => {
    await abrir("/admin/cobrancas", "Cobranças");
    const botoes = pagina.getByRole("button", {
      name: "Detalhes e ações",
      exact: true,
    });
    if ((await botoes.count()) < 2)
      throw new Error("São necessárias duas cobranças fictícias.");
    await botoes.nth(1).click();
    await botoes.nth(0).click();
    await geometria();
    await acessibilidade();
  });
  await verificar("Erro de rede apresenta recuperação", async () => {
    await pagina.route("**/api/admin/resumo", (rota) => rota.abort());
    await pagina.goto(`${origem}/admin`);
    await pagina
      .getByText(
        "Não foi possível conectar. Verifique sua conexão e tente novamente.",
        { exact: true },
      )
      .waitFor();
    await pagina.unroute("**/api/admin/resumo");
    await pagina.getByRole("button", { name: /Tentar novamente/i }).click();
    await pagina
      .getByRole("heading", { name: "Visão geral", exact: true, level: 1 })
      .waitFor();
  });
  await verificar("Sem erros de execução JavaScript", async () =>
    assert.deepEqual(erros, []),
  );
} finally {
  fs.writeFileSync(
    ".tmp/admin-ui-resultados.json",
    JSON.stringify({ aprovados, falhas, erros }, null, 2),
  );
  await navegador.close();
}
console.log(JSON.stringify({ aprovados, falhas }));
if (falhas.length) process.exitCode = 1;
