// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: lib/dsa-agentes.ts
// Corresponde a secao "########## Agentes de IA ##########" do dsa_app.py e as
// funcoes dsa_segundos_de_espera / dsa_roda_agentes e a cadeia de st.error()
// que ficavam dentro do botao "Analisar".
//
// Este arquivo roda SO NO SERVIDOR.

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// from phi.agent import Agent
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: phidata (Python) vira o AI SDK da Vercel (Node.js). A classe Agent do
//               phidata corresponde ao ToolLoopAgent do AI SDK: um agente que recebe um
//               modelo, instrucoes e ferramentas, e fica num LACO (loop) "pensa -> chama
//               ferramenta -> le o resultado -> pensa de novo" ate ter a resposta final.
//               O nome e literal: "agente de laco de ferramentas".
// ==============================================================================
import { ToolLoopAgent, tool, stepCountIs, APICallError, RetryError, type ToolExecutionStartEvent, type ToolSet } from "ai";
import { z } from "zod";
import { dsaCriaModelo, type ProvedorConfigurado } from "./dsa-provedores";
import { dsaFerramentasDuckDuckGo, dsaFerramentasYFinance } from "./dsa-ferramentas";

// Quantas vezes, no maximo, um agente pode ir e voltar do modelo numa unica
// pergunta. Protege contra o modelo que fica chamando ferramentas para sempre.
// O phidata nao tinha esse limite explicito (usava um padrao interno).
const DSA_MAX_PASSOS = 10;

/**
 * Monta o texto de instrucoes ("system prompt") de um agente.
 *
 * No phidata, instructions=[...] virava uma lista de regras no system prompt,
 * e markdown=True acrescentava "use markdown". Aqui fazemos o mesmo, na mao.
 */
function dsaInstrucoes(regras: string[]): string {
  return [
    "Siga estas instrucoes:",
    ...regras.map((r) => `- ${r}`),
    "- Use markdown to format your answers.",   // o que markdown=True fazia
  ].join("\n");
}

/**
 * Imprime no terminal cada ferramenta que um agente esta prestes a chamar.
 *
 * Equivale ao show_tool_calls=True do phidata, com uma diferenca importante:
 * o phidata escrevia isso DENTRO da resposta (o bloco "Running: ..." que o
 * dsa_app.py precisava limpar com regex). Aqui vai para o console do servidor
 * -- o terminal do 'npm run dev', ou a aba Logs do projeto na Vercel -- e a
 * resposta chega limpa. O regex de limpeza deixou de existir.
 *
 * E ligada pelo callback onToolExecutionStart de generate(), que dispara
 * ANTES de a ferramenta rodar -- por isso as linhas do log aparecem na ordem
 * em que as coisas acontecem.
 *
 * O "<T extends ToolSet>" significa: "funciona para qualquer conjunto de
 * ferramentas". Cada agente tem ferramentas diferentes, e o TypeScript exige
 * que a funcao diga que aceita todas elas -- e o generico faz isso.
 */
function dsaMostraChamada<T extends ToolSet>(nomeDoAgente: string, evento: ToolExecutionStartEvent<T>): void {
  console.log(`   [${nomeDoAgente}] Running: ${evento.toolCall.toolName}(${JSON.stringify(evento.toolCall.input)})`);
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// dsa_agente_web_search = Agent(name="DSA Agente Web Search",
//                               role="Fazer busca na web",
//                               model=dsa_cria_modelo(),
//                               tools=[DSADuckDuckGo()],
//                               instructions=["Sempre inclua as fontes"],
//                               show_tool_calls=True, markdown=True)
//
// dsa_agente_financeiro = Agent(name="DSA Agente Financeiro",
//                               model=dsa_cria_modelo(),
//                               tools=[YFinanceTools(stock_price=True,
//                                                    analyst_recommendations=True,
//                                                    stock_fundamentals=True,
//                                                    company_news=True)],
//                               instructions=["Use tabelas para mostrar os dados"],
//                               show_tool_calls=True, markdown=True)
//
// multi_ai_agent = Agent(team=[dsa_agente_web_search, dsa_agente_financeiro],
//                        model=dsa_cria_modelo(),
//                        instructions=["Sempre inclua as fontes", "Use tabelas para mostrar os dados"],
//                        show_tool_calls=True, markdown=True)
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: Os tres agentes sao os mesmos: mesmos nomes, mesmas instrucoes, mesmas
//               ferramentas. A diferenca esta no TIME. O phidata tinha o parametro
//               "team=[...]": por tras dele, o framework criava no agente lider uma
//               ferramenta "transfer_task_to_<nome>" para cada membro. O AI SDK nao tem
//               "team", entao fazemos essa parte na mao -- e ela cabe em 15 linhas
//               (dsaFerramentaDeTransferencia). O ganho e didatico: agora da para VER
//               como um time de agentes funciona por dentro. Um agente e apenas uma
//               ferramenta na mao de outro agente.
//
//               Os agentes sao criados dentro de uma FUNCAO, e nao no topo do arquivo,
//               pelo mesmo motivo de dsaCriaModelo(): o provedor e escolhido a cada
//               requisicao, entao o time precisa ser montado a cada requisicao.
// ==============================================================================

/**
 * Cria a ferramenta "transfer_task_to_<agente>" que o lider usa para delegar.
 *
 * E aqui que um agente vira ferramenta de outro. Quando o lider chama esta
 * ferramenta, o 'execute' roda o agente membro do inicio ao fim (com o
 * proprio laco de ferramentas dele) e devolve o texto final ao lider.
 * Os nomes dos parametros (task_description, expected_output) e o texto da
 * descricao seguem os do phidata.
 */
function dsaFerramentaDeTransferencia<T extends ToolSet>(nome: string, papel: string, agente: ToolLoopAgent<never, T>) {
  return tool({
    description:
      `Use this function to transfer a task to ${nome}. Role of ${nome}: ${papel}. ` +
      `The response of ${nome} is returned as the result. Always provide a clear task description.`,
    inputSchema: z.object({
      task_description: z.string().describe("A clear and concise description of the task the agent should achieve."),
      expected_output: z.string().describe("The expected output from the agent."),
    }),
    execute: async ({ task_description, expected_output }) => {
      const resultado = await agente.generate({
        prompt: `${task_description}\n\nExpected output: ${expected_output}`,
        onToolExecutionStart: (evento) => dsaMostraChamada(nome, evento),
      });
      return resultado.text;
    },
  });
}

/**
 * Monta o time de agentes para o provedor escolhido e devolve o LIDER
 * (o multi_ai_agent do capitulo). Para usar: time.generate({ prompt }).
 *
 * Nao declaramos o tipo de retorno de proposito: o TypeScript o deduz a
 * partir do 'return', incluindo a lista exata de ferramentas do lider.
 */
export function dsaCriaTimeDeAgentes(provedor: ProvedorConfigurado) {
  // Um unico objeto de modelo para os tres agentes (ver dsaCriaModelo).
  const modelo = dsaCriaModelo(provedor);

  // Agente 1: busca na web. Repare no que mudou: apenas o formato.
  const dsaAgenteWebSearch = new ToolLoopAgent({
    id: "dsa_agente_web_search",
    model: modelo,
    instructions: dsaInstrucoes(["Sempre inclua as fontes"]),
    tools: dsaFerramentasDuckDuckGo,
    stopWhen: stepCountIs(DSA_MAX_PASSOS),
  });

  // Agente 2: dados financeiros.
  const dsaAgenteFinanceiro = new ToolLoopAgent({
    id: "dsa_agente_financeiro",
    model: modelo,
    instructions: dsaInstrucoes(["Use tabelas para mostrar os dados"]),
    tools: dsaFerramentasYFinance,
    stopWhen: stepCountIs(DSA_MAX_PASSOS),
  });

  // Agente 3: o lider. As ferramentas dele SAO os outros dois agentes.
  // O texto "You are the leader of a team..." e o que o phidata colocava no
  // system prompt quando recebia team=[...].
  const multiAiAgent = new ToolLoopAgent({
    id: "multi_ai_agent",
    model: modelo,
    instructions:
      "You are the leader of a team of AI Agents. You can either respond directly or " +
      "transfer tasks to the agents in your team depending on the tools available to them. " +
      "After a transfer, use the agent's response to compose your final answer.\n\n" +
      dsaInstrucoes(["Sempre inclua as fontes", "Use tabelas para mostrar os dados"]),
    tools: {
      transfer_task_to_dsa_agente_web_search: dsaFerramentaDeTransferencia(
        "DSA Agente Web Search",
        "Fazer busca na web",            // o role= do agente original
        dsaAgenteWebSearch,
      ),
      transfer_task_to_dsa_agente_financeiro: dsaFerramentaDeTransferencia(
        "DSA Agente Financeiro",
        "Consultar preco atual, recomendacoes de analistas, fundamentos e noticias de uma acao no Yahoo Finance",
        dsaAgenteFinanceiro,
      ),
    },
    stopWhen: stepCountIs(DSA_MAX_PASSOS),
  });

  return multiAiAgent;
}

// ==============================================================================
// EXECUCAO COM REPETICAO E TRATAMENTO DE ERROS
// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// DSA_ESPERA_MAXIMA = 120.0
//
// def dsa_segundos_de_espera(mensagem_de_erro, padrao=15.0):
//     achado = re.search(r"try again in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s", mensagem_de_erro)
//     if not achado:
//         return padrao
//     horas = int(achado.group(1) or 0)
//     minutos = int(achado.group(2) or 0)
//     segundos = float(achado.group(3) or 0)
//     return horas * 3600 + minutos * 60 + segundos
//
// def dsa_roda_agentes(pergunta, tentativas=4):
//     for tentativa in range(1, tentativas + 1):
//         try:
//             return multi_ai_agent.run(pergunta), None
//         except Exception as erro:
//             texto = str(erro)
//             eh_limite = ("rate_limit" in texto) or ("429" in texto)
//             eh_ferramenta = ("tool_use_failed" in texto) or ("was not in request.tools" in texto)
//             if not (eh_limite or eh_ferramenta) or tentativa == tentativas:
//                 return None, erro
//             if eh_ferramenta:
//                 st.warning(...); continue
//             espera = dsa_segundos_de_espera(texto)
//             if espera > DSA_ESPERA_MAXIMA:
//                 return None, erro
//             st.warning(...); time.sleep(espera)
//     return None, None
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: Metade do trabalho sumiu. O AI SDK ja repete sozinho as chamadas que
//               falham com LIMITE DE USO (429) ou erro de servidor: 'maxRetries' (padrao
//               2) com espera crescente, respeitando o cabecalho Retry-After que o
//               provedor manda (ate 60 s). Isso cobre o limite POR MINUTO. O limite
//               DIARIO (horas de espera) continua estourando -- e, como no Python, nao
//               faz sentido esperar dentro do app: explicamos ao usuario.
//
//               O que o AI SDK NAO repete e o erro de FERRAMENTA INVENTADA (400 --
//               "tool_use_failed"), porque 400 significa "pedido invalido" e, em geral,
//               repetir um pedido invalido nao adianta. Aqui e a excecao: o pedido
//               invalido foi gerado pelo proprio modelo, por sorteio. Entao esse laco
//               ficou, so que menor.
// ==============================================================================

// Limite acima do qual NAO adianta esperar dentro do app (2 minutos).
const DSA_ESPERA_MAXIMA = 120;

/**
 * Le quantos segundos o provedor pediu para esperar antes de tentar de novo.
 *
 * A mensagem vem em formatos diferentes: "try again in 6.31s", "in 1m30s" e
 * ate "in 4h30m36.288s" (quando o limite estourado e o DIARIO). Ler so os
 * segundos faria o app esperar 15 s quando deveria esperar horas.
 */
export function dsaSegundosDeEspera(mensagemDeErro: string, padrao = 15): number {
  const achado = mensagemDeErro.match(/try again in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/);
  if (!achado) return padrao;
  const horas = Number(achado[1] ?? 0);
  const minutos = Number(achado[2] ?? 0);
  const segundos = Number(achado[3] ?? 0);
  return horas * 3600 + minutos * 60 + segundos;
}

/**
 * Desembrulha o erro ate a causa original.
 *
 * Quando o AI SDK esgota os retries, ele lanca um RetryError que EMBRULHA o
 * erro real (lastError). E o erro real, um APICallError, que tem o codigo
 * HTTP (statusCode) e o corpo da resposta do provedor.
 */
export function dsaCausaRaiz(erro: unknown): unknown {
  return RetryError.isInstance(erro) ? erro.lastError : erro;
}

/** Junta codigo HTTP, mensagem e corpo da resposta num texto so, para as buscas por palavra. */
export function dsaTextoDoErro(erro: unknown): string {
  const causa = dsaCausaRaiz(erro);
  if (APICallError.isInstance(causa)) {
    return `${causa.statusCode ?? ""} ${causa.message} ${causa.responseBody ?? ""}`;
  }
  return causa instanceof Error ? causa.message : String(causa);
}

/**
 * Chama o time de agentes, repetindo so o erro de ferramenta inventada.
 *
 * De vez em quando o modelo pede uma ferramenta que nao existe -- por exemplo
 * "duckduckgo_open", que ele conhece de outros contextos. O provedor recusa
 * a requisicao inteira com erro 400. Como isso e sorteio, repetir quase
 * sempre resolve. E como pedir informacao a um atendente muito rapido: as
 * vezes ele fala rapido demais e erra o nome do formulario. Voce so pede de
 * novo.
 *
 * Devolve { texto, erro }: um dos dois e sempre null.
 */
export async function dsaRodaAgentes<T extends ToolSet>(
  time: ToolLoopAgent<never, T>,
  pergunta: string,
  tentativas = 4,
): Promise<{ texto: string | null; erro: unknown }> {
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      const resultado = await time.generate({
        prompt: pergunta,
        onToolExecutionStart: (evento) => dsaMostraChamada("multi_ai_agent", evento),
      });
      // resultado.text e SO o texto do ultimo passo do lider: sem os blocos
      // "Running:" nem as linhas "transfer_task_to_..." que o phidata misturava.
      return { texto: resultado.text, erro: null };
    } catch (erro) {
      const texto = dsaTextoDoErro(erro);
      const ehFerramenta = texto.includes("tool_use_failed") || texto.includes("was not in request.tools");
      if (!ehFerramenta || tentativa === tentativas) {
        return { texto: null, erro };
      }
      console.warn(
        `O modelo pediu uma ferramenta que nao existe (tentativa ${tentativa} de ${tentativas}). Tentando de novo...`,
      );
    }
  }
  return { texto: null, erro: null };
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// (a cadeia de if/elif com st.error(...) logo apos dsa_roda_agentes)
//   if erro_llm is not None:
//       detalhe = str(erro_llm)
//       if ("rate_limit" in detalhe) or ("429" in detalhe):      -> cota diaria / limite por minuto
//       elif ("tool_use_failed" in detalhe) or ...               -> ferramenta inventada
//       elif ("model_not_found" in detalhe) or ("404" in detalhe) -> modelo nao existe mais
//       elif ("api_key" in detalhe.lower()) or ("401" in detalhe) -> chave recusada
//       else:                                                     -> falha generica
//       st.stop()
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: As mensagens sao as mesmas, palavra por palavra onde fazia sentido. A
//               diferenca e que aqui a funcao DEVOLVE a mensagem (em Markdown) e um
//               codigo HTTP, em vez de desenha-la na tela: quem desenha e o navegador.
//               O codigo HTTP conta ao navegador que a analise falhou (429 = limite de
//               uso; 502 = o provedor de IA nao respondeu como deveria).
//               Ganhou um caso novo: Ollama fora do ar (o Streamlit so oferecia o Ollama
//               se ele estivesse no ar, mas ele pode cair entre a lista e a analise).
// ==============================================================================

export type ErroExplicado = { status: number; mensagem: string };

/**
 * Traduz o erro do provedor numa explicacao com causa e solucao.
 *
 * Dizer "deu erro" nao ajuda ninguem; dizer QUAL erro e o que fazer a
 * respeito, sim.
 */
export function dsaExplicaErro(erro: unknown, provedor: ProvedorConfigurado): ErroExplicado {
  const detalhe = dsaTextoDoErro(erro);
  const original = `\n\nMensagem original: \`${detalhe.slice(0, 300).replace(/\s+/g, " ")}\``;

  if (detalhe.includes("rate_limit") || detalhe.includes("429")) {
    const espera = dsaSegundosDeEspera(detalhe, 0);
    const cotaDiaria = detalhe.includes("per day") || detalhe.includes("TPD") || espera > DSA_ESPERA_MAXIMA;
    if (cotaDiaria) {
      const quanto = espera ? `${(espera / 3600).toFixed(1)} hora(s)` : "algumas horas";
      return {
        status: 429,
        mensagem:
          `**Cota DIARIA do provedor ${provedor.apelido} esgotada.**\n\n` +
          `O provedor pediu para tentar novamente em ${quanto}. Esperar dentro do app nao ajuda. ` +
          "As saidas sao: escolher outro provedor na barra lateral (basta ter a chave dele no `.env` " +
          "ou nas variaveis de ambiente da Vercel), usar o Ollama local (que nao tem cota), ou aumentar " +
          "o plano no painel do provedor." + original,
      };
    }
    return {
      status: 429,
      mensagem:
        `**Limite por minuto do provedor ${provedor.apelido} atingido.**\n\n` +
        "Um time de agentes faz varias chamadas ao modelo para responder uma unica pergunta. " +
        "Espere um minuto e clique em Analisar de novo, ou escolha um modelo menor no `.env`." + original,
    };
  }

  if (detalhe.includes("tool_use_failed") || detalhe.includes("was not in request.tools")) {
    return {
      status: 502,
      mensagem:
        "**O modelo insistiu em usar uma ferramenta que nao existe.**\n\n" +
        "Isso acontece de vez em quando e costuma passar na tentativa seguinte. Clique em Analisar " +
        "novamente. Se insistir, troque o modelo no `.env` por outro da lista de `npm run modelos`." + original,
    };
  }

  // A Groq responde 400 "decommissioned" para modelo aposentado; a OpenAI, 404 "does not exist".
  if (
    detalhe.includes("model_not_found") || detalhe.includes("does not exist") ||
    detalhe.includes("decommissioned") || detalhe.includes("404")
  ) {
    return {
      status: 502,
      mensagem:
        `**O modelo \`${provedor.modelo}\` nao existe mais no provedor ${provedor.apelido}.**\n\n` +
        "Provedores aposentam modelos o tempo todo -- foi exatamente o que aconteceu com os dois modelos " +
        "originais deste capitulo. Rode `npm run modelos` para ver os nomes validos hoje e ajuste o `.env` " +
        "(ou as variaveis de ambiente da Vercel)." + original,
    };
  }

  if (detalhe.toLowerCase().includes("api key") || detalhe.toLowerCase().includes("api_key") ||
      detalhe.includes("401") || detalhe.includes("403")) {
    return {
      status: 502,
      mensagem:
        `**A chave de API do provedor ${provedor.apelido} foi recusada.**\n\n` +
        "Confira a chave no arquivo `.env` (sem espacos sobrando, sem aspas) e veja se ela continua " +
        "ativa no painel do provedor. Na Vercel, confira em Settings > Environment Variables e faca um " +
        "novo deploy: variaveis so valem para deploys feitos DEPOIS de salva-las." + original,
    };
  }

  if (provedor.apelido === "Ollama" && (detalhe.includes("ECONNREFUSED") || detalhe.includes("Cannot connect"))) {
    return {
      status: 502,
      mensagem:
        "**Nao consegui falar com o Ollama.**\n\n" +
        "O servidor local parou de responder depois que a lista de motores foi montada. Rode `ollama serve` " +
        "(ou confira o OLLAMA_HOST no `.env`) e tente de novo." + original,
    };
  }

  return {
    status: 502,
    mensagem:
      `**Falha ao falar com o provedor ${provedor.apelido} (modelo \`${provedor.modelo}\`).**` +
      `\n\nMensagem original: \`${detalhe.slice(0, 400).replace(/\s+/g, " ")}\``,
  };
}
