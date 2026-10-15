export type SituacaoAssinaturaAdmin = "ATIVA" | "SUSPENSA" | "CANCELADA";
export type ConfiguracaoAdmin = {
  nomePlano: string;
  valorMensalCentavos: number;
  limiteUsuariosAtivos: number;
  toleranciaDias: number;
  nomeComercial: string;
  contatoComercial: string | null;
};
export type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  convitePendente?: boolean;
};
export type AssinanteAdmin = {
  idEmpresa: string;
  nome: string;
  telefone: string | null;
  dataCriacao: string;
  nomePlano: string;
  valorMensalCentavos: number;
  limiteUsuariosAtivos: number;
  usuariosAtivos: number;
  proximoVencimento: string | null;
  situacao: SituacaoAssinaturaAdmin;
  emAtraso: boolean;
};
export type CobrancaAdmin = {
  idCobranca: string;
  idEmpresa: string;
  nomeEmpresa: string;
  idAssinatura: string;
  valorCentavos: number;
  dataEmissao: string;
  dataVencimento: string;
  acessoAte: string;
  situacao: "PENDENTE" | "VENCIDA" | "PAGA" | "CANCELADA";
  observacoes: string | null;
  dias: number;
  elegivelSuspensao: boolean;
  pagamento: {
    idPagamento: string;
    dataPagamento: string;
    dataConfirmacao: string;
    formaPagamento: string;
    nomeAdministrador: string;
  } | null;
};
export type AuditoriaAdmin = {
  idAuditoria: string;
  acao: string;
  entidade: string;
  dataCriacao: string;
  nomeAdministrador: string;
};
export type DetalheAssinanteAdmin = AssinanteAdmin & {
  idAssinatura: string;
  dataInicio: string | null;
  dataDireitoAcesso: string | null;
  usuarios: UsuarioAdmin[];
  cobrancas: CobrancaAdmin[];
  auditorias: AuditoriaAdmin[];
};
export type ResumoAdmin = {
  totalEmpresas: number;
  empresasAtivas: number;
  empresasSuspensas: number;
  empresasEmAtraso: number;
  mrrCentavos: number;
  recebidoMesCentavos: number;
  pendenteCentavos: number;
  proximosVencimentos: CobrancaAdmin[];
};
export type CriarAssinanteAdmin = {
  nome: string;
  telefone?: string;
  nomeUsuario: string;
  emailUsuario: string;
  dataInicio: string;
  primeiroVencimento: string;
};
export type CriarCobrancaAdmin = {
  idEmpresa: string;
  valorCentavos: number;
  dataVencimento: string;
  acessoAte: string;
  observacoes?: string;
};
