import { carregarFixturesSupabase } from "./fixtures-supabase.mjs";
carregarFixturesSupabase();
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const fixture = JSON.parse(fs.readFileSync(".tmp/fixture-login.json", "utf8"));
const candidatos = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  chromium.executablePath(),
].filter(Boolean);
const executavel = candidatos.find((caminho) => fs.existsSync(caminho));
assert.ok(
  executavel,
  "Instale Chromium para Playwright ou configure PLAYWRIGHT_CHROMIUM_EXECUTABLE.",
);
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
pagina.setDefaultTimeout(15000);
const erros = [];
pagina.on("pageerror", (erro) => erros.push(erro.name));
let etapa = "login";
async function fotografia(nome) {
  assert.equal(
    await pagina.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Tela deve caber na largura do dispositivo",
  );
  await pagina.screenshot({ path: `.tmp/${nome}.png`, fullPage: true });
}
try {
  await pagina.goto("http://localhost:3001/entrar");
  await pagina.getByLabel("E-mail", { exact: true }).fill(fixture.email);
  await pagina.getByLabel("Senha", { exact: true }).fill(fixture.senha);
  await pagina.getByRole("button", { name: "Entrar", exact: true }).click();
  await pagina.waitForURL("**/orcamentos");
  const empresa = await (
    await pagina.request.get("http://localhost:3001/api/empresa")
  ).json();
  assert.equal(
    empresa.dados.idEmpresa,
    fixture.idEmpresa,
    "Fluxo UI precisa usar schema isolado",
  );
  await pagina.waitForFunction(
    () => !document.body.innerText.includes("Carregando orçamentos"),
  );
  await fotografia("ui-lista-mobile");
  etapa = "cliente";
  await pagina
    .getByRole("link", { name: "Novo orçamento", exact: true })
    .last()
    .click();
  await pagina
    .getByLabel("Nome *", { exact: true })
    .fill("Cliente do teste visual");
  await pagina.getByLabel("Telefone", { exact: true }).fill("(51) 99999-0000");
  await pagina
    .getByLabel("Endereço", { exact: true })
    .fill("Rua de teste, 240");
  await pagina.getByLabel("Cidade", { exact: true }).fill("Torres - RS");
  await pagina
    .getByLabel("Observações", { exact: true })
    .fill("Aplicação conforme proposta. Materiais não inclusos.");
  await fotografia("ui-cliente-mobile");
  await pagina.getByRole("button", { name: "Próximo", exact: true }).click();
  etapa = "itens";
  await pagina
    .getByLabel("Descrição do serviço 1", { exact: true })
    .fill("Instalação de piso vinílico");
  await pagina.getByLabel("Quantidade", { exact: true }).first().fill("35");
  await pagina
    .getByLabel("Valor unitário (R$)", { exact: true })
    .first()
    .fill("45,00");
  await pagina
    .getByRole("button", { name: "Adicionar serviço", exact: true })
    .click();
  await pagina
    .getByLabel("Descrição do serviço 2", { exact: true })
    .fill("Instalação de rodapé");
  await pagina.getByLabel("Quantidade", { exact: true }).nth(1).fill("28");
  await pagina
    .getByRole("combobox", { name: /Unidade/ })
    .nth(1)
    .selectOption("m");
  await pagina
    .getByLabel("Valor unitário (R$)", { exact: true })
    .nth(1)
    .fill("18,00");
  await fotografia("ui-itens-mobile");
  await pagina.setViewportSize({ width: 320, height: 740 });
  await fotografia("ui-itens-320");
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.getByRole("button", { name: "Próximo", exact: true }).click();
  await fotografia("ui-revisao-mobile");
  await pagina.setViewportSize({ width: 1440, height: 1000 });
  await fotografia("ui-formulario-desktop");
  await pagina.setViewportSize({ width: 768, height: 1024 });
  await fotografia("ui-formulario-tablet");
  await pagina.setViewportSize({ width: 1024, height: 900 });
  await fotografia("ui-formulario-1024");
  await pagina.setViewportSize({ width: 1440, height: 1000 });
  etapa = "salvar";
  await pagina
    .getByRole("button", { name: "Salvar orçamento", exact: true })
    .click();
  await pagina.waitForURL(/\/orcamentos\/[a-f0-9-]+$/);
  await pagina.getByRole("heading", { name: /Orçamento #/ }).waitFor();
  await pagina.getByText("R$ 2.079,00", { exact: true }).waitFor();
  await fotografia("ui-detalhe-desktop");
  const download = pagina.waitForEvent("download");
  await pagina.getByRole("button", { name: "Baixar PDF", exact: true }).click();
  const arquivo = await download;
  assert.match(arquivo.suggestedFilename(), /^orcamento-\d+\.pdf$/);
  etapa = "editar";
  await pagina.getByRole("link", { name: "Editar", exact: true }).click();
  await pagina
    .getByLabel("Nome *", { exact: true })
    .fill("Cliente do teste visual editado");
  await pagina
    .getByRole("button", { name: "Salvar orçamento", exact: true })
    .click();
  await pagina.waitForURL(/\/orcamentos\/[a-f0-9-]+$/);
  await pagina
    .getByText("Cliente do teste visual editado", { exact: true })
    .waitFor();
  etapa = "configuracoes";
  await pagina.goto("http://localhost:3001/configuracoes");
  await pagina.getByLabel("Nome da empresa *", { exact: true }).waitFor();
  await pagina.setViewportSize({ width: 390, height: 844 });
  await fotografia("ui-config-mobile");
  await pagina
    .getByLabel("Nome da empresa *", { exact: true })
    .fill("Empresa de teste visual atualizada");
  await pagina
    .getByRole("button", { name: "Salvar configurações", exact: true })
    .click();
  await pagina
    .getByRole("status")
    .filter({ hasText: "Configurações salvas." })
    .waitFor();
  await pagina
    .getByRole("link", {
      name: "Empresa de teste visual atualizada",
      exact: true,
    })
    .waitFor();
  const manifest = await (
    await pagina.request.get("http://localhost:3001/manifest.webmanifest")
  ).json();
  assert.ok(manifest.icons.some((icone) => icone.sizes === "192x192"));
  assert.ok(manifest.icons.some((icone) => icone.sizes === "512x512"));
  await pagina.goto("http://localhost:3001/orcamentos");
  await pagina.waitForFunction(
    () => !document.body.innerText.includes("Carregando orçamentos"),
  );
  await pagina.setViewportSize({ width: 320, height: 740 });
  await fotografia("ui-lista-320");
  await pagina.setViewportSize({ width: 1440, height: 1000 });
  await fotografia("ui-lista-desktop");
  const cachePublico = await pagina.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const nomes = await caches.keys();
    const urls = await Promise.all(
      nomes
        .filter((nome) => nome.startsWith("orcamentos-publico-"))
        .map(async (nome) =>
          (await (await caches.open(nome)).keys()).map(
            (pedido) => new URL(pedido.url).pathname,
          ),
        ),
    );
    return urls.flat();
  });
  assert.ok(cachePublico.includes("/offline.html"));
  assert.ok(
    cachePublico.every((caminho) =>
      ["/offline.html", "/icone.svg"].includes(caminho),
    ),
    "PWA não pode armazenar conteúdo privado",
  );
  await pagina.getByRole("button", { name: "Sair", exact: true }).click();
  await pagina.waitForURL("**/entrar");
  assert.equal(erros.length, 0, "Fluxo não deve lançar erros de página");
  console.log(
    "Navegador validado: login/logout, formulário mobile, criação/edição, download, configurações, manifest e larguras 320/390/768/1024/1440px.",
  );
} catch (erro) {
  await pagina
    .screenshot({ path: ".tmp/ui-falha.png", fullPage: true })
    .catch(() => {});
  console.log(
    `Falha no fluxo de navegador na etapa ${etapa}; screenshot local de diagnóstico preservado sem expor credenciais.`,
  );
  console.log(
    String(erro.message).replaceAll(fixture.senha, "[omitido]").slice(0, 600),
  );
  process.exitCode = 1;
} finally {
  await navegador.close();
}
