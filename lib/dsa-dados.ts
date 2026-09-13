// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: lib/dsa-dados.ts
// Corresponde a secao "########## Analytics ##########" do dsa_app.py -- a parte
// que busca os dados. As funcoes de GRAFICO (dsa_plot_*) foram para
// components/DsaGraficos.tsx, porque grafico se desenha no navegador.
//
// Este arquivo roda SO NO SERVIDOR.

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// import yfinance as yf
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: yfinance (Python) vira yahoo-finance2 (Node.js). Sao projetos diferentes,
//               de autores diferentes, mas fazem a mesma coisa: consultar a API "nao
//               oficial" do Yahoo Finance. Desde a versao 3 o yahoo-finance2 exige criar
//               uma INSTANCIA (new YahooFinance()) em vez de usar funcoes soltas.
// ==============================================================================
import YahooFinance from "yahoo-finance2";
import type { Candle, DadosHistoricos } from "./dsa-tipos";

// Uma unica instancia para o modulo inteiro. 'suppressNotices' cala um aviso
// ("responda a pesquisa do projeto") que a biblioteca imprime na primeira chamada.
// Exportamos porque dsa-ferramentas.ts usa a mesma instancia nas ferramentas
// do agente financeiro.
export const dsaYahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// # Usa o cache de dados do Streamlit para armazenar os resultados da função e evitar reprocessamento
// # Define a função que extrai dados históricos de uma ação com base no ticker e período especificado
// @st.cache_data
// def dsa_extrai_dados(ticker, period="6mo"):
//
//     # Cria um objeto Ticker do Yahoo Finance para a ação especificada
//     stock = yf.Ticker(ticker)
//
//     # Obtém o histórico de preços da ação para o período definido
//     hist = stock.history(period=period)
//
//     # Reseta o índice do DataFrame para transformar a coluna de data em uma coluna normal
//     hist.reset_index(inplace=True)
//
//     # Retorna o DataFrame com os dados históricos da ação
//     return hist
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: Quatro diferencas, todas pequenas:
//               1) Nao ha DataFrame em JavaScript. O "hist" vira um array de objetos
//                  Candle (uma linha = um objeto), que e o formato natural do JSON.
//               2) O period="6mo" do yfinance vira uma DATA DE INICIO (period1): o
//                  yahoo-finance2 nao aceita atalhos como "6mo".
//               3) O @st.cache_data sumiu. Ele existia porque o Streamlit reexecuta o
//                  script inteiro a cada clique e refaria a consulta a toa. Uma rota de
//                  API so roda quando o navegador a chama -- uma vez por analise.
//               4) Ticker inexistente: o yfinance devolvia tabela VAZIA; o yahoo-finance2
//                  LANCA UM ERRO ("No data found, symbol may be delisted"). A rota
//                  app/api/dados/route.ts trata os dois casos.
// ==============================================================================

/**
 * Extrai os dados historicos de uma acao (padrao: ultimos 6 meses, candles
 * diarios) e ja calcula as duas medias moveis usadas no grafico.
 */
export async function dsaExtraiDados(ticker: string, meses = 6): Promise<DadosHistoricos> {
  // period="6mo" -> data de hoje menos 6 meses
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - meses);

  // O equivalente ao stock.history(): a rota "chart" do Yahoo, com velas de 1 dia.
  const resultado = await dsaYahoo.chart(ticker, { period1: inicio, interval: "1d" });

  // Cada "quote" do Yahoo vira um Candle. Em dias de pregao incompleto o Yahoo
  // manda campos nulos; o yfinance descartava essas linhas em silencio, e
  // fazemos o mesmo com o filter().
  const candles: Candle[] = resultado.quotes
    .filter((q) => q.open != null && q.high != null && q.low != null && q.close != null)
    .map((q) => ({
      data: q.date.toISOString().slice(0, 10), // Date -> "AAAA-MM-DD"
      abertura: q.open as number,
      maxima: q.high as number,
      minima: q.low as number,
      fechamento: q.close as number,
      volume: q.volume ?? 0,
    }));

  const fechamentos = candles.map((c) => c.fechamento);

  return {
    ticker,
    moeda: resultado.meta.currency,
    candles,
    sma20: dsaMediaMovelSimples(fechamentos, 20),
    ema20: dsaMediaMovelExponencial(fechamentos, 20),
  };
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// (dentro de dsa_plot_media_movel)
//     # Calcula a Média Móvel Simples (SMA) de 20 períodos e adiciona ao DataFrame
//     hist['SMA_20'] = hist['Close'].rolling(window=20).mean()
//
//     # Calcula a Média Móvel Exponencial (EMA) de 20 períodos e adiciona ao DataFrame
//     hist['EMA_20'] = hist['Close'].ewm(span=20, adjust=False).mean()
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: Nao ha pandas. As duas linhas viram duas funcoes de poucas linhas cada.
//               Vale a pena ler: e uma boa oportunidade de ver O QUE o pandas fazia por
//               tras de .rolling().mean() e .ewm().mean().
// ==============================================================================

/**
 * Media Movel Simples (SMA): a media dos ultimos 'janela' valores.
 *
 * E o rolling(window=janela).mean() do pandas. Nos primeiros (janela - 1)
 * pontos nao ha valores suficientes para a media: o pandas poe NaN, nos
 * pomos null -- e o Plotly deixa o buraco no grafico, igualzinho.
 */
export function dsaMediaMovelSimples(valores: number[], janela: number): Array<number | null> {
  return valores.map((_, i) => {
    if (i < janela - 1) return null;
    const trecho = valores.slice(i - janela + 1, i + 1); // os ultimos 'janela' valores
    const soma = trecho.reduce((acumulado, v) => acumulado + v, 0);
    return soma / janela;
  });
}

/**
 * Media Movel Exponencial (EMA): cada ponto e uma mistura do valor de hoje
 * com a EMA de ontem, em que os valores recentes pesam mais.
 *
 * E o ewm(span=span, adjust=False).mean() do pandas, cuja formula e:
 *     alpha = 2 / (span + 1)
 *     ema[0] = valor[0]
 *     ema[t] = alpha * valor[t] + (1 - alpha) * ema[t - 1]
 */
export function dsaMediaMovelExponencial(valores: number[], span: number): number[] {
  const alpha = 2 / (span + 1);
  const ema: number[] = [];
  valores.forEach((valor, i) => {
    ema.push(i === 0 ? valor : alpha * valor + (1 - alpha) * ema[i - 1]);
  });
  return ema;
}
