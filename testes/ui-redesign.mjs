import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { carregarFixturesSupabase } from "./fixtures-supabase.mjs";

const { fixtures } = carregarFixturesSupabase();
const fixture = fixtures[0];
const origem = "http://localhost:3001";
const executavel = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  chromium.executablePath(),
]
  .filter(Boolean)
  .find((p) => fs.existsSync(p));
assert.ok(executavel, "Chromium necessário para E2E.");
const navegador = await chromium.launch({
  headless: true,
  executablePath: executavel,
});
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  acceptDownloads: true,
});
const pagina = await contexto.newPage();
pagina.setDefaultTimeout(20000);
const problemas = [];
const errosPagina = [];
let etapa = "login";
let nomeEmpresa;
pagina.on("pageerror", (e) => errosPagina.push(e.name));
async function verificar(nome, acao) {
  etapa = nome;
  try {
    await acao();
    console.log(`OK: ${nome}`);
  } catch (e) {
    console.log(`FALHA: ${nome}`);
    problemas.push({
      teste: nome,
      erro: String(e.message)
        .replaceAll(fixture.senha, "[omitido]")
        .replaceAll(fixture.email, "[conta fictícia]")
        .slice(0, 800),
    });
    console.log(problemas.at(-1).erro);
    fs.writeFileSync(
      ".tmp/ui-redesign-resultados.json",
      JSON.stringify({ problemas, errosPagina }, null, 2),
    );
    await pagina
      .screenshot({ path: ".tmp/ui-redesign-falha.png" })
      .catch(() => {});
  }
}
async function acessar(caminho) {
  await pagina.goto(origem + caminho);
  if (nomeEmpresa && caminho !== "/entrar")
    await pagina.waitForFunction(
      (nome) =>
        [...document.querySelectorAll(".marca")].some(
          (e) => e.getAttribute("aria-label") === (nome.trim() || "Orçamentos"),
        ),
      nomeEmpresa,
    );
}
async function carregado() {
  await pagina
    .getByRole("status", { name: "Carregando conteúdo", exact: true })
    .waitFor({ state: "hidden" });
}
async function largura() {
  assert.ok(
    await pagina.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Overflow horizontal",
  );
}
async function alvos() {
  const pequenos = await pagina
    .locator('button,a,input:not([type="file"]),select,textarea')
    .evaluateAll((els) =>
      els
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const s = getComputedStyle(e);
          return (
            r.width > 0 &&
            r.height > 0 &&
            s.visibility !== "hidden" &&
            !e.classList.contains("pular") &&
            (r.width < 43.5 || r.height < 43.5)
          );
        })
        .map((e) => ({
          tag: e.tagName,
          texto: (
            e.getAttribute("aria-label") ||
            e.textContent ||
            "campo"
          ).slice(0, 50),
          largura: Math.round(e.getBoundingClientRect().width),
          altura: Math.round(e.getBoundingClientRect().height),
        })),
    );
  assert.deepEqual(
    pequenos,
    [],
    "Alvos menores que 44px: " + JSON.stringify(pequenos),
  );
}
async function axe(nome) {
  const resultado = await new AxeBuilder({ page: pagina })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    resultado.violations.map((v) => ({
      id: v.id,
      impacto: v.impact,
      nos: v.nodes.map((n) => n.target),
    })),
    [],
    `axe: ${nome}`,
  );
}
async function foto(tipo, nome) {
  await pagina.evaluate(() =>
    window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
  );
  await pagina.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
  fs.mkdirSync(`docs/ui/screenshots/${tipo}`, { recursive: true });
  await largura();
  await pagina.screenshot({
    path: `docs/ui/screenshots/${tipo}/${nome}.png`,
    fullPage: false,
  });
}
async function fecharErro() {
  await pagina
    .getByRole("alertdialog")
    .getByRole("button", { name: /Corrigir informações|Entendi/ })
    .click();
  await pagina.getByRole("alertdialog").waitFor({ state: "hidden" });
}
async function preencher() {
  await pagina
    .getByLabel(/Nome(?: \*)?$/, { exact: true })
    .fill("Cliente fictício QA redesign");
  if (
    await pagina
      .getByRole("button", { name: "Próximo", exact: true })
      .isVisible()
  )
    await pagina.getByRole("button", { name: "Próximo", exact: true }).click();
  await pagina
    .getByLabel(/Descrição do serviço 1(?: \*)?$/, { exact: true })
    .fill("Instalação de piso vinílico");
  await pagina
    .getByLabel(/Quantidade(?: \*)?$/, { exact: true })
    .first()
    .fill("35");
  await pagina
    .getByLabel(/Valor unitário \(R\$\)(?: \*)?$/, { exact: true })
    .first()
    .fill("45,00");
}
try {
  await (async () => {
    await acessar("/entrar");
    await verificar("login acessível", () => axe("login"));
    await pagina.getByLabel("E-mail", { exact: true }).fill(fixture.email);
    await pagina.getByLabel("Senha", { exact: true }).fill(fixture.senha);
    await pagina.getByRole("button", { name: "Entrar", exact: true }).click();
    await pagina.waitForURL("**/orcamentos");
    const empresa = await (
      await pagina.request.get(origem + "/api/empresa")
    ).json();
    assert.equal(
      empresa.dados.idEmpresa,
      fixture.idEmpresa,
      "Somente schema autorizado de fixtures",
    );
    nomeEmpresa = empresa.dados.nome;
    await carregado();
    if (process.argv.includes("--somente-lista")) {
      for (const [tipo, viewport] of [
        ["mobile", { width: 390, height: 844 }],
        ["desktop", { width: 1440, height: 900 }],
      ]) {
        await pagina.setViewportSize(viewport);
        await acessar("/orcamentos");
        await carregado();
        await Promise.all([
          pagina.waitForResponse(
            (r) =>
              new URL(r.url()).pathname === "/api/orcamentos" &&
              new URL(r.url()).searchParams.get("busca") ===
                "Cliente fictício QA",
          ),
          pagina
            .getByRole("textbox", { name: "Buscar por nome ou número" })
            .fill("Cliente fictício QA"),
        ]);
        await carregado();
        await verificar(`${tipo}: lista após ajuste de status`, async () => {
          await axe("listagem");
          await alvos();
          await largura();
        });
        await foto(tipo, "listagem");
        const detalhe = await pagina
          .locator(".card-orcamento")
          .first()
          .getAttribute("href");
        assert.match(detalhe, /^\/orcamentos\/[a-f0-9-]+$/);
        if (tipo === "mobile")
          await pagina.getByRole("button", { name: "Abrir navegação" }).click();
        await foto(tipo, "navegacao");
        if (tipo === "mobile") await pagina.keyboard.press("Escape");
        await acessar(detalhe);
        await pagina
          .getByRole("button", { name: "Baixar PDF", exact: true })
          .waitFor();
        await verificar(`${tipo}: detalhe após ajuste de status`, () =>
          axe("detalhe"),
        );
      }
      await pagina.getByRole("button", { name: "Sair", exact: true }).click();
      await pagina.waitForURL("**/entrar");
      assert.deepEqual(errosPagina, []);
      return;
    }
    for (const [tipo, viewport] of [
      ["mobile", { width: 390, height: 844 }],
      ["desktop", { width: 1440, height: 900 }],
    ]) {
      await pagina.setViewportSize(viewport);
      await acessar("/orcamentos");
      await carregado();
      await Promise.all([
        pagina.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === "/api/orcamentos" &&
            new URL(r.url()).searchParams.get("busca") ===
              "Cliente fictício QA",
        ),
        pagina
          .getByRole("textbox", { name: "Buscar por nome ou número" })
          .fill("Cliente fictício QA"),
      ]);
      await carregado();
      await verificar(`${tipo}: listagem axe e alvos`, async () => {
        await axe("listagem");
        await alvos();
      });
      await foto(tipo, "listagem");
      if (tipo === "mobile") {
        await pagina.getByRole("button", { name: "Abrir navegação" }).click();
        await pagina.getByRole("dialog").waitFor();
        await verificar("menu teclado/axe", async () => {
          await axe("menu");
          for (let i = 0; i < 8; i++) {
            await pagina.keyboard.press("Tab");
            assert.ok(
              await pagina
                .getByRole("dialog")
                .evaluate((e) => e.contains(document.activeElement)),
            );
          }
        });
        await foto(tipo, "navegacao");
        await pagina.keyboard.press("Escape");
        await pagina.getByRole("button", { name: "Abrir navegação" }).focus();
      } else await foto(tipo, "navegacao");
      await acessar("/orcamentos/novo");
      await pagina.getByLabel(/Nome(?: \*)?$/, { exact: true }).waitFor();
      await foto(tipo, "novo-orcamento");
      await pagina
        .getByRole("button", { name: "Salvar orçamento", exact: true })
        .click();
      await pagina.getByRole("alertdialog").waitFor();
      await foto(tipo, "validacao-zod");
      await verificar(`${tipo}: erro Zod foco aria`, async () => {
        await axe("validação");
        await pagina.keyboard.press("Tab");
        assert.ok(
          await pagina
            .getByRole("alertdialog")
            .evaluate((e) => e.contains(document.activeElement)),
        );
        await fecharErro();
        assert.equal(
          await pagina
            .getByLabel(/Nome(?: \*)?$/, { exact: true })
            .getAttribute("aria-invalid"),
          "true",
        );
        await pagina.waitForFunction(
          () => document.activeElement?.id === "orcamento-clienteNome",
        );
      });
      if (await pagina.getByRole("alertdialog").isVisible()) await fecharErro();
      await acessar("/configuracoes");
      await pagina
        .getByLabel(/Nome da empresa(?: \*)?$/, { exact: true })
        .waitFor();
      await verificar(`${tipo}: configurações axe alvos`, async () => {
        await axe("configurações");
        await alvos();
      });
      await foto(tipo, "configuracoes");
      let liberar;
      const espera = new Promise((r) => {
        liberar = r;
      });
      const segurar = async (route) => {
        if (route.request().method() === "GET") {
          await espera;
          await route.continue();
        } else await route.continue();
      };
      await pagina.route("**/api/orcamentos?*", segurar);
      await acessar("/orcamentos");
      await pagina
        .getByRole("status", { name: "Carregando conteúdo", exact: true })
        .waitFor();
      await foto(tipo, "carregamento");
      liberar();
      await carregado();
      await pagina.unroute("**/api/orcamentos?*", segurar);
    }
    if (process.argv.includes("--somente-capturas")) {
      await pagina.setViewportSize({ width: 1440, height: 900 });
      await acessar("/orcamentos");
      await pagina.getByRole("button", { name: "Sair", exact: true }).click();
      await pagina.waitForURL("**/entrar");
      assert.deepEqual(errosPagina, []);
      return;
    }
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await pagina.setViewportSize(viewport);
      for (const caminho of [
        "/orcamentos",
        "/orcamentos/novo",
        "/configuracoes",
      ])
        await verificar(
          `${viewport.width}x${viewport.height} ${caminho}`,
          async () => {
            await acessar(caminho);
            await carregado();
            await largura();
            await alvos();
          },
        );
    }
    await pagina.setViewportSize({ width: 1440, height: 900 });
    await acessar("/orcamentos/novo");
    await preencher();
    await verificar("formulário axe e campo focado acessível", async () => {
      await axe("formulário preenchido");
      const visivel = await pagina.evaluate(() => {
        const campo = document.activeElement?.getBoundingClientRect();
        const footer = document
          .querySelector(".acoes-formulario")
          ?.getBoundingClientRect();
        return (
          !!campo &&
          !!footer &&
          campo.top >= 0 &&
          campo.bottom <= innerHeight &&
          campo.bottom <= footer.top
        );
      });
      assert.ok(visivel, "Campo focado não deve ficar sob ações fixas");
    });
    await verificar("API Zod estruturado preserva/foca", async () => {
      const falha = async (r) =>
        r.request().method() === "POST"
          ? r.fulfill({
              status: 400,
              contentType: "application/json",
              body: JSON.stringify({
                erro: "Confira as informações.",
                campos: [
                  {
                    campo: "itens.0.quantidadeMilesimos",
                    mensagem: "A quantidade deve ser maior que zero.",
                  },
                ],
              }),
            })
          : r.continue();
      await pagina.route("**/api/orcamentos", falha);
      await pagina
        .getByRole("button", { name: "Salvar orçamento", exact: true })
        .click();
      await pagina.getByRole("alertdialog").waitFor();
      await fecharErro();
      assert.equal(
        await pagina
          .getByLabel(/Quantidade(?: \*)?$/, { exact: true })
          .first()
          .inputValue(),
        "35",
      );
      assert.equal(
        await pagina
          .getByLabel(/Quantidade(?: \*)?$/, { exact: true })
          .first()
          .getAttribute("aria-invalid"),
        "true",
      );
      await pagina.waitForFunction(() =>
        document.activeElement?.id?.endsWith("quantidadeMilesimos"),
      );
      await pagina.unroute("**/api/orcamentos", falha);
    });
    await pagina.unroute("**/api/orcamentos");
    if (await pagina.getByRole("alertdialog").isVisible()) await fecharErro();
    let posts = 0;
    const contar = (r) => {
      if (
        r.method() === "POST" &&
        new URL(r.url()).pathname === "/api/orcamentos"
      )
        posts++;
    };
    pagina.on("request", contar);
    await verificar("criação real bloqueia envio duplo", async () => {
      const b = pagina.getByRole("button", {
        name: "Salvar orçamento",
        exact: true,
      });
      await b.evaluate((e) => {
        e.click();
        e.click();
      });
      await pagina.waitForURL(/\/orcamentos\/[a-f0-9-]+$/);
      assert.equal(posts, 1);
    });
    pagina.off("request", contar);
    const detalhe = new URL(pagina.url()).pathname;
    assert.match(detalhe, /^\/orcamentos\/[a-f0-9-]+$/);
    await verificar("confirmação exclusão cancelável segura", async () => {
      await pagina
        .getByRole("button", { name: /Excluir/, exact: true })
        .click();
      const d = pagina.getByRole("alertdialog");
      await d.waitFor();
      await pagina.waitForFunction(
        () => document.activeElement?.textContent?.trim() === "Cancelar",
      );
      await axe("confirmar exclusão");
      for (let i = 0; i < 4; i++) {
        await pagina.keyboard.press("Tab");
        assert.ok(await d.evaluate((e) => e.contains(document.activeElement)));
      }
      await d.getByRole("button", { name: "Cancelar", exact: true }).click();
    });
    if (await pagina.getByRole("alertdialog").isVisible()) {
      await pagina
        .getByRole("alertdialog")
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
    }
    await verificar("falha GET bloqueia edição e retry", async () => {
      let puts = 0;
      const falha = async (r) => {
        if (r.request().method() === "GET")
          await r.fulfill({
            status: 500,
            contentType: "application/json",
            body: '{"erro":"Falha temporária de teste."}',
          });
        else {
          if (r.request().method() === "PUT") puts++;
          await r.continue();
        }
      };
      await pagina.route("**/api" + detalhe, falha);
      await acessar(detalhe + "/editar");
      await pagina.getByRole("alertdialog").waitFor();
      await fecharErro();
      await pagina.getByRole("button", { name: "Tentar novamente" }).waitFor();
      assert.equal(
        await pagina
          .getByRole("button", { name: "Salvar orçamento", exact: true })
          .count(),
        0,
      );
      assert.equal(puts, 0);
      await pagina.unroute("**/api" + detalhe, falha);
      await pagina.getByRole("button", { name: "Tentar novamente" }).click();
      await pagina.getByLabel(/Nome(?: \*)?$/, { exact: true }).waitFor();
    });
    await pagina.unroute("**/api" + detalhe);
    if (
      !(await pagina.getByLabel(/Nome(?: \*)?$/, { exact: true }).isVisible())
    )
      await acessar(detalhe + "/editar");
    await verificar("edição real", async () => {
      await pagina
        .getByLabel(/Nome(?: \*)?$/, { exact: true })
        .fill("Cliente fictício QA atualizado");
      await pagina
        .getByRole("button", { name: "Salvar orçamento", exact: true })
        .click();
      await pagina.waitForURL(origem + detalhe);
      await pagina
        .getByText("Cliente fictício QA atualizado", { exact: true })
        .waitFor();
    });
    await acessar(detalhe);
    await verificar("download PDF privado", async () => {
      const [download] = await Promise.all([
        pagina.waitForEvent("download"),
        pagina.getByRole("button", { name: "Baixar PDF", exact: true }).click(),
      ]);
      assert.match(download.suggestedFilename(), /^orcamento-\d+\.pdf$/);
    });
    await verificar("configurações upload real", async () => {
      await acessar("/configuracoes");
      await pagina
        .getByLabel(/Nome da empresa(?: \*)?$/, { exact: true })
        .waitFor();
      await pagina
        .getByLabel("Selecionar imagem", { exact: true })
        .setInputFiles({
          name: "logo-qa.png",
          mimeType: "image/png",
          buffer: fs.readFileSync("public/icone-192.png"),
        });
      await pagina.getByRole("img", { name: /Prévia da logo/ }).waitFor();
      await pagina
        .getByRole("button", { name: "Salvar configurações", exact: true })
        .click();
      await pagina
        .getByText("Configurações salvas.", { exact: true })
        .waitFor();
    });
    await verificar("erro listagem não mostra vazio", async () => {
      const falha = (r) =>
        r.fulfill({
          status: 500,
          contentType: "application/json",
          body: '{"erro":"Falha temporária de teste."}',
        });
      await pagina.route("**/api/orcamentos?*", falha);
      await acessar("/orcamentos");
      await pagina.getByRole("button", { name: "Tentar novamente" }).waitFor();
      assert.equal(
        await pagina
          .getByText("Seu primeiro orçamento começa aqui", { exact: true })
          .count(),
        0,
      );
      await pagina.unroute("**/api/orcamentos?*", falha);
    });
    await acessar("/orcamentos");
    await carregado();
    await verificar("PWA somente cache público", async () => {
      const urls = await pagina.evaluate(async () => {
        await navigator.serviceWorker.ready;
        return (
          await Promise.all(
            (await caches.keys())
              .filter((n) => n.startsWith("orcamentos-publico-"))
              .map(async (n) =>
                (await (await caches.open(n)).keys()).map(
                  (r) => new URL(r.url).pathname,
                ),
              ),
          )
        ).flat();
      });
      assert.ok(urls.includes("/offline.html"));
      assert.ok(urls.every((p) => ["/offline.html", "/icone.svg"].includes(p)));
    });
    await verificar("movimento reduzido", async () => {
      await pagina.emulateMedia({ reducedMotion: "reduce" });
      assert.ok(
        await pagina.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches,
        ),
      );
      const duracoes = await pagina
        .locator("button")
        .evaluateAll((es) =>
          es.map((e) => getComputedStyle(e).transitionDuration),
        );
      assert.ok(
        duracoes.every((d) => d.split(",").every((v) => parseFloat(v) <= 0.01)),
      );
    });
    await verificar("logout", async () => {
      await pagina.getByRole("button", { name: "Sair", exact: true }).click();
      await pagina.waitForURL("**/entrar");
      assert.equal(
        (await pagina.request.get(origem + "/api/empresa")).status(),
        401,
      );
    });
    await verificar("sem erros de página", async () =>
      assert.deepEqual(errosPagina, []),
    );
  })();
} catch (e) {
  problemas.push({
    teste: etapa,
    erro: String(e.message)
      .replaceAll(fixture.senha, "[omitido]")
      .replaceAll(fixture.email, "[conta fictícia]")
      .slice(0, 800),
  });
} finally {
  fs.mkdirSync(".tmp", { recursive: true });
  fs.writeFileSync(
    ".tmp/ui-redesign-resultados.json",
    JSON.stringify({ problemas, errosPagina }, null, 2),
  );
  await navegador.close();
}
if (problemas.length) {
  console.log(JSON.stringify(problemas, null, 2));
  process.exitCode = 1;
} else
  console.log(
    process.argv.includes("--somente-lista")
      ? "UI redesign: capturas de lista/navegação e axe lista/detalhe verificados."
      : process.argv.includes("--somente-capturas")
        ? "UI redesign: 12 capturas finais e axe de páginas/diálogos verificados."
        : "UI redesign: fluxos, cinco viewports, axe, foco, screenshots e cache verificados.",
  );
