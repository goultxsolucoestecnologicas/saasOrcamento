import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { carregarFixturesSupabase } from "./fixtures-supabase.mjs";

// Login real com fixture autorizada; dados de domínio simulados, sem gravações.
const { fixtures } = carregarFixturesSupabase();
const fixture = fixtures[0];
const origem = "http://localhost:3001";
const diagnostico = process.argv.includes("--diagnostico");
const destino = diagnostico ? ".tmp/responsividade-antes" : "docs/ui/revisao";
const executavel = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  chromium.executablePath(),
]
  .filter(Boolean)
  .find((p) => fs.existsSync(p));
assert.ok(executavel, "Chromium necessário para inspeção visual.");
const navegador = await chromium.launch({
  headless: true,
  executablePath: executavel,
});
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  reducedMotion: "reduce",
  serviceWorkers: "block",
});
const pagina = await contexto.newPage();
pagina.setDefaultTimeout(15000);
const falhas = [];
const resultados = [];
const errosPagina = [];
const escritas = [];
pagina.on("pageerror", (e) => errosPagina.push(e.name));
let cenario = "normal";
const id = "11111111-1111-4111-8111-111111111111";
const empresa = {
  idEmpresa: fixture.idEmpresa,
  nome: "Empresa de demonstração",
  telefone: "(00) 00000-0000",
  logoChave: null,
  descricaoAtividade: "Instalação e acabamento de pisos",
  nomeResponsavel: "Responsável fictício",
  cidade: "Cidade de exemplo",
  estado: "RS",
  instagram: "@empresa.exemplo",
  facebook: "Empresa de demonstração",
  slogan: "Qualidade em cada acabamento.",
};
function documento() {
  const longo = cenario === "longo";
  const subtotalCentavos = longo ? 2_000_000_000 : 157500;
  return {
    idOrcamento: id,
    numero: 128,
    situacao: "APROVADO",
    tipoDocumento: "ORCAMENTO",
    clienteNome: longo ? "Cliente".repeat(21) : "Cliente de demonstração",
    clienteTelefone: "(00) 00000-0000",
    clienteEndereco: "Rua de exemplo",
    clienteCidade: "Cidade de exemplo",
    clienteNumeroEndereco: "240",
    clienteDocumento: "Documento de exemplo",
    clienteInscricaoEstadual: "ISENTO",
    dataEmissao: "2026-10-15",
    dataCriacao: "2026-10-15T12:00:00.000Z",
    observacoes: longo
      ? "Observação extensa de demonstração. ".repeat(40)
      : "Materiais não inclusos. Aplicação conforme proposta.",
    validadeDias: 15,
    descontoTipo: "FIXO",
    descontoValor: 0,
    subtotalCentavos,
    totalCentavos: subtotalCentavos,
    itens: [
      {
        descricao: longo
          ? "Acabamento".repeat(50)
          : "Instalação de piso vinílico",
        unidade: longo ? "serviço completo" : "m²",
        quantidadeMilesimos: longo ? 20_000_000 : 35000,
        valorUnitarioCentavos: longo ? 100_000 : 4500,
        subtotalCentavos,
      },
    ],
  };
}
async function teste(nome, acao) {
  try {
    await acao();
    resultados.push(nome);
  } catch (e) {
    const erro = String(e.message)
      .replaceAll(fixture.email, "[omitido]")
      .replaceAll(fixture.senha, "[omitido]")
      .slice(0, 1800);
    falhas.push({ nome, erro });
    console.log("FALHA: " + nome + " " + erro);
  }
}
async function carregar(caminho, alvo) {
  await pagina.goto(origem + caminho);
  await pagina.locator(alvo).first().waitFor({ state: "visible" });
  if (caminho !== "/entrar")
    await pagina.locator(".marca span").first().waitFor({ state: "attached" });
  await pagina.evaluate(() => document.fonts.ready);
}
async function geometria(nome) {
  await teste(nome + ": geometria", async () => {
    const problemas = await pagina.evaluate(() => {
      const visivel = (e) => {
        const s = getComputedStyle(e),
          r = e.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.height > 0 &&
          s.visibility !== "hidden" &&
          !e.closest(".pular")
        );
      };
      const limites = [
        ...document.querySelectorAll(
          "main *, .entrada *, .menu-conteudo *, .dialog-conteudo *",
        ),
      ]
        .filter(visivel)
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.left < -1 || r.right > innerWidth + 1;
        })
        .map((e) => ({
          seletor: e.className?.baseVal ?? e.className ?? e.tagName,
          tipo: e.tagName,
          x: Math.round(e.getBoundingClientRect().left),
          fim: Math.round(e.getBoundingClientRect().right),
        }));
      const corte = [
        ...document.querySelectorAll(
          ".total strong,.resumo-mobile-compacto strong,.linha-resumo strong,.item-total strong,.dialog-conteudo,.menu-conteudo",
        ),
      ]
        .filter(visivel)
        .filter((e) => e.scrollWidth > e.clientWidth + 1)
        .map((e) => e.className || e.tagName);
      const alvos = [
        ...document.querySelectorAll(
          "button,a,input:not([type=file]),select,textarea",
        ),
      ]
        .filter(visivel)
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width < 43.5 || r.height < 43.5;
        })
        .map((e) => ({
          tipo: e.tagName,
          nome:
            e.getAttribute("aria-label") || e.textContent?.trim().slice(0, 40),
          largura: Math.round(e.getBoundingClientRect().width),
          altura: Math.round(e.getBoundingClientRect().height),
        }));
      return {
        largura: document.documentElement.scrollWidth > innerWidth + 1,
        limites: limites.slice(0, 12),
        corte,
        alvos,
      };
    });
    assert.deepEqual(problemas, {
      largura: false,
      limites: [],
      corte: [],
      alvos: [],
    });
  });
}
async function axe(nome) {
  await teste(nome + ": acessibilidade", async () => {
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
async function foto(nome, largura) {
  if (![320, 390, 768, 1280, 1440].includes(largura)) return;
  const evidencias = new Set([
    "390-lista-normal",
    "390-editar-normal",
    "390-itens-normal",
    "390-revisao-normal",
    "390-configuracoes-normal",
    "390-menu",
    "1280-editar-normal",
    "1440-detalhe-normal",
    "768-configuracoes-normal",
    "320-revisao-longo",
    "320-detalhe-longo",
    "320-dialogo",
    "390-entrar",
  ]);
  if (!diagnostico && !evidencias.has(`${largura}-${nome}`)) return;
  fs.mkdirSync(destino, { recursive: true });
  await pagina.evaluate(() => {
    document.activeElement?.blur?.();
    window.scrollTo(0, 0);
  });
  await pagina.screenshot({
    path: `${destino}/${largura}-${nome}.png`,
    fullPage: true,
  });
}
try {
  for (const largura of [320, 390, 768, 1440]) {
    await pagina.setViewportSize({ width: largura, height: 844 });
    await carregar("/entrar", 'input[name="email"]');
    await geometria(`entrar ${largura}`);
    if (largura === 390) await axe("entrar");
    await foto("entrar", largura);
  }
  await pagina.getByLabel("E-mail", { exact: true }).fill(fixture.email);
  await pagina.getByLabel("Senha", { exact: true }).fill(fixture.senha);
  await pagina.getByRole("button", { name: "Entrar", exact: true }).click();
  await pagina.waitForURL("**/orcamentos");
  const real = await pagina.request.get(origem + "/api/empresa");
  assert.equal(real.status(), 200);
  assert.equal(
    (await real.json()).dados.idEmpresa,
    fixture.idEmpresa,
    "Apenas a fixture autorizada",
  );
  await contexto.route("**/api/**", async (rota) => {
    const req = rota.request(),
      url = new URL(req.url());
    if (
      !url.pathname.startsWith("/api/empresa") &&
      !url.pathname.startsWith("/api/orcamentos")
    )
      return rota.continue();
    if (req.method() !== "GET") {
      escritas.push(req.method() + " " + url.pathname);
      return rota.fulfill({
        status: 503,
        json: { erro: "Operação simulada para revisão visual." },
      });
    }
    if (url.pathname === "/api/empresa")
      return rota.fulfill({
        json: {
          dados: {
            ...empresa,
            nome: cenario === "longo" ? "Empresa".repeat(21) : empresa.nome,
          },
        },
      });
    if (url.pathname.endsWith("/pdf"))
      return rota.fulfill({
        status: 503,
        body: "Prévia indisponível no teste visual.",
      });
    if (url.pathname === "/api/orcamentos") {
      if (cenario === "erro")
        return rota.fulfill({
          status: 503,
          json: { erro: "Falha temporária de demonstração. Tente novamente." },
        });
      return rota.fulfill({
        json: {
          dados: {
            orcamentos: cenario === "vazio" ? [] : [documento()],
            proximoNumero: null,
          },
        },
      });
    }
    return rota.fulfill({ json: { dados: documento() } });
  });
  for (const largura of [320, 360, 390, 640, 768, 1024, 1280, 1440, 1920]) {
    await pagina.setViewportSize({ width: largura, height: 900 });
    for (const estado of ["normal", "longo"]) {
      cenario = estado;
      for (const [nome, caminho, alvo] of [
        ["lista", "/orcamentos", ".card-orcamento"],
        ["editar", `/orcamentos/${id}/editar`, "#orcamento-clienteNome"],
        ["detalhe", `/orcamentos/${id}`, ".dados-cliente"],
        ["configuracoes", "/configuracoes", "#nome"],
      ]) {
        await carregar(caminho, alvo);
        await geometria(`${nome} ${estado} ${largura}`);
        if (estado === "normal" && [390, 1440].includes(largura))
          await axe(`${nome} ${largura}`);
        if (estado === "normal" || [320, 1280].includes(largura))
          await foto(`${nome}-${estado}`, largura);
        if (nome === "editar" && largura < 1024) {
          await pagina
            .getByRole("button", { name: "Próximo", exact: true })
            .click();
          await pagina
            .locator(".item-editor")
            .first()
            .waitFor({ state: "visible" });
          await geometria(`itens ${estado} ${largura}`);
          await foto(`itens-${estado}`, largura);
          await pagina
            .getByRole("button", { name: "Próximo", exact: true })
            .click();
          await pagina.locator(".revisao-mobile").waitFor({ state: "visible" });
          await geometria(`revisao ${estado} ${largura}`);
          await foto(`revisao-${estado}`, largura);
        }
        if (nome === "editar" && largura >= 1024) {
          await teste(`colunas de serviços ${largura} ${estado}`, async () => {
            const medidas = await pagina
              .locator(".item-editor")
              .first()
              .evaluate((e) => {
                const colunas =
                  getComputedStyle(e).gridTemplateColumns.split(" ").length;
                const campos = [...e.querySelectorAll("input,select")].map(
                  (c) => c.getBoundingClientRect().top,
                );
                return {
                  colunas,
                  diferenca: Math.max(...campos) - Math.min(...campos),
                };
              });
            if (medidas.colunas === 6)
              assert.ok(medidas.diferenca <= 1, JSON.stringify(medidas));
          });
        }
      }
    }
    cenario = "normal";
    await carregar("/orcamentos/novo", "#orcamento-clienteNome");
    await geometria(`novo ${largura}`);
    if (largura === 390) await axe("novo");
    if (largura === 320 || largura === 1440) await foto("novo", largura);
    if ([320, 390, 768].includes(largura)) {
      await pagina.getByRole("button", { name: "Abrir navegação" }).click();
      await geometria(`menu ${largura}`);
      if (largura === 390) await axe("menu");
      await foto("menu", largura);
      await pagina.keyboard.press("Escape");
    }
    console.log(`OK: varredura ${largura}px concluída`);
  }
  for (const largura of [320, 768, 1440]) {
    await pagina.setViewportSize({ width: largura, height: 480 });
    cenario = "vazio";
    await carregar("/orcamentos", ".estado-vazio");
    await geometria(`vazio ${largura}`);
    cenario = "erro";
    await carregar("/orcamentos", ".estado-erro");
    await geometria(`erro ${largura}`);
    cenario = "normal";
    await carregar(`/orcamentos/${id}`, ".dados-cliente");
    await pagina.getByRole("button", { name: "Excluir", exact: true }).click();
    await pagina.getByRole("alertdialog").waitFor();
    await geometria(`confirmação ${largura}`);
    if (largura === 320) await foto("dialogo", largura);
    await pagina.getByRole("button", { name: "Cancelar", exact: true }).click();
    await carregar("/orcamentos/novo", "#orcamento-clienteNome");
    await pagina
      .getByRole("button", { name: "Salvar orçamento", exact: true })
      .click();
    await pagina.getByRole("alertdialog").waitFor();
    await geometria(`erros ${largura}`);
    await pagina
      .getByRole("button", { name: "Corrigir informações", exact: true })
      .click();
    await teste(`foco após erro ${largura}`, async () => {
      await pagina.waitForFunction(
        () => document.activeElement?.id === "orcamento-clienteNome",
      );
    });
  }
  for (const largura of [320, 1024]) {
    cenario = "longo";
    await pagina.setViewportSize({ width: largura, height: 320 });
    await carregar("/orcamentos", ".card-orcamento");
    if (largura < 1024)
      await pagina.getByRole("button", { name: "Abrir navegação" }).click();
    await teste(`navegação em altura curta ${largura}`, async () => {
      const sair = pagina.getByRole("button", { name: "Sair", exact: true });
      await sair.scrollIntoViewIfNeeded();
      const caixa = await sair.boundingBox();
      assert.ok(caixa && caixa.y >= 0 && caixa.y + caixa.height <= 321);
    });
    await geometria(`navegação em altura curta ${largura}`);
    if (largura < 1024) await pagina.keyboard.press("Escape");
  }
  await teste("sem escritas de domínio", async () =>
    assert.deepEqual(escritas, []),
  );
  await teste("sem erros JavaScript", async () =>
    assert.deepEqual(errosPagina, []),
  );
} catch (e) {
  falhas.push({
    nome: "execução",
    erro: String(e.message)
      .replaceAll(fixture.email, "[omitido]")
      .replaceAll(fixture.senha, "[omitido]")
      .slice(0, 1200),
  });
} finally {
  fs.mkdirSync(".tmp", { recursive: true });
  fs.writeFileSync(
    `.tmp/responsividade-${diagnostico ? "antes" : "depois"}.json`,
    JSON.stringify(
      { aprovados: resultados.length, falhas, errosPagina, escritas },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ aprovados: resultados.length, falhas }, null, 2),
  );
  await navegador.close();
}
if (falhas.length && !diagnostico) process.exitCode = 1;
