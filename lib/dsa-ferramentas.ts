// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: lib/dsa-ferramentas.ts
// Corresponde a secao "NOVO: FERRAMENTA DE BUSCA NA WEB" do dsa_app.py (classe
// DSADuckDuckGo) e ao YFinanceTools que o phidata trazia pronto.
//
// Este arquivo roda SO NO SERVIDOR.
//
// O QUE E UMA FERRAMENTA (tool): uma funcao comum que o LLM pode PEDIR para
// executar. O modelo nao roda nada -- ele escreve "quero chamar
// get_current_stock_price com symbol=MSFT", o nosso codigo executa a funcao de
// verdade e devolve o resultado para o modelo continuar o raciocinio. Tres
// coisas definem uma ferramenta: o NOME, a DESCRICAO (o modelo le para decidir
// quando usar) e o ESQUEMA DOS PARAMETROS (para o modelo saber o que enviar).
// No phidata, a descricao e o esquema vinham da docstring e dos type hints da
// funcao Python. No AI SDK, sao explicitos: 'description' e 'inputSchema'.

import { tool } from "ai";
import { z } from "zod";
import { dsaYahoo } from "./dsa-dados";

// ==============================================================================
// FERRAMENTA DE BUSCA NA WEB (a DSADuckDuckGo do dsa_app.py)
// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// from ddgs import DDGS
//
// class DSADuckDuckGo(Toolkit):
//     """Busca na web usando o pacote ddgs (nome atual do duckduckgo_search)."""
//
//     def __init__(self, fixed_max_results=5):
//         super().__init__(name="duckduckgo")
//         self.fixed_max_results = fixed_max_results
//         self.register(self.duckduckgo_search)
//         self.register(self.duckduckgo_news)
//
//     def duckduckgo_search(self, query: str, max_results: int = 5) -> str:
//         """Use this function to search DuckDuckGo for a query. ..."""
//         quantos = self.fixed_max_results or max_results
//         try:
//             return json.dumps(list(DDGS().text(query, max_results=quantos)),
//                               ensure_ascii=False)
//         except Exception as erro:
//             return json.dumps({"erro": f"busca indisponivel: {erro}"},
//                               ensure_ascii=False)
//
//     def duckduckgo_news(self, query: str, max_results: int = 5) -> str:
//         """Use this function to get the latest news from DuckDuckGo. ..."""
//         (mesma estrutura, com DDGS().news)
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: A historia se repete. Em Python, o pacote duckduckgo_search tinha virado
//               uma casca vazia. Em Node.js, o pacote mais usado (duck-duck-scrape) cai na
//               detecao anti-robo do DuckDuckGo ("DDG detected an anomaly") logo na
//               primeira busca de texto. Testamos antes de escolher.
//
//               A solucao foi dispensar o pacote: o DuckDuckGo tem uma versao HTML da
//               busca (html.duckduckgo.com) e um endpoint JSON de noticias (news.js) que
//               respondem normalmente a um 'fetch' com User-Agent de navegador. Sao
//               ~40 linhas, sem dependencia nenhuma -- e voce ve exatamente o que uma
//               "ferramenta de busca" faz por dentro: baixa uma pagina e recorta o
//               que interessa.
//
//               Os nomes das ferramentas e os textos de descricao sao IGUAIS aos do
//               phidata DE PROPOSITO: e a descricao que o modelo le para decidir quando
//               usar a ferramenta, e os modelos ja conhecem esses nomes.
// ==============================================================================

// O DuckDuckGo recusa pedidos sem User-Agent (assume que e robo). Este e o de um
// Chrome comum. E o mesmo truque que o ddgs fazia por dentro.
const DSA_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// Igual ao fixed_max_results=5 do Python: o modelo pode pedir mais, mas
// devolvemos no maximo 5 -- resultado demais so gasta tokens.
const DSA_MAX_RESULTADOS = 5;

/** Tira tags HTML e decodifica as entidades mais comuns (&amp; -> & etc.). */
function dsaLimpaHtml(texto: string): string {
  return texto
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca de texto: baixa a pagina de resultados em HTML e recorta titulo, link
 * e resumo de cada resultado. Devolve os mesmos campos do ddgs (title, href,
 * body) para o modelo nao sentir diferenca.
 */
export async function dsaDuckDuckGoSearch(query: string, maxResults = DSA_MAX_RESULTADOS) {
  const resposta = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), {
    headers: { "User-Agent": DSA_USER_AGENT },
  });
  if (!resposta.ok) throw new Error(`DuckDuckGo respondeu HTTP ${resposta.status}`);
  const html = await resposta.text();

  // Cada resultado na pagina tem esta estrutura (simplificada):
  //   <a class="result__a" href="//duckduckgo.com/l/?uddg=URL_CODIFICADA&...">Titulo</a>
  //   ... <a class="result__snippet" ...>Resumo</a>
  const padrao =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  const resultados: Array<{ title: string; href: string; body: string }> = [];
  for (const achado of html.matchAll(padrao)) {
    // O link e um redirecionamento do DuckDuckGo; a URL real esta no parametro uddg.
    const uddg = achado[1].match(/uddg=([^&]+)/);
    resultados.push({
      title: dsaLimpaHtml(achado[2]),
      href: uddg ? decodeURIComponent(uddg[1]) : achado[1],
      body: dsaLimpaHtml(achado[3]),
    });
    if (resultados.length >= maxResults) break;
  }
  return resultados;
}

/**
 * Noticias: em dois passos. (1) A pagina de busca embute um token "vqd" no
 * HTML; (2) o endpoint news.js devolve JSON se receber esse token. E o mesmo
 * fluxo que os pacotes de busca fazem por dentro.
 */
export async function dsaDuckDuckGoNews(query: string, maxResults = DSA_MAX_RESULTADOS) {
  const cabecalhos = { "User-Agent": DSA_USER_AGENT, Referer: "https://duckduckgo.com/" };

  // passo 1: token vqd
  const pagina = await fetch("https://duckduckgo.com/?q=" + encodeURIComponent(query) + "&ia=news", {
    headers: cabecalhos,
  });
  const vqd = (await pagina.text()).match(/vqd=["']?([\d-]+)["']?/)?.[1];
  if (!vqd) throw new Error("DuckDuckGo nao devolveu o token vqd");

  // passo 2: as noticias em JSON
  const resposta = await fetch(
    `https://duckduckgo.com/news.js?l=us-en&o=json&noamp=1&q=${encodeURIComponent(query)}&vqd=${vqd}`,
    { headers: cabecalhos },
  );
  if (!resposta.ok) throw new Error(`DuckDuckGo News respondeu HTTP ${resposta.status}`);
  const json = (await resposta.json()) as {
    results?: Array<{ date: number; title: string; excerpt?: string; url: string; source?: string }>;
  };

  // Mesmos campos do ddgs.news(): date, title, body, url, source.
  return (json.results ?? []).slice(0, maxResults).map((n) => ({
    date: new Date(n.date * 1000).toISOString(), // o Yahoo/DDG usam segundos desde 1970
    title: n.title,
    body: dsaLimpaHtml(n.excerpt ?? ""),
    url: n.url,
    source: n.source ?? "",
  }));
}

/**
 * As duas ferramentas de busca, no formato que o AI SDK espera. Um agente
 * recebe este objeto inteiro em "tools:".
 *
 * Repare no try/catch dentro de cada 'execute': se a busca falhar, devolvemos
 * um objeto { erro } EM VEZ de lancar excecao -- exatamente como o Python
 * fazia. Assim o modelo fica sabendo que a busca nao funcionou e pode
 * responder com o que tem, em vez de derrubar a analise inteira.
 */
export const dsaFerramentasDuckDuckGo = {
  duckduckgo_search: tool({
    description: "Use this function to search DuckDuckGo for a query.",
    inputSchema: z.object({
      query: z.string().describe("The query to search for."),
      max_results: z.number().int().optional().describe("The maximum number of results to return."),
    }),
    execute: async ({ query }) => {
      try {
        return await dsaDuckDuckGoSearch(query);
      } catch (erro) {
        return { erro: `busca indisponivel: ${erro}` };
      }
    },
  }),

  duckduckgo_news: tool({
    description: "Use this function to get the latest news from DuckDuckGo.",
    inputSchema: z.object({
      query: z.string().describe("The query to search for."),
      max_results: z.number().int().optional().describe("The maximum number of results to return."),
    }),
    execute: async ({ query }) => {
      try {
        return await dsaDuckDuckGoNews(query);
      } catch (erro) {
        return { erro: `busca indisponivel: ${erro}` };
      }
    },
  }),
};

// ==============================================================================
// FERRAMENTAS FINANCEIRAS (o YFinanceTools do phidata)
// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// from phi.tools.yfinance import YFinanceTools
// ...
//     tools=[YFinanceTools(stock_price=True,
//                          analyst_recommendations=True,
//                          stock_fundamentals=True,
//                          company_news=True)],
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: O phidata entregava a classe pronta; cada flag (stock_price=True...)
//               ligava um metodo. O AI SDK nao traz ferramentas financeiras, entao
//               escrevemos as quatro que o capitulo usa, com os MESMOS nomes e as
//               MESMAS descricoes do phidata, sobre o yahoo-finance2. Cada uma tem
//               10 linhas -- e agora voce ve o que o phidata fazia por tras das flags.
//
//               Onde o phidata devolvia uma string JSON (json.dumps), devolvemos o
//               objeto direto: o AI SDK serializa sozinho antes de entregar ao modelo.
// ==============================================================================

// O esquema de entrada e igual para tres das quatro ferramentas.
const dsaEsquemaSimbolo = z.object({
  symbol: z.string().describe("The stock symbol, e.g. MSFT."),
});

export const dsaFerramentasYFinance = {
  // stock_price=True
  get_current_stock_price: tool({
    description: "Use this function to get the current stock price for a given symbol.",
    inputSchema: dsaEsquemaSimbolo,
    execute: async ({ symbol }) => {
      try {
        const cotacao = await dsaYahoo.quote(symbol);
        const preco = cotacao.regularMarketPrice;
        // O phidata formatava com 4 casas decimais ("495.6300"); mantemos.
        return preco != null ? `${preco.toFixed(4)} ${cotacao.currency ?? ""}`.trim()
                             : `Could not fetch current price for ${symbol}`;
      } catch (erro) {
        return `Error fetching current price for ${symbol}: ${erro}`;
      }
    },
  }),

  // analyst_recommendations=True
  get_analyst_recommendations: tool({
    description: "Use this function to get analyst recommendations for a given stock symbol.",
    inputSchema: dsaEsquemaSimbolo,
    execute: async ({ symbol }) => {
      try {
        // O yfinance lia stock.recommendations (uma tabela por periodo: 0m, -1m,
        // -2m, -3m com a contagem de strongBuy/buy/hold/sell/strongSell). No Yahoo
        // essa tabela se chama "recommendationTrend".
        const resumo = await dsaYahoo.quoteSummary(symbol, { modules: ["recommendationTrend"] });
        return resumo.recommendationTrend?.trend ?? `No recommendations found for ${symbol}`;
      } catch (erro) {
        return `Error fetching analyst recommendations for ${symbol}: ${erro}`;
      }
    },
  }),

  // stock_fundamentals=True
  get_stock_fundamentals: tool({
    description:
      "Use this function to get fundamental data for a given stock symbol yfinance API. " +
      "Returns: symbol, company_name, sector, industry, market_cap, pe_ratio, pb_ratio, " +
      "dividend_yield, eps, beta, 52_week_high, 52_week_low.",
    inputSchema: dsaEsquemaSimbolo,
    execute: async ({ symbol }) => {
      try {
        // O yfinance juntava tudo em stock.info; o Yahoo espalha em "modulos".
        const r = await dsaYahoo.quoteSummary(symbol, {
          modules: ["summaryProfile", "summaryDetail", "defaultKeyStatistics", "price"],
        });
        // Mesmas chaves do phidata, na mesma ordem.
        return {
          symbol,
          company_name: r.price?.longName ?? "N/A",
          sector: r.summaryProfile?.sector ?? "N/A",
          industry: r.summaryProfile?.industry ?? "N/A",
          market_cap: r.summaryDetail?.marketCap ?? "N/A",
          pe_ratio: r.summaryDetail?.trailingPE ?? "N/A",
          pb_ratio: r.defaultKeyStatistics?.priceToBook ?? "N/A",
          dividend_yield: r.summaryDetail?.dividendYield ?? "N/A",
          eps: r.defaultKeyStatistics?.trailingEps ?? "N/A",
          beta: r.summaryDetail?.beta ?? "N/A",
          "52_week_high": r.summaryDetail?.fiftyTwoWeekHigh ?? "N/A",
          "52_week_low": r.summaryDetail?.fiftyTwoWeekLow ?? "N/A",
        };
      } catch (erro) {
        return `Error getting fundamentals for ${symbol}: ${erro}`;
      }
    },
  }),

  // company_news=True
  get_company_news: tool({
    description: "Use this function to get company news and press releases for a given stock symbol.",
    inputSchema: z.object({
      symbol: z.string().describe("The stock symbol, e.g. MSFT."),
      num_stories: z.number().int().optional().describe("The number of news stories to return. Defaults to 3."),
    }),
    execute: async ({ symbol, num_stories }) => {
      try {
        // O yfinance lia stock.news; no yahoo-finance2 as noticias vem junto com a
        // busca por simbolo (search), no campo "news".
        const quantas = num_stories ?? 3;
        const busca = await dsaYahoo.search(symbol, { newsCount: quantas, quotesCount: 0 });
        return busca.news.slice(0, quantas).map((n) => ({
          title: n.title,
          publisher: n.publisher,
          link: n.link,
          published: n.providerPublishTime,
        }));
      } catch (erro) {
        return `Error fetching company news for ${symbol}: ${erro}`;
      }
    },
  }),
};
