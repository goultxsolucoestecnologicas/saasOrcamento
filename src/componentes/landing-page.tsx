"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  FileText,
  FolderOpen,
  ImageIcon,
  Calculator,
  Share2,
  Smartphone,
  ListChecks,
  Menu,
  X,
  Paintbrush,
  PlugZap,
  Hammer,
  Wrench,
  Layers,
  Monitor,
  MessageCircle,
} from "lucide-react";
import type { ConfiguracaoLanding } from "@/bibliotecas/configuracao-landing";
import { Button } from "@/componentes/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/componentes/ui/accordion";
import "./landing-page.css";

const navegacao = [
  { href: "#funcionalidades", texto: "Funcionalidades" },
  { href: "#como-funciona", texto: "Como funciona" },
  { href: "#precos", texto: "Preços" },
];
const recursos = [
  {
    Icone: FolderOpen,
    titulo: "Orçamentos organizados",
    texto:
      "Encontre aquele orçamento antigo sem procurar em conversas. Consulte e edite quando precisar.",
  },
  {
    Icone: ImageIcon,
    titulo: "Sua marca em cada documento",
    texto:
      "Adicione a logo e os dados da sua empresa. Apresente seu trabalho com uma identidade própria.",
  },
  {
    Icone: Calculator,
    titulo: "As contas ficam com o sistema",
    texto:
      "Preencha quantidades e valores. Os totais e descontos, em reais ou percentual, são calculados para você.",
  },
  {
    Icone: Share2,
    titulo: "Pronto para enviar",
    texto:
      "Baixe o PDF ou use o compartilhamento do celular para encaminhar ao seu cliente.",
  },
  {
    Icone: Smartphone,
    titulo: "Onde o trabalho acontecer",
    texto:
      "Use pelo navegador do celular ou computador. Também é possível instalar o aplicativo como PWA.",
  },
  {
    Icone: ListChecks,
    titulo: "Cada orçamento, uma situação",
    texto:
      "Saiba o que está em rascunho, o que foi enviado e o que já foi aprovado. Tudo no mesmo lugar.",
  },
];
const telas = [
  {
    id: "lista",
    titulo: "Seus orçamentos",
    curto: "Organizar",
    numero: "01",
    imagem: "/landing/mobile-lista.webp",
    alt: "Tela real de demonstração da lista de orçamentos com busca e situações",
    descricao: "O que você já fez, sempre à mão.",
    texto:
      "Consulte o histórico, encontre um cliente pela busca e abra um orçamento para conferir ou editar.",
    pontos: [
      "Busca por cliente ou número",
      "Situação e valor em cada orçamento",
      "Histórico acessível pelo celular",
    ],
    tipo: "mobile",
  },
  {
    id: "cliente",
    titulo: "Dados do cliente",
    curto: "Preencher",
    numero: "02",
    imagem: "/landing/mobile-cliente.webp",
    alt: "Tela real de demonstração do formulário de dados do cliente",
    descricao: "Comece com quem vai receber.",
    texto:
      "Informe os dados do cliente no próprio orçamento. O preenchimento por etapas ajuda a manter o foco.",
    pontos: [
      "Dados de contato e endereço",
      "Observações para o cliente",
      "Fluxo simples, por etapas",
    ],
    tipo: "mobile",
  },
  {
    id: "itens",
    titulo: "Serviços e valores",
    curto: "Calcular",
    numero: "03",
    imagem: "/landing/mobile-itens.webp",
    alt: "Tela real de demonstração dos serviços, quantidades, valores e total do orçamento",
    descricao: "Cada serviço com seu valor.",
    texto:
      "Descreva o trabalho, informe quantidade e preço. Confira os cálculos e aplique o desconto quando necessário.",
    pontos: [
      "Quantidade e unidade de cada serviço",
      "Desconto em reais ou percentual",
      "Total calculado automaticamente",
    ],
    tipo: "mobile",
  },
  {
    id: "pdf",
    titulo: "PDF profissional",
    curto: "Compartilhar",
    numero: "04",
    imagem: "/landing/pdf-exemplo.webp",
    alt: "PDF real de demonstração com logo, dados do cliente, serviços e total",
    descricao: "Um documento à altura do seu trabalho.",
    texto:
      "Gere o PDF com a identidade da sua empresa. Baixe o arquivo e envie pelo aplicativo que você utiliza.",
    pontos: [
      "Logo e informações da empresa",
      "Serviços e valores apresentados com clareza",
      "PDF para baixar ou compartilhar",
    ],
    tipo: "pdf",
  },
];
const perguntas = [
  {
    pergunta: "Preciso instalar algum programa?",
    resposta:
      "Não. Você pode acessar pelo navegador do celular ou computador. Se preferir, também pode instalar o sistema como aplicativo PWA nos dispositivos e navegadores compatíveis.",
  },
  {
    pergunta: "Posso utilizar pelo celular?",
    resposta:
      "Sim. O sistema foi pensado para o celular, com preenchimento por etapas, campos acessíveis e acesso ao histórico. No computador, você utiliza a mesma conta pelo navegador.",
  },
  {
    pergunta: "Posso adicionar a logo da minha empresa?",
    resposta:
      "Sim. Nas configurações, você pode enviar a logo e preencher as informações da empresa. Esses dados aparecem nos documentos PDF.",
  },
  {
    pergunta: "Como envio o orçamento pelo WhatsApp?",
    resposta:
      "Gere o PDF e use o compartilhamento do celular para escolher o WhatsApp, quando essa opção estiver disponível no dispositivo. Você também pode baixar o arquivo e anexá-lo na conversa. O sistema não envia mensagens automaticamente.",
  },
  {
    pergunta: "Posso editar orçamentos antigos?",
    resposta:
      "Sim. Abra o orçamento no histórico, edite os dados ou serviços e salve as alterações. Depois, você pode gerar um novo PDF atualizado.",
  },
  {
    pergunta: "Quantas pessoas podem utilizar a mesma conta?",
    resposta:
      "O plano é por empresa e inclui até dois usuários ativos, cada um com seu próprio acesso. Os dois trabalham com os orçamentos da mesma empresa.",
  },
  {
    pergunta: "Quanto custa por mês?",
    resposta:
      "O Plano Profissional custa R$ 29,99 por mês, por empresa, com até dois usuários ativos. Há apenas esse plano nesta versão.",
  },
  {
    pergunta: "Como faço para contratar?",
    resposta:
      "Clique em Quero começar para falar pelo contato comercial, quando configurado. A contratação e a liberação de acesso são combinadas no atendimento. Não há checkout ou ativação automática nesta página.",
  },
];

function Marca({
  configuracao,
  rodape = false,
}: {
  configuracao: ConfiguracaoLanding;
  rodape?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`landing-brand${rodape ? " landing-brand-footer" : ""}`}
      aria-label={`${configuracao.nome}, início`}
    >
      {configuracao.logo ? (
        <Image
          src={configuracao.logo}
          width={36}
          height={36}
          alt=""
          unoptimized
        />
      ) : (
        <span className="landing-brand-symbol">
          <FileText size={21} aria-hidden="true" />
        </span>
      )}
      <span>{configuracao.nome}</span>
    </Link>
  );
}
function Cta({
  contato,
  className = "",
  children = "Quero começar",
}: {
  contato: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Button asChild className={`landing-cta ${className}`}>
      <a href={contato}>
        {children}
        <ArrowRight size={18} aria-hidden="true" />
      </a>
    </Button>
  );
}

export function LandingPage({
  configuracao,
}: {
  configuracao: ConfiguracaoLanding;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [contatoAberto, setContatoAberto] = useState(false);
  const [telaAtiva, setTelaAtiva] = useState(0);
  const botoesTelas = useRef<(HTMLButtonElement | null)[]>([]);
  const contato = configuracao.contato || "#contato";
  return (
    <div className="landing">
      <a className="landing-skip" href="#landing-conteudo">
        Ir para o conteúdo
      </a>
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Marca configuracao={configuracao} />
          <nav className="landing-navigation" aria-label="Navegação da página">
            {navegacao.map((link) => (
              <a key={link.href} href={link.href}>
                {link.texto}
              </a>
            ))}
          </nav>
          <div className="landing-header-actions">
            <Link href="/entrar" className="landing-login">
              Entrar
            </Link>
            <Cta contato={contato} className="landing-header-cta" />
            <Dialog.Root open={menuAberto} onOpenChange={setMenuAberto}>
              <Dialog.Trigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="landing-menu-trigger"
                  aria-label="Abrir menu"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="landing-menu-overlay" />
                <Dialog.Content className="landing-menu">
                  <div className="landing-menu-top">
                    <Dialog.Title>Explore o sistema</Dialog.Title>
                    <Dialog.Close asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Fechar menu"
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </Dialog.Close>
                  </div>
                  <Dialog.Description>
                    Conheça o {configuracao.nome} e solicite seu acesso.
                  </Dialog.Description>
                  <nav aria-label="Navegação mobile">
                    {navegacao.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuAberto(false)}
                      >
                        {link.texto}
                        <ChevronRight size={18} aria-hidden="true" />
                      </a>
                    ))}
                    <a
                      href="#demonstracao"
                      onClick={() => setMenuAberto(false)}
                    >
                      Ver demonstração
                      <ChevronRight size={18} aria-hidden="true" />
                    </a>
                    <Link href="/entrar" onClick={() => setMenuAberto(false)}>
                      Já tenho acesso
                      <ChevronRight size={18} aria-hidden="true" />
                    </Link>
                  </nav>
                  <Button asChild className="landing-cta">
                    <a href={contato} onClick={() => setMenuAberto(false)}>
                      Quero começar
                      <ArrowRight size={18} aria-hidden="true" />
                    </a>
                  </Button>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>
      <main id="landing-conteudo" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="landing-titulo">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">
                <span />
                Para quem presta serviços
              </p>
              <h1 id="landing-titulo">
                Seu orçamento.
                <br />
                <em>Bem apresentado.</em>
              </h1>
              <p className="landing-hero-description">
                Crie orçamentos profissionais pelo celular, coloque sua marca e
                envie em PDF. Menos documentos espalhados. Mais organização no
                seu dia.
              </p>
              <div className="landing-hero-buttons">
                <Cta contato={contato} />
                <Button asChild variant="outline" className="landing-secondary">
                  <a href="#demonstracao">
                    Conhecer o sistema
                    <ArrowDown size={17} aria-hidden="true" />
                  </a>
                </Button>
              </div>
              <p className="landing-hero-price">
                <strong>R$ 29,99/mês</strong>
                <span>por empresa · até 2 usuários</span>
              </p>
              <div className="landing-hero-note">
                <Check size={15} aria-hidden="true" />
                No celular e no computador. Do seu jeito.
              </div>
            </div>
            <div className="landing-hero-visual">
              <div className="landing-visual-label">
                <span>Demonstração do sistema</span>
                <span>Dados fictícios</span>
              </div>
              <figure className="landing-desktop-shot">
                <div className="landing-window-bar">
                  <i />
                  <i />
                  <i />
                  <span>Visão parcial do editor</span>
                </div>
                <Image
                  src="/landing/desktop-editor.webp"
                  width={1280}
                  height={1338}
                  alt="Interface real do sistema no computador, com formulário e resumo de orçamento de demonstração"
                  sizes="(min-width:1024px) 520px, 80vw"
                />
              </figure>
              <figure className="landing-phone-shot">
                <div className="landing-phone-bar" aria-hidden="true" />
                <Image
                  src="/landing/mobile-lista.webp"
                  width={390}
                  height={900}
                  alt="Interface real do sistema no celular com orçamentos de demonstração"
                  sizes="(min-width:1024px) 210px, 190px"
                  preload
                />
              </figure>
              <figure className="landing-paper-shot">
                <Image
                  src="/landing/pdf-exemplo.webp"
                  width={660}
                  height={933}
                  alt="Exemplo real de orçamento PDF com dados fictícios"
                  sizes="(min-width:1024px) 160px, 120px"
                />
                <figcaption>
                  <FileText size={13} aria-hidden="true" />
                  Seu PDF, pronto.
                </figcaption>
              </figure>
              <div className="landing-visual-caption">
                <CheckCheck size={17} aria-hidden="true" />
                <span>Do primeiro serviço ao PDF final.</span>
              </div>
            </div>
          </div>
        </section>
        <div className="landing-use-strip">
          <div className="landing-container">
            <p>Feito para a rotina de quem faz acontecer.</p>
            <div>
              <span>
                <Smartphone size={17} aria-hidden="true" />
                Preencha no celular
              </span>
              <span>
                <FileText size={17} aria-hidden="true" />
                Gere seu PDF
              </span>
              <span>
                <Share2 size={17} aria-hidden="true" />
                Compartilhe com o cliente
              </span>
            </div>
          </div>
        </div>
        <section
          className="landing-section landing-problem"
          aria-labelledby="landing-problema"
        >
          <div className="landing-container landing-problem-grid">
            <div>
              <p className="landing-eyebrow">Seu serviço já dá trabalho.</p>
              <h2 id="landing-problema">
                Montar o orçamento
                <br />
                não precisa dar também.
              </h2>
              <p className="landing-section-description">
                Papel, mensagens, arquivos antigos. Quando cada informação está
                em um lugar, até um orçamento simples vira uma tarefa a mais.
              </p>
            </div>
            <div className="landing-problem-rows">
              {[
                {
                  antes: "Reescrever o mesmo documento",
                  depois:
                    "Preencha os serviços e deixe os cálculos com o sistema.",
                },
                {
                  antes: "Procurar valores no meio das conversas",
                  depois:
                    "Encontre seus orçamentos em um histórico organizado.",
                },
                {
                  antes: "Enviar cada arquivo de um jeito",
                  depois:
                    "Apresente um PDF com a logo e os dados da sua empresa.",
                },
              ].map((item) => (
                <div key={item.antes}>
                  <span>{item.antes}</span>
                  <ArrowRight size={19} aria-hidden="true" />
                  <p>{item.depois}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section
          id="como-funciona"
          className="landing-section landing-how"
          aria-labelledby="landing-como"
        >
          <div className="landing-container">
            <div className="landing-section-heading">
              <div>
                <p className="landing-eyebrow">Como funciona</p>
                <h2 id="landing-como">
                  Três passos.
                  <br />
                  Um orçamento pronto para enviar.
                </h2>
              </div>
              <p>
                Da primeira informação ao documento final, sem complicar o seu
                dia.
              </p>
            </div>
            <ol className="landing-steps">
              {[
                {
                  numero: "01",
                  titulo: "Preencha os dados",
                  texto:
                    "Informe o cliente, descreva os serviços e adicione quantidades e valores.",
                  Icone: ListChecks,
                },
                {
                  numero: "02",
                  titulo: "Deixe com a sua marca",
                  texto:
                    "Cadastre a logo e as informações da empresa para personalizar seus documentos.",
                  Icone: ImageIcon,
                },
                {
                  numero: "03",
                  titulo: "Gere e compartilhe",
                  texto:
                    "Confira o total, gere o PDF e encaminhe ao seu cliente pelo celular.",
                  Icone: Share2,
                },
              ].map((passo) => (
                <li key={passo.numero}>
                  <div className="landing-step-top">
                    <span>{passo.numero}</span>
                    <passo.Icone size={23} aria-hidden="true" />
                  </div>
                  <h3>{passo.titulo}</h3>
                  <p>{passo.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section
          id="funcionalidades"
          className="landing-section landing-features"
          aria-labelledby="landing-recursos"
        >
          <div className="landing-container">
            <div className="landing-section-heading">
              <div>
                <p className="landing-eyebrow">O essencial, bem resolvido</p>
                <h2 id="landing-recursos">
                  Você cuida do serviço.
                  <br />O sistema organiza o orçamento.
                </h2>
              </div>
              <a className="landing-text-link" href="#demonstracao">
                Veja por dentro
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
            <div className="landing-feature-grid">
              {recursos.map(({ Icone, titulo, texto }) => (
                <article key={titulo}>
                  <Icone size={24} strokeWidth={1.6} aria-hidden="true" />
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          id="demonstracao"
          className="landing-section landing-demo"
          aria-labelledby="landing-demo-titulo"
        >
          <div className="landing-container">
            <div className="landing-section-heading">
              <div>
                <p className="landing-eyebrow">Veja o sistema de verdade</p>
                <h2 id="landing-demo-titulo">
                  Simples de aprender.
                  <br />
                  Fácil de usar.
                </h2>
              </div>
              <p>
                Explore as telas reais do produto. As imagens usam dados
                fictícios de demonstração.
              </p>
            </div>
            <div
              className="landing-tabs"
              role="tablist"
              aria-label="Telas de demonstração"
            >
              {telas.map((item, indice) => (
                <button
                  key={item.id}
                  ref={(elemento) => {
                    botoesTelas.current[indice] = elemento;
                  }}
                  id={`landing-tab-${item.id}`}
                  role="tab"
                  aria-selected={telaAtiva === indice}
                  aria-controls={`landing-panel-${item.id}`}
                  tabIndex={telaAtiva === indice ? 0 : -1}
                  onClick={() => setTelaAtiva(indice)}
                  onKeyDown={(evento) => {
                    let destino = indice;
                    if (evento.key === "ArrowRight")
                      destino = (indice + 1) % telas.length;
                    else if (evento.key === "ArrowLeft")
                      destino = (indice - 1 + telas.length) % telas.length;
                    else if (evento.key === "Home") destino = 0;
                    else if (evento.key === "End") destino = telas.length - 1;
                    else return;
                    evento.preventDefault();
                    setTelaAtiva(destino);
                    botoesTelas.current[destino]?.focus();
                  }}
                >
                  <span>{item.numero}</span>
                  {item.curto}
                </button>
              ))}
            </div>
            {telas.map((item, indice) => (
              <div
                key={item.id}
                role="tabpanel"
                id={`landing-panel-${item.id}`}
                aria-labelledby={`landing-tab-${item.id}`}
                hidden={telaAtiva !== indice}
                tabIndex={0}
                className="landing-demo-panel"
              >
                <div className="landing-demo-copy">
                  <span className="landing-demo-number">
                    {item.numero} / 04
                  </span>
                  <h3>{item.descricao}</h3>
                  <p>{item.texto}</p>
                  <ul>
                    {item.pontos.map((ponto) => (
                      <li key={ponto}>
                        <Check size={17} aria-hidden="true" />
                        {ponto}
                      </li>
                    ))}
                  </ul>
                  <div className="landing-demo-platform">
                    <Smartphone size={17} aria-hidden="true" />
                    <span>Celular</span>
                    <Monitor size={17} aria-hidden="true" />
                    <span>Computador</span>
                  </div>
                </div>
                <figure
                  className={`landing-demo-screen landing-demo-screen-${item.tipo}`}
                >
                  <Image
                    src={item.imagem}
                    width={item.tipo === "pdf" ? 660 : 390}
                    height={
                      item.tipo === "pdf"
                        ? 933
                        : item.id === "cliente"
                          ? 1552
                          : item.id === "itens"
                            ? 1112
                            : 900
                    }
                    alt={item.alt}
                    sizes="(min-width:768px) 310px, 74vw"
                    loading="lazy"
                  />
                  <figcaption>Demonstração · dados fictícios</figcaption>
                </figure>
              </div>
            ))}
          </div>
        </section>
        <section
          className="landing-section landing-audience"
          aria-labelledby="landing-para-quem"
        >
          <div className="landing-container">
            <div className="landing-audience-heading">
              <p className="landing-eyebrow">Para quem é</p>
              <h2 id="landing-para-quem">
                Feito para quem trabalha
                <br />
                por conta própria.
              </h2>
              <p>
                Do pequeno reparo à instalação completa. Se você presta
                serviços, seu orçamento tem lugar aqui.
              </p>
            </div>
            <ul>
              {[
                { Icone: Layers, nome: "Instaladores" },
                { Icone: Paintbrush, nome: "Pintores" },
                { Icone: PlugZap, nome: "Eletricistas" },
                { Icone: Hammer, nome: "Marceneiros" },
                { Icone: Wrench, nome: "Outros prestadores" },
              ].map(({ Icone, nome }) => (
                <li key={nome}>
                  <Icone size={23} strokeWidth={1.6} aria-hidden="true" />
                  {nome}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section
          id="precos"
          className="landing-section landing-pricing"
          aria-labelledby="landing-preco"
        >
          <div className="landing-container landing-pricing-grid">
            <div className="landing-pricing-copy">
              <p className="landing-eyebrow">
                Um plano. Tudo o que você precisa.
              </p>
              <h2 id="landing-preco">
                Profissional no serviço.
                <br />
                Profissional no orçamento.
              </h2>
              <p>
                Um valor mensal por empresa. Seu acesso e o de mais uma pessoa,
                para organizar o trabalho juntos.
              </p>
              <div className="landing-price-note">
                <MessageCircle size={22} aria-hidden="true" />
                <p>
                  A contratação é feita pelo atendimento comercial. Você combina
                  os detalhes antes de receber seu acesso.
                </p>
              </div>
            </div>
            <div className="landing-price-card">
              <span className="landing-plan-name">Plano Profissional</span>
              <div className="landing-price">
                <span>R$</span>
                <strong>29,99</strong>
                <span>/mês</span>
              </div>
              <p className="landing-price-company">
                Por empresa · até 2 usuários ativos
              </p>
              <ul>
                {[
                  "Criação e histórico de orçamentos",
                  "Logo e informações da sua empresa",
                  "PDF profissional para seus clientes",
                  "Cálculos automáticos e descontos",
                  "Edição e organização por situação",
                  "Compartilhamento pelo celular",
                  "Acesso no celular e no computador",
                  "Até dois usuários ativos",
                ].map((beneficio) => (
                  <li key={beneficio}>
                    <Check size={17} aria-hidden="true" />
                    {beneficio}
                  </li>
                ))}
              </ul>
              <Cta contato={contato} />
              <p className="landing-price-footnote">
                Solicite o acesso pelo contato comercial.
              </p>
            </div>
          </div>
        </section>
        <section
          className="landing-section landing-faq"
          aria-labelledby="landing-perguntas"
        >
          <div className="landing-container landing-faq-grid">
            <div>
              <p className="landing-eyebrow">Dúvidas frequentes</p>
              <h2 id="landing-perguntas">
                Antes do seu
                <br />
                primeiro orçamento.
              </h2>
              <p className="landing-section-description">
                O que você precisa saber para começar com tranquilidade.
              </p>
            </div>
            <Accordion type="single" collapsible className="landing-faq-list">
              {perguntas.map((item, indice) => (
                <AccordionItem key={item.pergunta} value={`pergunta-${indice}`}>
                  <AccordionTrigger>{item.pergunta}</AccordionTrigger>
                  <AccordionContent>{item.resposta}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
        <section
          id="contato"
          className="landing-final"
          aria-labelledby="landing-contato-titulo"
        >
          <div className="landing-container">
            <div>
              <p className="landing-eyebrow">O próximo passo é seu</p>
              <h2 id="landing-contato-titulo">
                Seu próximo orçamento
                <br />
                pode ser muito mais simples.
              </h2>
              <p>
                Organize seu trabalho e apresente orçamentos profissionais aos
                seus clientes.
              </p>
            </div>
            <div className="landing-final-action">
              {configuracao.contato ? (
                <>
                  <Cta contato={contato} />
                  <span>R$ 29,99/mês por empresa.</span>
                </>
              ) : (
                <Dialog.Root
                  open={contatoAberto}
                  onOpenChange={setContatoAberto}
                >
                  <Dialog.Trigger asChild>
                    <Button className="landing-cta">
                      Quero começar
                      <ArrowRight size={18} aria-hidden="true" />
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="landing-menu-overlay" />
                    <Dialog.Content className="landing-contact-dialog">
                      <MessageCircle size={26} aria-hidden="true" />
                      <Dialog.Title>
                        Contato comercial em preparação
                      </Dialog.Title>
                      <Dialog.Description>
                        Este é um preview. O canal para solicitar acesso será
                        disponibilizado em breve.
                      </Dialog.Description>
                      <Dialog.Close asChild>
                        <Button>Entendi</Button>
                      </Dialog.Close>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-main">
            <div>
              <Marca configuracao={configuracao} rodape />
              <p>
                Orçamentos profissionais.
                <br />
                Mais organização para quem presta serviços.
              </p>
            </div>
            <nav aria-label="Links do rodapé">
              {navegacao.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.texto}
                </a>
              ))}
              <a href={contato}>Contato comercial</a>
              <Link href="/entrar">Entrar no sistema</Link>
            </nav>
          </div>
          <div className="landing-footer-bottom">
            <p>
              {configuracao.nome}
              {configuracao.responsavel && <> · {configuracao.responsavel}</>}
            </p>
            <div>
              {configuracao.privacidade && (
                <a href={configuracao.privacidade}>Política de privacidade</a>
              )}
              {configuracao.termos && (
                <a href={configuracao.termos}>Termos de uso</a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
