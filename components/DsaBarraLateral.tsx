// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: components/DsaBarraLateral.tsx
// Corresponde a tudo que o dsa_app.py fazia com st.sidebar.*: instrucoes,
// caixa "Escolha o LLM", mensagem de confirmacao e botao Suporte.
"use client";

import { useState } from "react";
import { DsaMarkdown } from "./DsaMarkdown";
import type { ProvedorDisponivel } from "@/lib/dsa-tipos";

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// st.sidebar.title("Instruções")
// st.sidebar.markdown("""
// ### Como Utilizar a App:
// ...
// """)
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: O texto e o mesmo, so trocou de arquivo. Fica numa constante para nao
//               poluir o JSX. A mencao a "modelo DeepSeek atraves do Groq e
//               infraestrutura AWS" e do material original; mantivemos por fidelidade.
// ==============================================================================
const DSA_INSTRUCOES = `
### Como Utilizar a App:

- Insira o símbolo do ticker da ação desejada no campo central.
- Clique no botão **Analisar** para obter a análise em tempo real com visualizações e insights gerados por IA.

### Exemplos de tickers válidos:
- MSFT (Microsoft)
- TSLA (Tesla)
- AMZN (Amazon)
- GOOG (Alphabet)

Mais tickers podem ser encontrados aqui: https://stockanalysis.com/list/nasdaq-stocks/

### Finalidade da App:
Este aplicativo realiza análises avançadas de preços de ações da Nasdaq em tempo real utilizando Agentes de IA com modelo DeepSeek através do Groq e infraestrutura AWS para apoio a estratégias de Day Trade para monetização. Uma app completa de exemplo para quem deseja iniciar em Consultoria na Área de Dados e IA.
`;

// As "props": o que a pagina passa para a barra lateral. No Streamlit a barra
// lateral LIA e ESCREVIA variaveis globais (DSA_DISPONIVEIS, DSA_ESCOLHA); no
// React um componente recebe o que precisa por parametro e avisa mudancas por
// uma funcao (aoEscolher). E o fluxo "de cima para baixo" do React.
type Props = {
  provedores: ProvedorDisponivel[] | null;  // null = ainda carregando do servidor
  escolhido: string;                        // apelido do provedor selecionado
  aoEscolher: (apelido: string) => void;
};

export function DsaBarraLateral({ provedores, escolhido, aoEscolher }: Props) {
  // ==============================================================================
  // CODIGO ORIGINAL (Python -- mantido comentado para referencia)
  // ==============================================================================
  // if st.sidebar.button("Suporte"):
  //     st.sidebar.write("No caso de dúvidas envie e-mail para: suporte@datascienceacademy.com.br")
  //
  // ==============================================================================
  // VERSAO NODE.JS
  // O que mudou: st.button devolvia True so na execucao em que foi clicado. No React, um
  //               clique muda um ESTADO (useState) e o componente se redesenha lendo esse
  //               estado. useState(false) -> [valor atual, funcao para mudar].
  // ==============================================================================
  const [mostraSuporte, setMostraSuporte] = useState(false);

  // O provedor escolhido, para a mensagem de confirmacao abaixo da caixa.
  const atual = provedores?.find((p) => p.apelido === escolhido);

  return (
    <aside className="dsa-lateral">
      <h2>Instruções</h2>
      <DsaMarkdown texto={DSA_INSTRUCOES} />

      {/* ==============================================================================
          CODIGO ORIGINAL (Python -- mantido comentado para referencia)
          ==============================================================================
          st.sidebar.markdown("### Motor de IA")
          DSA_DISPONIVEIS = dsa_provedores_disponiveis()
          if not DSA_DISPONIVEIS:
              st.sidebar.error("**Nenhum motor de IA disponivel.** ...")
              st.stop()
          DSA_ESCOLHA = st.sidebar.selectbox(
              "Escolha o LLM",
              options=[apelido for apelido, _, _ in DSA_DISPONIVEIS],
              format_func=lambda apelido: "Ollama (local, sem chave)" if apelido == "Ollama" else apelido,
              key="dsa_provedor_escolhido",
              help="So aparecem os provedores com chave de API preenchida no arquivo .env.",
          )
          ==============================================================================
          VERSAO NODE.JS
          O que mudou: A lista vem por props (a pagina buscou em GET /api/provedores).
                        st.selectbox vira um <select> HTML comum: options = <option>,
                        format_func = o texto dentro de cada <option>, key = desnecessario
                        (o React guarda o estado sozinho), help = atributo title.
                        O st.stop() vira "desenhar a caixa de erro e pronto": a pagina
                        desabilita o botao Analisar quando a lista esta vazia.
          ============================================================================== */}
      <h3>Motor de IA</h3>

      {provedores === null && <p className="dsa-spinner">Procurando motores de IA...</p>}

      {provedores !== null && provedores.length === 0 && (
        <div className="dsa-caixa dsa-caixa-erro">
          <DsaMarkdown
            texto={
              "**Nenhum motor de IA disponivel.**\n\n" +
              "Preencha pelo menos uma chave de API no arquivo `.env` (rodando local) ou em " +
              "*Settings > Environment Variables* (Vercel), ou inicie o Ollama na sua maquina. " +
              "Depois, reinicie o app."
            }
          />
        </div>
      )}

      {provedores !== null && provedores.length > 0 && (
        <>
          <label htmlFor="dsa-select-llm">Escolha o LLM</label>
          <select
            id="dsa-select-llm"
            className="dsa-select"
            value={escolhido}
            onChange={(evento) => aoEscolher(evento.target.value)}
            title="So aparecem os provedores com chave de API preenchida no arquivo .env."
          >
            {provedores.map((p) => (
              <option key={p.apelido} value={p.apelido}>
                {p.apelido === "Ollama" ? "Ollama (local, sem chave)" : p.apelido}
              </option>
            ))}
          </select>

          {/* ==============================================================================
              CODIGO ORIGINAL (Python -- mantido comentado para referencia)
              ==============================================================================
              if DSA_PROVEDOR != "Ollama":
                  st.sidebar.success(f"**{DSA_PROVEDOR}** - modelo `{DSA_MODELO}`")
              elif len(DSA_DISPONIVEIS) == 1:
                  st.sidebar.info("**Ollama** (local) ... Nenhuma chave de API foi encontrada ...")
              else:
                  st.sidebar.info("**Ollama** (local) ... Para respostas melhores, escolha um provedor com chave.")
              ==============================================================================
              VERSAO NODE.JS
              O que mudou: Mesmas tres situacoes, mesmos textos. st.success/st.info viram
                            <div> com as classes de cor do globals.css.
              ============================================================================== */}
          {atual && atual.apelido !== "Ollama" && (
            <div className="dsa-caixa dsa-caixa-sucesso">
              <DsaMarkdown texto={`**${atual.apelido}** - modelo \`${atual.modelo}\``} />
            </div>
          )}
          {atual && atual.apelido === "Ollama" && provedores.length === 1 && (
            <div className="dsa-caixa dsa-caixa-info">
              <DsaMarkdown
                texto={
                  `**Ollama** (local) - modelo \`${atual.modelo}\`\n\n` +
                  "Nenhuma chave de API foi encontrada no arquivo `.env`, entao o app esta usando o modelo " +
                  "que roda na sua propria maquina. E gratuito e funciona, mas modelos pequenos erram bem " +
                  "mais em analise financeira."
                }
              />
            </div>
          )}
          {atual && atual.apelido === "Ollama" && provedores.length > 1 && (
            <div className="dsa-caixa dsa-caixa-info">
              <DsaMarkdown
                texto={
                  `**Ollama** (local) - modelo \`${atual.modelo}\`\n\n` +
                  "Gratuito e sem cota, mas modelos pequenos erram bem mais em analise financeira. " +
                  "Para respostas melhores, escolha um provedor com chave."
                }
              />
            </div>
          )}
        </>
      )}

      {/* Botao de suporte na barra lateral */}
      <button type="button" className="dsa-botao" onClick={() => setMostraSuporte(true)}>
        Suporte
      </button>
      {mostraSuporte && <p>No caso de dúvidas envie e-mail para: suporte@datascienceacademy.com.br</p>}
    </aside>
  );
}
