// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: app/api/dados/route.ts
// Rota: GET /api/dados?ticker=MSFT
//
// Devolve o historico de precos (6 meses) mais as medias moveis, no formato
// DadosHistoricos de lib/dsa-tipos.ts. E a primeira das duas chamadas que o
// botao "Analisar" faz: se o ticker nao existe, paramos aqui e nao gastamos
// uma chamada de LLM a toa (a mesma checagem 'if hist.empty' do dsa_app.py).

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// hist = dsa_extrai_dados(ticker)
//
// if hist.empty:
//     st.error(f"Nao encontrei dados para o ticker '{ticker}'. "
//              "Confira o simbolo (exemplos: MSFT, TSLA, AMZN, GOOG).")
//     st.stop()
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: st.error() + st.stop() viram uma resposta HTTP com codigo 404 ("nao
//               encontrado") e a mesma mensagem em JSON. O navegador le o codigo,
//               mostra a mensagem em vermelho e nao chama a analise. Alem do 'hist
//               vazio', tratamos o ERRO que o yahoo-finance2 lanca para ticker
//               inexistente (o yfinance devolvia tabela vazia; o yahoo-finance2 lanca
//               "No data found, symbol may be delisted").
// ==============================================================================

import { dsaExtraiDados } from "@/lib/dsa-dados";
import type { RespostaErro } from "@/lib/dsa-tipos";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  // O ticker chega na URL (?ticker=MSFT). new URL(...) e o jeito padrao de ler
  // parametros de consulta no Node.js. .toUpperCase() faz o papel do .upper()
  // que o Python aplicava no st.text_input.
  const ticker = new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase() ?? "";

  if (!ticker) {
    const erro: RespostaErro = { erro: "Ticker inválido. Insira um símbolo de ação válido." };
    return Response.json(erro, { status: 400 });
  }

  const naoEncontrado: RespostaErro = {
    erro: `Nao encontrei dados para o ticker '${ticker}'. Confira o simbolo (exemplos: MSFT, TSLA, AMZN, GOOG).`,
  };

  try {
    const dados = await dsaExtraiDados(ticker);
    if (dados.candles.length === 0) {
      return Response.json(naoEncontrado, { status: 404 });
    }
    return Response.json(dados);
  } catch (erro) {
    const texto = erro instanceof Error ? erro.message : String(erro);
    // "No data found" / "Not Found": o simbolo nao existe no Yahoo.
    if (/no data found|not found|delisted/i.test(texto)) {
      return Response.json(naoEncontrado, { status: 404 });
    }
    // Qualquer outra coisa (Yahoo fora do ar, rede...) e um problema do lado de la.
    console.error("[/api/dados] falha ao consultar o Yahoo Finance:", texto);
    const falha: RespostaErro = {
      erro: `**O Yahoo Finance nao respondeu para '${ticker}'.**\n\nTente novamente em instantes.\n\nMensagem original: \`${texto.slice(0, 300)}\``,
    };
    return Response.json(falha, { status: 502 });
  }
}
