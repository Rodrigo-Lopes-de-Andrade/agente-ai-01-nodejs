// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: components/DsaGraficos.tsx
// Corresponde as quatro funcoes dsa_plot_* da secao "########## Analytics ##########"
// do dsa_app.py.
//
// "use client" na primeira linha diz ao Next.js: este arquivo roda no NAVEGADOR.
// Precisa ser assim porque o Plotly desenha em <div>s reais, com mouse, zoom e
// tooltip -- coisas que so existem no navegador. Por isso tambem a pagina o
// importa com next/dynamic e ssr: false (veja app/page.tsx).
"use client";

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// import plotly.graph_objects as go
// import plotly.express as px
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: E o MESMO Plotly, na versao JavaScript (que, alias, e a versao original:
//               o Plotly do Python e uma casca que gera JSON para esta biblioteca). Nao
//               existe plotly.express em JS: cada grafico e escrito no estilo
//               graph_objects, com 'data' (as series) e 'layout' (titulo, eixos).
//               Usamos o bundle "finance", que traz so os tipos de grafico que
//               precisamos (linha, candlestick, barra): 1,2 MB em vez de 4,5 MB.
// ==============================================================================
import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-finance-dist-min";
import type { DadosHistoricos } from "@/lib/dsa-tipos";

// Uma "figura": o par data + layout, o mesmo que o 'fig' do Python carregava.
type Figura = { data: Plotly.Data[]; layout: Partial<Plotly.Layout> };

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// def dsa_plot_stock_price(hist, ticker):
//     fig = px.line(hist, x="Date", y="Close", title=f"{ticker} Preços das Ações (Últimos 6 Meses)", markers=True)
//     st.plotly_chart(fig, width="stretch")
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: px.line(..., markers=True) vira um trace do tipo "scatter" com
//               mode: "lines+markers". As funcoes agora DEVOLVEM a figura em vez de
//               desenha-la: quem desenha e o componente DsaPlotly, la embaixo.
// ==============================================================================
function dsaPlotStockPrice(hist: DadosHistoricos): Figura {
  return {
    data: [
      {
        type: "scatter",
        mode: "lines+markers",
        x: hist.candles.map((c) => c.data),
        y: hist.candles.map((c) => c.fechamento),
        name: "Close",
      },
    ],
    layout: {
      title: { text: `${hist.ticker} Preços das Ações (Últimos 6 Meses)` },
      xaxis: { title: { text: "Date" } },
      yaxis: { title: { text: "Close" } },
    },
  };
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// def dsa_plot_candlestick(hist, ticker):
//     fig = go.Figure(
//         data=[go.Candlestick(x=hist['Date'],
//                              open=hist['Open'],
//                              high=hist['High'],
//                              low=hist['Low'],
//                              close=hist['Close'])]
//     )
//     fig.update_layout(title=f"{ticker} Candlestick Chart (Últimos 6 Meses)")
//     st.plotly_chart(fig, width="stretch")
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: Quase nada -- go.Candlestick(...) e literalmente { type: "candlestick", ... }.
//               E o grafico que mostra melhor por que o Plotly do Python e so um gerador
//               de JSON para este aqui.
// ==============================================================================
function dsaPlotCandlestick(hist: DadosHistoricos): Figura {
  return {
    data: [
      {
        type: "candlestick",
        x: hist.candles.map((c) => c.data),
        open: hist.candles.map((c) => c.abertura),
        high: hist.candles.map((c) => c.maxima),
        low: hist.candles.map((c) => c.minima),
        close: hist.candles.map((c) => c.fechamento),
      },
    ],
    layout: {
      title: { text: `${hist.ticker} Candlestick Chart (Últimos 6 Meses)` },
      xaxis: { rangeslider: { visible: false } }, // o Plotly JS liga o "range slider" por padrao no candlestick; o Python nao
    },
  };
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// def dsa_plot_media_movel(hist, ticker):
//     hist['SMA_20'] = hist['Close'].rolling(window=20).mean()
//     hist['EMA_20'] = hist['Close'].ewm(span=20, adjust=False).mean()
//     fig = px.line(hist,
//                   x='Date',
//                   y=['Close', 'SMA_20', 'EMA_20'],
//                   title=f"{ticker} Médias Móveis (Últimos 6 Meses)",
//                   labels={'value': 'Price (USD)', 'Date': 'Date'})
//     st.plotly_chart(fig, width="stretch")
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: As medias moveis ja chegam calculadas do servidor (lib/dsa-dados.ts).
//               px.line com tres colunas em y= vira tres traces do tipo scatter, um por
//               serie, com o 'name' que aparece na legenda. O null nos 19 primeiros
//               pontos da SMA deixa o buraco no grafico, como o NaN do pandas.
// ==============================================================================
function dsaPlotMediaMovel(hist: DadosHistoricos): Figura {
  const datas = hist.candles.map((c) => c.data);
  return {
    data: [
      { type: "scatter", mode: "lines", x: datas, y: hist.candles.map((c) => c.fechamento), name: "Close" },
      { type: "scatter", mode: "lines", x: datas, y: hist.sma20, name: "SMA_20" },
      { type: "scatter", mode: "lines", x: datas, y: hist.ema20, name: "EMA_20" },
    ],
    layout: {
      title: { text: `${hist.ticker} Médias Móveis (Últimos 6 Meses)` },
      xaxis: { title: { text: "Date" } },
      yaxis: { title: { text: `Price (${hist.moeda})` } },
    },
  };
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// def dsa_plot_volume(hist, ticker):
//     fig = px.bar(hist,
//                  x='Date',
//                  y='Volume',
//                  title=f"{ticker} Trading Volume (Últimos 6 Meses)")
//     st.plotly_chart(fig, width="stretch")
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: px.bar vira um trace do tipo "bar". So isso.
// ==============================================================================
function dsaPlotVolume(hist: DadosHistoricos): Figura {
  return {
    data: [
      {
        type: "bar",
        x: hist.candles.map((c) => c.data),
        y: hist.candles.map((c) => c.volume),
        name: "Volume",
      },
    ],
    layout: {
      title: { text: `${hist.ticker} Trading Volume (Últimos 6 Meses)` },
      xaxis: { title: { text: "Date" } },
      yaxis: { title: { text: "Volume" } },
    },
  };
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// st.plotly_chart(fig, width="stretch")
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: O st.plotly_chart vira um componente React de 15 linhas. Tres ideias novas:
//               - useRef: guarda a referencia a <div> real onde o Plotly vai desenhar;
//               - useEffect: roda DEPOIS que a <div> existe na tela (o Plotly precisa
//                 dela pronta); o 'return' e a limpeza, chamada quando o componente sai
//                 da tela ou a figura muda -- Plotly.purge libera a memoria do grafico;
//               - responsive: true e o width="stretch": o grafico acompanha a largura.
// ==============================================================================
function DsaPlotly({ figura }: { figura: Figura }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = ref.current;
    if (!div) return;
    Plotly.react(
      div,
      figura.data,
      { ...figura.layout, autosize: true, margin: { l: 60, r: 30, t: 60, b: 50 } },
      { responsive: true, displaylogo: false },
    );
    return () => {
      Plotly.purge(div);
    };
  }, [figura]);

  return <div ref={ref} className="dsa-grafico" />;
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// # Renderiza os gráficos
// st.subheader("Visualização dos Dados")
// dsa_plot_stock_price(hist, ticker)
// dsa_plot_candlestick(hist, ticker)
// dsa_plot_media_movel(hist, ticker)
// dsa_plot_volume(hist, ticker)
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: As quatro chamadas viram uma lista de figuras, uma <DsaPlotly> para cada.
//               useMemo garante que as figuras so sejam recalculadas quando os DADOS
//               mudarem, e nao a cada redesenho da pagina (o React redesenha muitas
//               vezes; recalcular 4 graficos toda hora seria desperdicio).
// ==============================================================================
export default function DsaGraficos({ dados }: { dados: DadosHistoricos }) {
  const figuras = useMemo(
    () => [dsaPlotStockPrice(dados), dsaPlotCandlestick(dados), dsaPlotMediaMovel(dados), dsaPlotVolume(dados)],
    [dados],
  );
  return (
    <>
      {figuras.map((figura, i) => (
        <DsaPlotly key={i} figura={figura} />
      ))}
    </>
  );
}
