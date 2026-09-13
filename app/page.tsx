// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: app/page.tsx
// Corresponde a secao "########## App Web ##########" do dsa_app.py: a tela
// principal, o campo do ticker, o botao Analisar e a exibicao dos resultados.
//
// ==============================================================================
// COMO LER ESTE ARQUIVO (a diferenca central entre Streamlit e React)
// ==============================================================================
// O Streamlit executa o script INTEIRO, de cima para baixo, a cada clique. O
// "estado" era o que estava nas variaveis naquele momento, e um 'if st.button'
// so era verdadeiro na execucao em que o botao foi clicado.
//
// O React NAO reexecuta nada sozinho. A pagina guarda ESTADO em variaveis
// especiais (useState). Quando um estado muda -- o usuario digitou, a resposta
// chegou -- o React redesenha SO a parte da tela que depende dele. O fluxo do
// botao Analisar, que no Python era um bloco 'if' com 100 linhas dentro, aqui
// vira uma funcao (dsaAnalisar) que vai mudando o estado conforme as
// respostas chegam, e o JSX la embaixo desenha o que o estado diz.
//
// "use client": esta pagina tem estado e reage a cliques, entao roda no
// NAVEGADOR. O layout (app/layout.tsx) e as rotas (app/api/) rodam no servidor.
// ==============================================================================
"use client";

import { useEffect, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { DsaBarraLateral } from "@/components/DsaBarraLateral";
import { DsaMarkdown } from "@/components/DsaMarkdown";
import type {
  DadosHistoricos,
  ProvedorDisponivel,
  RespostaAnalise,
  RespostaErro,
  RespostaProvedores,
} from "@/lib/dsa-tipos";

// O componente de graficos e carregado SO no navegador (ssr: false): o Plotly
// nao roda no servidor (precisa de window/document), e o Next.js por padrao
// pre-renderiza os componentes no servidor. 'dynamic' tambem faz o 1,2 MB do
// Plotly ser baixado apenas quando os graficos forem realmente exibidos.
const DsaGraficos = dynamic(() => import("@/components/DsaGraficos"), {
  ssr: false,
  loading: () => <p className="dsa-spinner">Carregando gráficos...</p>,
});

// As fases pelas quais uma analise passa. No Python isso era implicito na
// ordem das linhas dentro do 'with st.spinner(...)'.
type Fase = "ocioso" | "buscando-dados" | "analisando" | "pronto";

export default function Home() {
  // ---------- Estado da pagina ----------
  const [provedores, setProvedores] = useState<ProvedorDisponivel[] | null>(null); // null = carregando
  const [provedorEscolhido, setProvedorEscolhido] = useState("");
  const [ticker, setTicker] = useState("");
  const [fase, setFase] = useState<Fase>("ocioso");
  const [dados, setDados] = useState<DadosHistoricos | null>(null);
  const [analise, setAnalise] = useState<RespostaAnalise | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // ==============================================================================
  // CODIGO ORIGINAL (Python -- mantido comentado para referencia)
  // ==============================================================================
  // DSA_DISPONIVEIS = dsa_provedores_disponiveis()                       # passo 1
  // ...
  // DSA_PROVEDOR, DSA_CHAVE, DSA_MODELO = next(                          # passo 3
  //     p for p in DSA_DISPONIVEIS if p[0] == DSA_ESCOLHA
  // )
  //
  // ==============================================================================
  // VERSAO NODE.JS
  // O que mudou: A lista de provedores mora no servidor (e o .env dele). O navegador a
  //               pede UMA vez, quando a pagina abre: e o que useEffect com [] faz --
  //               roda so na primeira exibicao. A primeira opcao vira o padrao, como no
  //               selectbox. A chave (DSA_CHAVE) nao existe aqui: nunca chega ao navegador.
  // ==============================================================================
  useEffect(() => {
    fetch("/api/provedores")
      .then((resposta) => resposta.json() as Promise<RespostaProvedores>)
      .then(({ provedores }) => {
        setProvedores(provedores);
        if (provedores.length > 0) setProvedorEscolhido(provedores[0].apelido);
      })
      .catch(() => setProvedores([])); // servidor fora do ar = mesma tela de "nenhum motor"
  }, []);

  // ==============================================================================
  // CODIGO ORIGINAL (Python -- mantido comentado para referencia)
  // ==============================================================================
  // # Caixa de texto para input do usuário
  // ticker = st.text_input("Digite o Código (símbolo do ticker):").upper()
  //
  // # Se o usuário pressionar o botão, entramos neste bloco
  // if st.button("Analisar"):
  //     if ticker:
  //         with st.spinner("Buscando os Dados em Tempo Real. Aguarde..."):
  //             hist = dsa_extrai_dados(ticker)
  //             if hist.empty: st.error(...); st.stop()
  //             st.subheader("Análise Gerada Por IA")
  //             ai_response, erro_llm = dsa_roda_agentes(...)
  //             if erro_llm is not None: st.error(...); st.stop()
  //             st.markdown(clean_response)
  //             st.subheader("Visualização dos Dados")
  //             dsa_plot_stock_price(hist, ticker)
  //             ... (mais 3 graficos)
  //     else:
  //         st.error("Ticker inválido. Insira um símbolo de ação válido.")
  //
  // ==============================================================================
  // VERSAO NODE.JS
  // O que mudou: O bloco do botao vira a funcao dsaAnalisar, com DUAS chamadas ao servidor:
  //               1) GET /api/dados: rapida (~1 s). Se o ticker nao existe, paramos aqui,
  //                  como o 'if hist.empty' -- sem gastar LLM.
  //               2) POST /api/analisar: lenta (30-90 s), o time de agentes.
  //               Diferenca de experiencia: os GRAFICOS aparecem assim que (1) responde,
  //               enquanto (2) ainda roda. No Streamlit o usuario esperava tudo para ver
  //               qualquer coisa. E se (2) falhar, os graficos continuam na tela (no
  //               Streamlit o st.stop() apagava tudo).
  // ==============================================================================
  async function dsaAnalisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); // o <form> nao deve recarregar a pagina (comportamento padrao do HTML)

    const simbolo = ticker.trim().toUpperCase();
    if (!simbolo) {
      setErro("Ticker inválido. Insira um símbolo de ação válido.");
      return;
    }

    // Limpa a rodada anterior e entra na fase 1.
    setErro(null);
    setDados(null);
    setAnalise(null);
    setFase("buscando-dados");

    // ---- (1) historico de precos ----
    const respostaDados = await fetch(`/api/dados?ticker=${encodeURIComponent(simbolo)}`);
    if (!respostaDados.ok) {
      const { erro } = (await respostaDados.json()) as RespostaErro;
      setErro(erro);
      setFase("ocioso");
      return;
    }
    setDados((await respostaDados.json()) as DadosHistoricos);
    setFase("analisando");

    // ---- (2) analise pelos agentes de IA ----
    const respostaAnalise = await fetch("/api/analisar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: simbolo, provedor: provedorEscolhido }),
    });
    if (!respostaAnalise.ok) {
      const { erro } = (await respostaAnalise.json()) as RespostaErro;
      setErro(erro);
    } else {
      setAnalise((await respostaAnalise.json()) as RespostaAnalise);
    }
    setFase("pronto");
  }

  // Enquanto uma analise roda, o botao fica desabilitado (o Streamlit fazia o
  // mesmo: a tela inteira ficava "em execucao"). Tambem desabilitamos quando
  // nao ha motor de IA -- o equivalente ao st.stop() da barra lateral.
  const ocupado = fase === "buscando-dados" || fase === "analisando";
  const semMotor = provedores === null || provedores.length === 0;

  // ---------- A tela ----------
  // JSX: parece HTML, mas e JavaScript. { } abre uma expressao; 'cond && <X/>'
  // desenha X so se cond for verdadeiro -- e o 'if' do Streamlit em forma de
  // expressao.
  return (
    <div className="dsa-app">
      <DsaBarraLateral provedores={provedores} escolhido={provedorEscolhido} aoEscolher={setProvedorEscolhido} />

      <main className="dsa-principal">
        {/* st.title(":100: Data Science Academy") */}
        <h1>💯 Data Science Academy</h1>

        {/* st.header("Day Trade Analytics em Tempo Real com Agentes de IA") */}
        <h2>Day Trade Analytics em Tempo Real com Agentes de IA</h2>

        <form className="dsa-form" onSubmit={dsaAnalisar}>
          <label htmlFor="dsa-ticker">Digite o Código (símbolo do ticker):</label>
          <input
            id="dsa-ticker"
            className="dsa-entrada"
            type="text"
            value={ticker}
            onChange={(evento) => setTicker(evento.target.value)}
            placeholder="MSFT"
            autoComplete="off"
            disabled={ocupado}
          />
          <button type="submit" className="dsa-botao" disabled={ocupado || semMotor}>
            Analisar
          </button>
        </form>

        {/* with st.spinner("Buscando os Dados em Tempo Real. Aguarde...") */}
        {fase === "buscando-dados" && <p className="dsa-spinner">Buscando os Dados em Tempo Real. Aguarde...</p>}

        {/* st.error(...) -- qualquer erro da rodada, em Markdown */}
        {erro && (
          <div className="dsa-caixa dsa-caixa-erro">
            <DsaMarkdown texto={erro} />
          </div>
        )}

        {dados && (
          <>
            {/* st.subheader("Análise Gerada Por IA") */}
            <h3>Análise Gerada Por IA</h3>
            {fase === "analisando" && (
              <p className="dsa-spinner">
                Os Agentes de IA estão analisando {dados.ticker} (isto leva de 30 a 90 segundos). Aguarde...
              </p>
            )}
            {analise && (
              <>
                {/* st.markdown(clean_response) */}
                <DsaMarkdown texto={analise.analise} />
                <p>
                  <small>
                    Análise gerada por <strong>{analise.provedor}</strong> (modelo <code>{analise.modelo}</code>).
                  </small>
                </p>
              </>
            )}

            {/* st.subheader("Visualização dos Dados") + os 4 graficos */}
            <h3>Visualização dos Dados</h3>
            <DsaGraficos dados={dados} />
          </>
        )}
      </main>
    </div>
  );
}

// Fim
// Obrigado DSA!
