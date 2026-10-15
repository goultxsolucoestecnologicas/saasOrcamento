import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { carregarFixturesSupabase } from "./fixtures-supabase.mjs";
const { fixtures } = carregarFixturesSupabase();
const origem = "http://localhost:3001";
const executavel = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  chromium.executablePath(),
].find((p) => fs.existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath: executavel,
});
const contexto = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  acceptDownloads: true,
});
const page = await contexto.newPage();
page.setDefaultTimeout(20000);
const errosPagina = [];
let nomeEmpresa;
page.on("pageerror", (e) => errosPagina.push(e.name));
const resultados = [];
let id =
  process.argv.includes("--revisao") || process.argv.includes("--capturas")
    ? JSON.parse(
        fs.readFileSync(".tmp/pdf-comercial-ui-resultados.json", "utf8"),
      ).id
    : undefined;
async function teste(nome, acao) {
  try {
    await acao();
    resultados.push({ nome, ok: true });
    console.log("OK: " + nome);
  } catch (e) {
    let mensagem = String(e.message);
    for (const f of fixtures)
      for (const v of [f.email, f.senha])
        mensagem = mensagem.replaceAll(v, "[omitido]");
    resultados.push({ nome, ok: false, erro: mensagem.slice(0, 1200) });
    console.log("FALHA: " + nome + " " + mensagem.slice(0, 1200));
  }
}
async function login(p, f) {
  await p.goto(origem + "/entrar");
  await p.getByLabel("E-mail", { exact: true }).fill(f.email);
  await p.getByLabel("Senha", { exact: true }).fill(f.senha);
  await p.getByRole("button", { name: "Entrar", exact: true }).click();
  await p.waitForURL("**/orcamentos");
  const empresa = await (await p.request.get(origem + "/api/empresa")).json();
  assert.equal(empresa.dados.idEmpresa, f.idEmpresa);
  if (f.idEmpresa === fixtures[0].idEmpresa) nomeEmpresa = empresa.dados.nome;
}
async function novo() {
  await page.goto(origem + "/orcamentos/novo");
  await page.getByLabel("Tipo do documento", { exact: false }).waitFor();
}
async function axe() {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    r.violations.map((v) => ({ id: v.id, nos: v.nodes.map((n) => n.target) })),
    [],
  );
}
async function largura() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Overflow horizontal",
  );
}
async function foto(tipo, nome) {
  await page.waitForFunction(
    (empresa) =>
      [...document.querySelectorAll(".marca span")].some(
        (e) => e.textContent === empresa,
      ),
    nomeEmpresa,
  );
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  await page.waitForFunction(() => scrollY === 0);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((i) =>
        i.complete
          ? Promise.resolve()
          : new Promise((r) => {
              i.addEventListener("load", r, { once: true });
              i.addEventListener("error", r, { once: true });
            }),
      ),
    );
  });
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
  fs.mkdirSync("docs/pdf/telas/" + tipo, { recursive: true });
  await page.screenshot({
    path: `docs/pdf/telas/${tipo}/${nome}.png`,
    fullPage: true,
  });
}
async function fecharErro() {
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: /Corrigir informações|Entendi/ })
    .click();
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
}
try {
  await login(page, fixtures[0]);
  if (process.argv.includes("--capturas")) {
    const pdfFinal = await page.request.get(
      origem + `/api/orcamentos/${id}/pdf`,
    );
    assert.equal(pdfFinal.status(), 200);
    assert.match(pdfFinal.headers()["content-type"], /application\/pdf/);
    const corpoPdf = await pdfFinal.body();
    assert.ok(corpoPdf.subarray(0, 4).equals(Buffer.from("%PDF")));
    fs.writeFileSync(".tmp/pedido-comercial-real.pdf", corpoPdf);
    for (const [tipo, viewport] of [
      ["desktop", { width: 1440, height: 900 }],
      ["mobile", { width: 390, height: 844 }],
    ]) {
      await page.setViewportSize(viewport);
      await novo();
      await foto(tipo, "novo-documento");
      await page.goto(origem + "/orcamentos/" + id + "/editar");
      await page.getByLabel("Data de emissão", { exact: false }).waitFor();
      await foto(tipo, "editar-documento");
      await page.goto(origem + "/configuracoes");
      await page.getByLabel("Nome da empresa", { exact: false }).waitFor();
      const valores = {
        "Descrição da atividade": "Aplicações de vinílicos",
        "Nome do responsável": "Responsável fictício",
        Cidade: "Torres",
        "Estado (UF)": "RS",
        "Frase ou slogan comercial": "O toque final para sua casa",
        Instagram: "@empresa_ficticia",
        Facebook: "Empresa fictícia",
      };
      for (const [rotulo, valor] of Object.entries(valores))
        await page.getByLabel(rotulo, { exact: true }).fill(valor);
      await foto(tipo, "configuracoes");
      await largura();
      await axe();
    }
    console.log("OK: seis capturas sem persistência");
  } else {
    await teste("novo documento: cinco viewports, axe e overflow", async () => {
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({
          width,
          height: width === 1440 ? 900 : 844,
        });
        await novo();
        await axe();
        await largura();
      }
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await novo();
    await page
      .getByLabel("Tipo do documento", { exact: false })
      .selectOption("PEDIDO");
    await page
      .getByLabel("Data de emissão", { exact: false })
      .fill("2024-02-29");
    await page
      .getByLabel(/^Nome(?: \*)?$/, { exact: true })
      .fill("Cliente fictício PDF comercial");
    await page.getByLabel("Número do endereço", { exact: true }).fill("240");
    await page.getByLabel("Inscrição Estadual", { exact: true }).fill("ISENTO");
    await page
      .getByLabel(/Descrição do serviço 1/)
      .fill("Instalação de piso vinílico");
    await page
      .getByLabel(/^Quantidade/)
      .first()
      .fill("35");
    await page
      .getByLabel(/^Valor unitário/)
      .first()
      .fill("45,00");
    await foto("desktop", "novo-documento");
    await teste(
      "criação de pedido com data histórica e dados fiscais",
      async () => {
        if (!id) {
          await page
            .getByRole("button", {
              name: /Salvar orçamento|Salvar pedido/,
              exact: true,
            })
            .click();
          await page.waitForURL(/\/orcamentos\/[a-f0-9-]+$/);
          id = page.url().split("/").at(-1);
        } else await page.goto(origem + "/orcamentos/" + id);
        const r = await (
          await page.request.get(origem + "/api/orcamentos/" + id)
        ).json();
        assert.equal(r.dados.tipoDocumento, "PEDIDO");
        assert.equal(r.dados.dataEmissao.slice(0, 10), "2024-02-29");
        assert.equal(r.dados.clienteNumeroEndereco, "240");
        assert.equal(r.dados.clienteInscricaoEstadual, "ISENTO");
      },
    );
    if (!id)
      throw new Error("Criação falhou; testes dependentes interrompidos.");
    await teste("edição preserva data e tipo", async () => {
      await page.goto(origem + "/orcamentos/" + id + "/editar");
      await page.getByLabel("Data de emissão", { exact: false }).waitFor();
      assert.equal(
        await page.getByLabel("Data de emissão", { exact: false }).inputValue(),
        "2024-02-29",
      );
      assert.equal(
        await page
          .getByLabel("Tipo do documento", { exact: false })
          .inputValue(),
        "PEDIDO",
      );
      for (const [tipo, viewport] of [
        ["desktop", { width: 1440, height: 900 }],
        ["mobile", { width: 390, height: 844 }],
      ]) {
        await page.setViewportSize(viewport);
        await axe();
        await largura();
        await foto(tipo, "editar-documento");
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page
        .getByRole("button", {
          name: /Salvar orçamento|Salvar pedido/,
          exact: true,
        })
        .click();
      await page.waitForURL(/\/orcamentos\/[a-f0-9-]+$/);
    });
    await teste(
      "PDF de pedido, trava contra duplo clique e cabeçalhos",
      async () => {
        let chamadas = 0;
        const contar = (r) => {
          if (new URL(r.url()).pathname === `/api/orcamentos/${id}/pdf`)
            chamadas++;
        };
        page.on("request", contar);
        const baixar = page.getByRole("button", {
          name: "Baixar PDF",
          exact: true,
        });
        const download = page.waitForEvent("download");
        await baixar.evaluate((e) => {
          e.click();
          e.click();
        });
        const arquivo = await download;
        assert.match(arquivo.suggestedFilename(), /pedido/i);
        assert.equal(chamadas, 1);
        page.off("request", contar);
        const r = await page.request.get(origem + `/api/orcamentos/${id}/pdf`);
        assert.equal(r.status(), 200);
        assert.match(r.headers()["content-type"], /application\/pdf/);
        assert.match(r.headers()["content-disposition"], /pedido/i);
        assert.ok((await r.body()).subarray(0, 4).equals(Buffer.from("%PDF")));
      },
    );
    await teste("erro PDF exibe AlertDialog e preserva ações", async () => {
      await page.route("**/api/orcamentos/" + id + "/pdf", (r) =>
        r.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ erro: "Falha fictícia de geração do PDF." }),
        }),
      );
      try {
        await page
          .getByRole("button", { name: "Baixar PDF", exact: true })
          .click();
        await page.getByRole("alertdialog").waitFor();
        await axe();
        await fecharErro();
        assert.equal(
          await page
            .getByRole("button", { name: "Baixar PDF", exact: true })
            .isEnabled(),
          true,
        );
      } finally {
        await page.unroute("**/api/orcamentos/" + id + "/pdf");
      }
    });
    await teste("isolamento PDF e CSRF", async () => {
      const outro = await browser.newContext();
      try {
        const p = await outro.newPage();
        await login(p, fixtures[1]);
        assert.equal(
          (await p.request.get(origem + `/api/orcamentos/${id}/pdf`)).status(),
          404,
        );
      } finally {
        await outro.close();
      }
      const r = await page.request.post(origem + "/api/orcamentos", {
        headers: { origin: "https://invasor.invalid" },
        data: {},
      });
      assert.equal(r.status(), 403);
    });
    await teste(
      "configurações: sete campos opcionais e UF inválida",
      async () => {
        await page.goto(origem + "/configuracoes");
        await page.getByLabel("Nome da empresa", { exact: false }).waitFor();
        const valores = {
          "Descrição da atividade": "Aplicações de vinílicos",
          "Nome do responsável": "Responsável fictício",
          Cidade: "Torres",
          "Estado (UF)": "RS",
          "Frase ou slogan comercial": "O toque final para sua casa",
          Instagram: "@empresa_ficticia",
          Facebook: "Empresa fictícia",
        };
        for (const [rotulo, valor] of Object.entries(valores))
          await page.getByLabel(rotulo, { exact: true }).fill(valor);
        for (const [tipo, viewport] of [
          ["desktop", { width: 1440, height: 900 }],
          ["mobile", { width: 390, height: 844 }],
        ]) {
          await page.setViewportSize(viewport);
          await axe();
          await largura();
          await foto(tipo, "configuracoes");
        }
        let gravacoes = 0;
        const observar = (r) => {
          if (
            r.method() === "PUT" &&
            new URL(r.url()).pathname === "/api/empresa"
          )
            gravacoes++;
        };
        page.on("request", observar);
        await page.getByLabel("Estado (UF)", { exact: true }).fill("XX");
        await page
          .getByRole("button", { name: "Salvar configurações", exact: true })
          .click();
        await page.getByRole("alertdialog").waitFor();
        await axe();
        await fecharErro();
        await page.waitForFunction(
          () => document.activeElement?.id === "estado",
        );
        assert.equal(
          await page
            .getByLabel("Estado (UF)", { exact: true })
            .getAttribute("aria-invalid"),
          "true",
        );
        assert.equal(gravacoes, 0);
        page.off("request", observar);
        await page.goto(origem + "/orcamentos/novo");
        await page.getByLabel("Tipo do documento", { exact: false }).waitFor();
        await foto("mobile", "novo-documento");
      },
    );
    assert.deepEqual(errosPagina, []);
  }
} finally {
  fs.mkdirSync(".tmp", { recursive: true });
  if (!process.argv.includes("--capturas"))
    fs.writeFileSync(
      ".tmp/pdf-comercial-ui-resultados.json",
      JSON.stringify({ resultados, errosPagina, id }, null, 2),
    );
  await browser.close();
}
if (resultados.some((r) => !r.ok)) process.exitCode = 1;
