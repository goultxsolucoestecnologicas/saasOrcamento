import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";

// Escritas apenas no servidor local ligado ao schema remoto exclusivo de testes.
assert.ok(process.argv.includes("--fixtures-isoladas-confirmadas"));
const origem = process.env.ADMIN_TEST_ORIGIN || "http://localhost:3003";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origem).hostname));
const fixture = JSON.parse(fs.readFileSync(".tmp/admin-fixtures.json", "utf8"));
assert.match(fixture.esquema, /^testes_admin_[a-f0-9]{10}$/);
assert.equal(
  new URL(process.env.DATABASE_URL).searchParams.get("schema"),
  fixture.esquema,
  "Teste de escrita bloqueado: configure o schema exclusivo de testes e reinicie a aplicação local.",
);
assert.equal(
  new URL(process.env.APP_URL).origin,
  origem,
  "A origem de teste deve corresponder ao servidor configurado.",
);
const navegador = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
let verificacoes = 0;
try {
  const contexto = await navegador.newContext({
    storageState: ".tmp/admin-session.json",
    serviceWorkers: "block",
  });
  const api = contexto.request;
  async function pedido(
    caminho,
    metodo = "GET",
    dados,
    esperado = 200,
    origemEnviada = origem,
  ) {
    const resposta = await api.fetch(origem + caminho, {
      method: metodo,
      data: dados,
      headers: { Origin: origemEnviada },
    });
    assert.equal(
      resposta.status(),
      esperado,
      "Status inesperado na operação administrativa " + caminho,
    );
    verificacoes++;
    return resposta.json();
  }
  const resumoAntes = (await pedido("/api/admin/resumo")).dados;
  const nova = (
    await pedido(
      "/api/admin/assinantes",
      "POST",
      {
        nome: "Empresa de integração " + randomUUID().slice(0, 8),
        telefone: "51999990000",
        nomeUsuario: "Pessoa fictícia",
        emailUsuario: "fixture-" + randomUUID() + "@teste.invalid",
        dataInicio: "2026-10-01",
        primeiroVencimento: "2026-10-15",
      },
      201,
    )
  ).dados;
  assert.equal(
    nova.convite.enviado,
    false,
    "Testes não devem possuir chave de envio de convites.",
  );
  const detalhe = (await pedido("/api/admin/assinantes/" + nova.idEmpresa))
    .dados;
  assert.equal(detalhe.usuarios[0].convitePendente, true);
  assert.equal(detalhe.cobrancas.length, 1);
  const resultados = await Promise.all(
    [1, 2].map((i) =>
      api.post(
        origem + "/api/admin/assinantes/" + nova.idEmpresa + "/usuarios",
        {
          headers: { Origin: origem },
          data: {
            nome: "Convite concorrente " + i,
            email: "concorrencia-" + randomUUID() + "@teste.invalid",
          },
        },
      ),
    ),
  );
  assert.deepEqual(resultados.map((r) => r.status()).sort(), [201, 400]);
  verificacoes += 2;
  const f = fixture.empresas[0];
  const detalheAntes = (await pedido("/api/admin/assinantes/" + f.idEmpresa))
    .dados;
  await pedido("/api/admin/assinantes/" + f.idEmpresa + "/assinatura", "POST", {
    situacao: "SUSPENSA",
    confirmar: true,
  });
  const cobranca = (
    await pedido(
      "/api/admin/cobrancas",
      "POST",
      {
        idEmpresa: f.idEmpresa,
        valorCentavos: 2999,
        dataVencimento: "2026-10-01",
        acessoAte: "2026-11-01",
        observacoes: "Teste de confirmação concorrente",
      },
      201,
    )
  ).dados;
  const pagamentos = await Promise.all(
    [1, 2].map(() =>
      api.post(
        origem + "/api/admin/cobrancas/" + cobranca.idCobranca + "/pagamento",
        {
          headers: { Origin: origem },
          data: {
            dataPagamento: "2026-10-15",
            formaPagamento: "PIX",
            confirmar: true,
          },
        },
      ),
    ),
  );
  assert.deepEqual(
    pagamentos.map((r) => r.status()),
    [200, 200],
  );
  const confirmacoes = await Promise.all(pagamentos.map((r) => r.json()));
  assert.deepEqual(confirmacoes.map((r) => r.dados.jaConfirmado).sort(), [
    false,
    true,
  ]);
  verificacoes += 2;
  const depois = (await pedido("/api/admin/assinantes/" + f.idEmpresa)).dados;
  assert.equal(depois.situacao, "ATIVA");
  assert.equal(
    depois.cobrancas.find((c) => c.idCobranca === cobranca.idCobranca).situacao,
    "PAGA",
  );
  assert.equal(
    depois.auditorias.filter((a) => a.acao === "PAGAMENTO_CONFIRMADO").length -
      detalheAntes.auditorias.filter((a) => a.acao === "PAGAMENTO_CONFIRMADO")
        .length,
    1,
  );
  const resumoDepois = (await pedido("/api/admin/resumo")).dados;
  assert.equal(
    resumoDepois.recebidoMesCentavos - resumoAntes.recebidoMesCentavos,
    2999,
  );
  await pedido(
    "/api/admin/cobrancas/" + cobranca.idCobranca,
    "PATCH",
    { cancelar: true, confirmar: true },
    400,
  );
  await pedido("/api/admin/configuracoes", "PUT", {
    nomePlano: "Profissional",
    valorMensalCentavos: 3999,
    limiteUsuariosAtivos: 2,
    toleranciaDias: 3,
    nomeComercial: "OrçaFácil",
    contatoComercial: null,
  });
  assert.equal(
    (await pedido("/api/admin/assinantes/" + nova.idEmpresa)).dados.cobrancas[0]
      .valorCentavos,
    2999,
  );
  await pedido("/api/admin/configuracoes", "PUT", {
    nomePlano: "Profissional",
    valorMensalCentavos: 2999,
    limiteUsuariosAtivos: 2,
    toleranciaDias: 3,
    nomeComercial: "OrçaFácil",
    contatoComercial: null,
  });
  await pedido(
    "/api/admin/cobrancas",
    "POST",
    {
      idEmpresa: f.idEmpresa,
      valorCentavos: 1,
      dataVencimento: "2026-10-15",
      acessoAte: "2026-11-15",
    },
    403,
    "https://externo.invalid",
  );
  await pedido(
    "/api/admin/assinantes/" + f.idEmpresa + "/assinatura",
    "POST",
    { situacao: "SUSPENSA" },
    400,
  );
  const config = (await pedido("/api/admin/configuracoes")).dados;
  await pedido(
    "/api/admin/configuracoes",
    "PUT",
    { ...config, limiteUsuariosAtivos: 3 },
    400,
  );
  const cancelavel = (
    await pedido(
      "/api/admin/cobrancas",
      "POST",
      {
        idEmpresa: f.idEmpresa,
        valorCentavos: 2999,
        dataVencimento: "2026-10-01",
        acessoAte: "2026-11-01",
      },
      201,
    )
  ).dados;
  await pedido("/api/admin/cobrancas/" + cancelavel.idCobranca, "PATCH", {
    cancelar: true,
    confirmar: true,
  });
  await pedido(
    "/api/admin/cobrancas/" + cancelavel.idCobranca + "/pagamento",
    "POST",
    { dataPagamento: "2026-10-15", confirmar: true },
    400,
  );
  const vencidos = (await pedido("/api/admin/vencimentos?grupo=VENCIDOS"))
    .dados;
  assert.ok(vencidos.some((c) => c.elegivelSuspensao));
  const anteriores = JSON.parse(
    fs.readFileSync(
      process.env.ADMIN_EXISTING_FIXTURES ||
        "C:/projetoOrcamento/saasOrcamento/.tmp/supabase-fixtures.json",
      "utf8",
    ),
  );
  const comum = await navegador.newContext({ serviceWorkers: "block" });
  const pagina = await comum.newPage();
  await pagina.goto(origem + "/entrar");
  await pagina
    .getByLabel("E-mail", { exact: true })
    .fill(anteriores.fixtures[0].email);
  await pagina
    .getByLabel("Senha", { exact: true })
    .fill(anteriores.fixtures[0].senha);
  await pagina.getByRole("button", { name: "Entrar", exact: true }).click();
  await pagina.waitForURL("**/orcamentos", { timeout: 45000 });
  for (const endpoint of [
    "/resumo",
    "/assinantes",
    "/cobrancas",
    "/vencimentos",
    "/configuracoes",
  ]) {
    assert.equal(
      (await comum.request.get(origem + "/api/admin" + endpoint)).status(),
      403,
    );
    verificacoes++;
  }
  assert.equal(
    (
      await comum.request.post(origem + "/api/admin/assinantes", {
        headers: { Origin: origem },
        data: {},
      })
    ).status(),
    403,
  );
  verificacoes++;
  await pedido("/api/admin/assinantes/" + f.idEmpresa + "/assinatura", "POST", {
    situacao: "SUSPENSA",
    confirmar: true,
  });
  assert.equal(
    (await comum.request.get(origem + "/api/orcamentos")).status(),
    403,
  );
  verificacoes++;
  await pagina.goto(origem + "/orcamentos");
  await pagina.waitForURL("**/assinatura-indisponivel");
  await pedido("/api/admin/assinantes/" + f.idEmpresa + "/assinatura", "POST", {
    situacao: "ATIVA",
    confirmar: true,
  });
  assert.equal(
    (await comum.request.get(origem + "/api/orcamentos")).status(),
    200,
  );
  verificacoes++;
  const preservado = (await pedido("/api/admin/assinantes/" + f.idEmpresa))
    .dados;
  assert.equal(preservado.usuarios.length, depois.usuarios.length);
  fs.writeFileSync(
    ".tmp/admin-integracao-resultado.json",
    JSON.stringify({ verificacoes, aprovado: true }),
    { mode: 0o600 },
  );
  console.log(
    "Integração administrativa aprovada: " +
      verificacoes +
      " verificações; concorrência, finanças, convites pendentes, CSRF, permissões e suspensão.",
  );
} finally {
  await navegador.close();
}
