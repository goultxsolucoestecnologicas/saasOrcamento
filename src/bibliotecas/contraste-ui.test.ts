import fs from "node:fs";
import { describe, expect, it } from "vitest";
const css = fs.readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
function token(nome: string) {
  const valor = css.match(
    new RegExp("--" + nome + ":\\s*(#[0-9a-f]+)", "i"),
  )?.[1];
  if (!valor) throw new Error("Token ausente:" + nome);
  return valor;
}
function luminancia(hex: string) {
  let h = hex.slice(1);
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a: string, b: string) {
  const valores = [luminancia(a), luminancia(b)].sort((a, b) => a - b);
  return (valores[1] + 0.05) / (valores[0] + 0.05);
}
describe("contraste dos tokens UI", () => {
  it.each([
    "foreground",
    "muted-foreground",
    "destructive",
    "accent-foreground",
  ])("texto%s atende4.5:1 na superfície", (nome) =>
    expect(contraste(token(nome), "#fff")).toBeGreaterThanOrEqual(4.5),
  );
  it("ação principal atende4.5:1 e limites/foco3:1", () => {
    expect(contraste(token("primary"), "#fff")).toBeGreaterThanOrEqual(4.5);
    expect(contraste(token("campo-borda"), "#fff")).toBeGreaterThanOrEqual(3);
    expect(contraste(token("ring"), "#fff")).toBeGreaterThanOrEqual(3);
  });
});
