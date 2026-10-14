import { carregarFixturesSupabase } from "./fixtures-supabase.mjs";
import { createServerClient } from "@supabase/ssr";
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/gerado/prisma/client.ts";
import { executarComandoAdministrativo } from "../scripts/administracao.ts";

const origem = "http://localhost:3001";
const registro = carregarFixturesSupabase();
const esquema = registro.esquema;
const fixture = registro.fixtures[0];
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set("schema", esquema);
const banco = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: url.toString() },
    { schema: esquema },
  ),
});
async function entrar(email, senha) {
  const cookies = new Map();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => Array.from(cookies, ([name, value]) => ({ name, value })),
        setAll: (valores) => {
          for (const { name, value } of valores) cookies.set(name, value);
        },
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  assert.equal(
    Boolean(error),
    false,
    "Login Supabase da fixture deve funcionar",
  );
  return Array.from(cookies, ([name, value]) => name + "=" + value).join("; ");
}
async function chamar(caminho, cookie, metodo = "GET", dados) {
  return fetch(origem + caminho, {
    method: metodo,
    headers: {
      origin: origem,
      ...(cookie ? { cookie } : {}),
      ...(dados ? { "content-type": "application/json" } : {}),
    },
    ...(dados ? { body: JSON.stringify(dados) } : {}),
  });
}
const entrada = {
  clienteNome: "Cliente de integração",
  clienteTelefone: "(51) 99999-0000",
  clienteEndereco: "Rua de teste, 240",
  clienteCidade: "Torres - RS",
  clienteDocumento: "",
  observacoes: "Fixture de desenvolvimento em schema isolado.",
  validadeDias: 15,
  situacao: "RASCUNHO",
  descontoTipo: "PERCENTUAL",
  descontoValor: 1000,
  itens: [
    {
      descricao: "Instalação de piso vinílico",
      unidade: "m²",
      quantidadeMilesimos: 35000,
      valorUnitarioCentavos: 4500,
    },
    {
      descricao: "Instalação de rodapé",
      unidade: "m",
      quantidadeMilesimos: 28000,
      valorUnitarioCentavos: 1800,
    },
  ],
};
try {
  const cookieA = await entrar(fixture.email, fixture.senha);
  const empresaAtual = await (await chamar("/api/empresa", cookieA)).json();
  assert.equal(
    empresaAtual.dados.idEmpresa,
    fixture.idEmpresa,
    "Servidor precisa apontar ao schema de testes antes de qualquer escrita",
  );
  assert.equal((await chamar("/api/orcamentos")).status, 401);
  const respostaCriar = await chamar(
    "/api/orcamentos",
    cookieA,
    "POST",
    entrada,
  );
  assert.equal(respostaCriar.status, 201);
  const orcamento = (await respostaCriar.json()).dados;
  assert.equal(orcamento.subtotalCentavos, 207900);
  assert.equal(orcamento.totalCentavos, 187110);
  const id = orcamento.idOrcamento;
  assert.equal((await chamar(`/api/orcamentos/${id}`, cookieA)).status, 200);
  assert.equal(
    (
      await chamar("/api/orcamentos", cookieA, "POST", {
        ...entrada,
        idEmpresa: randomUUID(),
        totalCentavos: 1,
      })
    ).status,
    400,
  );
  const outra = registro.fixtures[1];
  const empresaB = { id: outra.idEmpresa };
  const cookieB = await entrar(outra.email, outra.senha);
  for (const metodo of ["GET", "PUT", "DELETE"])
    assert.equal(
      (
        await chamar(
          `/api/orcamentos/${id}`,
          cookieB,
          metodo,
          metodo === "PUT" ? entrada : undefined,
        )
      ).status,
      404,
    );
  assert.equal(
    (await (await chamar("/api/orcamentos", cookieB)).json()).dados.orcamentos
      .length,
    0,
  );
  const registrosPagina = Array.from({ length: 201 }, (_, indice) => ({
    idOrcamento: randomUUID(),
    idEmpresa: empresaB.id,
    numero: indice + 1,
    clienteNome:
      indice === 0 ? "Registro antigo único" : "Cliente de paginação",
    subtotalCentavos: 100,
    totalCentavos: 100,
  }));
  await banco.$transaction(async (transacao) => {
    await transacao.orcamento.createMany({ data: registrosPagina });
    await transacao.orcamentoItem.createMany({
      data: registrosPagina.map((registro) => ({
        idEmpresa: empresaB.id,
        idOrcamento: registro.idOrcamento,
        descricao: "Item de fixture",
        quantidadeMilesimos: 1000,
        valorUnitarioCentavos: 100,
        subtotalCentavos: 100,
        ordem: 0,
      })),
    });
    await transacao.empresa.update({
      where: { idEmpresa: empresaB.id },
      data: { proximoNumeroOrcamento: 202 },
    });
  });
  const encontrados = [];
  let cursor;
  for (let pagina = 0; pagina < 5; pagina++) {
    const caminho = cursor
      ? `/api/orcamentos?antesDeNumero=${cursor}`
      : "/api/orcamentos";
    const respostaPagina = await chamar(caminho, cookieB);
    assert.equal(respostaPagina.status, 200);
    const resultadoPagina = (await respostaPagina.json()).dados;
    assert.ok(resultadoPagina.orcamentos.length <= 50);
    encontrados.push(...resultadoPagina.orcamentos);
    cursor = resultadoPagina.proximoNumero;
    if (cursor === null) break;
  }
  assert.equal(encontrados.length, 201);
  assert.equal(
    new Set(encontrados.map((registro) => registro.idOrcamento)).size,
    201,
  );
  const antigo = (
    await (
      await chamar(
        `/api/orcamentos?busca=${encodeURIComponent("Registro antigo único")}`,
        cookieB,
      )
    ).json()
  ).dados;
  assert.equal(antigo.orcamentos.length, 1);
  assert.equal(antigo.orcamentos[0].numero, 1);
  const porNumero = (
    await (await chamar("/api/orcamentos?busca=%2300001", cookieB)).json()
  ).dados;
  assert.equal(porNumero.orcamentos[0].numero, 1);
  const csrf = await fetch(`${origem}/api/orcamentos`, {
    method: "POST",
    headers: {
      cookie: cookieA,
      origin: "https://origem-indevida.invalid",
      "content-type": "application/json",
    },
    body: JSON.stringify(entrada),
  });
  assert.equal(csrf.status, 403);
  const atualizada = await chamar(`/api/orcamentos/${id}`, cookieA, "PUT", {
    ...entrada,
    situacao: "ENVIADO",
    descontoTipo: "FIXO",
    descontoValor: 7900,
  });
  assert.equal(atualizada.status, 200);
  assert.equal((await atualizada.json()).dados.totalCentavos, 200000);
  const criacoes = await Promise.all(
    Array.from({ length: 6 }, (_, indice) =>
      chamar("/api/orcamentos", cookieA, "POST", {
        ...entrada,
        clienteNome: `Concorrência de teste ${indice + 1}`,
      }),
    ),
  );
  const registros = await Promise.all(
    criacoes.map(async (resposta) => {
      assert.equal(resposta.status, 201);
      return (await resposta.json()).dados;
    }),
  );
  assert.equal(new Set(registros.map((item) => item.numero)).size, 6);
  const invalida = await chamar("/api/orcamentos", cookieA, "POST", {
    ...entrada,
    descontoTipo: "FIXO",
    descontoValor: 99999999,
  });
  assert.equal(invalida.status, 400);
  const numeroAnterior = (
    await banco.empresa.findUnique({ where: { idEmpresa: fixture.idEmpresa } })
  ).proximoNumeroOrcamento;
  assert.equal(
    numeroAnterior,
    Math.max(...registros.map((item) => item.numero)) + 1,
  );
  const imagem = await sharp({
    create: { width: 64, height: 64, channels: 4, background: "#008582" },
  })
    .png()
    .toBuffer();
  const multipart = new FormData();
  multipart.set(
    "logo",
    new File([imagem], "fixture.png", { type: "image/png" }),
  );
  const upload = await fetch(`${origem}/api/empresa/logo`, {
    method: "POST",
    headers: { cookie: cookieA, origin: origem },
    body: multipart,
  });
  assert.equal(upload.status, 201);
  const logo = await chamar("/api/empresa/logo", cookieA);
  assert.equal(logo.status, 200);
  assert.equal(logo.headers.get("content-type"), "image/png");
  assert.equal((await chamar("/api/empresa/logo")).status, 401);
  assert.equal((await chamar("/api/empresa/logo", cookieB)).status, 404);
  const falso = new FormData();
  falso.set(
    "logo",
    new File(["<svg></svg>"], "falso.png", { type: "image/png" }),
  );
  assert.equal(
    (
      await fetch(`${origem}/api/empresa/logo`, {
        method: "POST",
        headers: { cookie: cookieA, origin: origem },
        body: falso,
      })
    ).status,
    400,
  );
  const pdf = await chamar(`/api/orcamentos/${id}/pdf`, cookieA);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.equal(
    Buffer.from(await pdf.arrayBuffer())
      .subarray(0, 5)
      .toString(),
    "%PDF-",
  );
  assert.equal(
    (await chamar(`/api/orcamentos/${id}/pdf`, cookieB)).status,
    404,
  );
  // Fixtures preservadas: não excluir orçamento remoto. Exclusão é coberta no gateway unitário.
  await executarComandoAdministrativo(banco, {
    comando: "suspender-empresa",
    empresa: fixture.idEmpresa,
  });
  assert.equal((await chamar("/api/orcamentos", cookieA)).status, 403);
  assert.equal(
    (await chamar("/api/auth/sign-in/email", cookieA, "POST", {})).status,
    410,
  );
  await executarComandoAdministrativo(banco, {
    comando: "ativar-empresa",
    empresa: fixture.idEmpresa,
  });
  console.log(
    "API real validada: login, tenant/CSRF, CRUD, cálculos, sequência concorrente, paginação/busca de 201 registros, logo privada, PDF e suspensão. Somente fixtures isoladas utilizadas.",
  );
} finally {
  await banco.$disconnect();
}
