export class ErroDominio extends Error {
  constructor(
    mensagem: string,
    public readonly status: 400 | 404 | 413 | 415 = 400,
  ) {
    super(mensagem);
  }
}
