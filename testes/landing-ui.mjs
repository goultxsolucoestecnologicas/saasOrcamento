import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const origem = "http://localhost:3002";
const executavel = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  chromium.executablePath(),
]
  .filter(Boolean)
  .find((p) => fs.existsSync(p));
const navegador = await chromium.launch({
  headless: true,
  executablePath: executavel,
});
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  locale: "pt-BR",
  reducedMotion: "reduce",
  serviceWorkers: "block",
});
const pagina = await contexto.newPage();
const erros = [];
const resultados = [];
const falhas = [];
pagina.on("pageerror", (e) => erros.push(e.name));
async function teste(nome, acao) {
  try {
    await acao();
    resultados.push(nome);
    console.log("OK: " + nome);
  } catch (e) {
    falhas.push({ nome, erro: String(e.message).slice(0, 1600) });
    console.log("FALHA: " + nome);
  }
}
async function geometria() {
  const r = await pagina.evaluate(() => {
    const visivel = (e) => {
      const r = e.getBoundingClientRect(),
        s = getComputedStyle(e);
      return (
        r.width > 0 &&
        r.height > 0 &&
        s.visibility !== "hidden" &&
        !e.classList.contains("pular")
      );
    };
    const alvos = [
      ...document.querySelectorAll(
        ".landing a,.landing button,.landing-menu a,.landing-menu button",
      ),
    ]
      .filter(visivel)
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width < 43.5 || r.height < 43.5;
      })
      .map((e) => ({
        nome: (e.textContent || e.getAttribute("aria-label"))
          .trim()
          .slice(0, 45),
        w: Math.round(e.getBoundingClientRect().width),
        h: Math.round(e.getBoundingClientRect().height),
      }));
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      alvos,
    };
  });
  assert.deepEqual(r, { overflow: false, alvos: [] });
}
async function axe(nome) {
  await teste(nome, async () => {
    const r = await new AxeBuilder({ page: pagina })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    assert.deepEqual(
      r.violations.map((v) => ({
        id: v.id,
        nos: v.nodes.map((n) => n.target),
      })),
      [],
    );
  });
}
try {
  const resposta = await pagina.goto(origem);
  assert.equal(resposta.status(), 200);
  await pagina.getByRole("heading", { level: 1 }).waitFor();
  await teste("página pública sem sessão", async () => {
    assert.equal(await pagina.locator("h1").count(), 1);
    assert.equal(await pagina.locator("main section").count(), 9);
    assert.match(await pagina.locator(".landing-price").innerText(), /29,99/);
    assert.match(
      await pagina.locator(".landing-price-company").innerText(),
      /2 usuários/,
    );
    assert.ok((await pagina.title()).includes("OrçaFácil"));
    assert.match(
      await pagina.locator('meta[name="description"]').getAttribute("content"),
      /29,99/,
    );
  });
  await teste("CTAs coerentes e sem destino inventado", async () => {
    const links = await pagina
      .getByRole("link", { name: /Quero começar/ })
      .evaluateAll((es) => es.map((e) => e.getAttribute("href")));
    assert.ok(links.length >= 2);
    assert.equal(new Set(links).size, 1);
    const url = links[0];
    assert.ok(
      url === "#contato" ||
        /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(url),
    );
    for (const href of await pagina
      .locator('a[href^="#"]')
      .evaluateAll((es) => es.map((e) => e.getAttribute("href"))))
      assert.equal(await pagina.locator(href).count(), 1);
  });
  for (const largura of [320, 360, 390, 768, 1024, 1280, 1440, 1920]) {
    await pagina.setViewportSize({ width: largura, height: 900 });
    await pagina.goto(origem);
    await pagina.getByRole("heading", { level: 1 }).waitFor();
    await teste(`layout ${largura}px`, geometria);
    if ([390, 1440].includes(largura)) {
      await pagina.evaluate(async () => {
        for (const i of document.images) i.loading = "eager";
        await Promise.all(
          [...document.images].map((i) => i.decode().catch(() => {})),
        );
      });
      await teste(`imagens ${largura}px`, async () =>
        assert.ok(
          await pagina
            .locator(".landing img")
            .evaluateAll((es) =>
              es.every((i) => i.complete && i.naturalWidth > 0),
            ),
        ),
      );
      await axe(`axe ${largura}px`);
      fs.mkdirSync("docs/landing/capturas", { recursive: true });
      await pagina.screenshot({
        path: `docs/landing/capturas/hero-${largura}.png`,
        fullPage: false,
      });
      await pagina.screenshot({
        path: `docs/landing/capturas/${largura}.png`,
        fullPage: true,
      });
    }
    if (largura === 390) {
      await pagina.getByRole("button", { name: "Abrir menu" }).click();
      await pagina.getByRole("dialog").waitFor();
      await teste("menu mobile", geometria);
      await axe("axe menu");
      await pagina
        .getByRole("navigation", { name: "Navegação mobile" })
        .getByRole("link", { name: "Preços", exact: true })
        .click();
      await pagina.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(new URL(pagina.url()).hash, "#precos");
    }
  }
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.goto(origem);
  await teste("demonstração com quatro telas e teclado", async () => {
    const abas = pagina.getByRole("tab");
    assert.equal(await abas.count(), 4);
    for (let n = 0; n < 4; n++) {
      await abas.nth(n).click();
      assert.equal(await abas.nth(n).getAttribute("aria-selected"), "true");
      assert.equal(await pagina.getByRole("tabpanel").count(), 1);
    }
    await abas.nth(3).press("Home");
    assert.equal(await abas.nth(0).getAttribute("aria-selected"), "true");
    await abas.nth(0).press("ArrowRight");
    assert.equal(await abas.nth(1).getAttribute("aria-selected"), "true");
    await geometria();
  });
  await teste("FAQ abre e fecha pelo teclado", async () => {
    const questoes = pagina.locator('[data-slot="accordion-trigger"]');
    assert.equal(await questoes.count(), 8);
    await questoes.first().focus();
    await questoes.first().press("Enter");
    assert.equal(await questoes.first().getAttribute("aria-expanded"), "true");
    await questoes.first().press("Enter");
    assert.equal(await questoes.first().getAttribute("aria-expanded"), "false");
  });
  await teste("contato provisório explícito", async () => {
    const botao = pagina
      .locator("#contato")
      .getByRole("button", { name: /Quero começar/ });
    if (await botao.count()) {
      await botao.click();
      await pagina.getByRole("dialog").waitFor();
      assert.match(
        await pagina.getByRole("dialog").innerText(),
        /preparação|preview/i,
      );
      await pagina.keyboard.press("Escape");
      await pagina.getByRole("dialog").waitFor({ state: "hidden" });
    } else
      assert.match(
        await pagina
          .locator("#contato")
          .getByRole("link", { name: /Quero começar/ })
          .getAttribute("href"),
        /^https:/,
      );
  });
  await axe("axe após interação");
  await teste("movimento reduzido", async () => {
    const animacoes = await pagina
      .locator(".landing")
      .evaluate((e) =>
        [e, ...e.querySelectorAll("*")]
          .filter((n) => getComputedStyle(n).animationName !== "none")
          .map((n) => getComputedStyle(n).animationDuration),
      );
    assert.ok(animacoes.every((d) => parseFloat(d) <= 0.01));
  });
  await teste("SEO local não indexa ambiente de teste", async () => {
    const robots = await (
      await pagina.request.get(origem + "/robots.txt")
    ).text();
    assert.match(robots, /Disallow: \//);
    assert.match(
      await pagina.locator('meta[name="robots"]').getAttribute("content"),
      /noindex/,
    );
    const sitemap = await (
      await pagina.request.get(origem + "/sitemap.xml")
    ).text();
    assert.ok(!sitemap.includes("/orcamentos"));
    const og = await pagina.request.get(origem + "/opengraph-image");
    assert.equal(og.status(), 200);
    assert.match(og.headers()["content-type"], /image\/png/);
  });
  await teste("rotas privadas preservadas", async () => {
    const entrada = await pagina.goto(origem + "/entrar");
    assert.equal(entrada.status(), 200);
    await pagina.getByLabel("E-mail", { exact: true }).waitFor();
    for (const rota of ["/api/empresa", "/api/orcamentos"]) {
      const r = await pagina.request.get(origem + rota);
      assert.equal(r.status(), 401);
      assert.match(r.headers()["cache-control"], /no-store/);
    }
  });
  await teste("sem erros de JavaScript", async () =>
    assert.deepEqual(erros, []),
  );
} catch (e) {
  falhas.push({ nome: "execução", erro: String(e.message).slice(0, 1600) });
} finally {
  fs.mkdirSync(".tmp", { recursive: true });
  fs.writeFileSync(
    ".tmp/landing-ui.json",
    JSON.stringify({ aprovados: resultados.length, falhas, erros }, null, 2),
  );
  console.log(
    JSON.stringify({ aprovados: resultados.length, falhas }, null, 2),
  );
  await navegador.close();
}
if (falhas.length) process.exitCode = 1;
