import type { ErroCampo } from "@/validacoes/mensagens-validacao";

export class ErroDominio extends Error {
  constructor(
    mensagem: string,
    public readonly status: 400 | 404 | 413 | 415 = 400,
    public readonly campos?: readonly ErroCampo[],
  ) {
    super(mensagem);
  }
}
