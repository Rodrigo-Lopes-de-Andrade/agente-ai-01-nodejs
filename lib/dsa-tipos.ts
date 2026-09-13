// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: lib/dsa-tipos.ts
//
// ==============================================================================
// POR QUE ESTE ARQUIVO EXISTE (nao havia nada parecido no dsa_app.py)
// ==============================================================================
// No Streamlit tudo roda num unico processo Python: a funcao dsa_extrai_dados()
// devolve um DataFrame e a funcao de grafico recebe esse mesmo DataFrame, na
// mesma memoria. Nao ha "formato de troca" porque nao ha troca.
//
// No Next.js o app e dividido em dois lados:
//   - SERVIDOR (Node.js): as rotas em app/api/ buscam dados e rodam os agentes;
//   - NAVEGADOR (React): a pagina em app/page.tsx desenha a tela.
// Os dois conversam por HTTP trocando JSON. Este arquivo descreve o FORMATO
// desse JSON, para que os dois lados concordem. E o mesmo papel dos type hints
// do Python (def f(ticker: str) -> DataFrame), com uma diferenca: o TypeScript
// CONFERE os tipos antes de rodar. Se a rota devolver "fechamento" e a pagina
// tentar ler "close", o erro aparece no editor, nao na tela do cliente.

// Uma linha do historico de precos -- uma "vela" (candle) do grafico de
// candlestick. Corresponde a uma linha do DataFrame do yfinance, cujas colunas
// eram Date, Open, High, Low, Close e Volume.
export type Candle = {
  data: string;       // "2026-03-13" (a coluna Date, ja como texto)
  abertura: number;   // Open
  maxima: number;     // High
  minima: number;     // Low
  fechamento: number; // Close
  volume: number;     // Volume
};

// O que a rota GET /api/dados devolve: o historico completo mais as duas
// medias moveis que o dsa_app.py calculava com pandas dentro de
// dsa_plot_media_movel(). Calculamos no servidor e mandamos prontas.
export type DadosHistoricos = {
  ticker: string;
  moeda: string;                 // "USD" para acoes da Nasdaq
  candles: Candle[];
  sma20: Array<number | null>;   // media movel simples; null nos 19 primeiros dias (o NaN do pandas)
  ema20: number[];               // media movel exponencial; definida desde o primeiro dia
};

// Um provedor de LLM como o NAVEGADOR o enxerga: so apelido e modelo.
// Repare no que NAO esta aqui: a chave de API. Ela nunca sai do servidor.
export type ProvedorDisponivel = {
  apelido: string;   // "Groq", "OpenAI", "Anthropic", "Grok" ou "Ollama"
  modelo: string;    // "openai/gpt-oss-120b", "gpt-4o-mini", ...
};

// Formatos das respostas de cada rota de API (o navegador usa para saber o que
// esperar; o servidor usa para garantir que devolveu o combinado).
export type RespostaProvedores = { provedores: ProvedorDisponivel[] };
export type RespostaAnalise = { analise: string; provedor: string; modelo: string };
export type RespostaErro = { erro: string };   // 'erro' e um texto em Markdown, pronto para exibir
