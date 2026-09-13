// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: app/api/analisar/route.ts
// Rota: POST /api/analisar   corpo: { "ticker": "MSFT", "provedor": "Groq" }
//
// E a segunda chamada do botao "Analisar": monta o time de agentes com o
// provedor escolhido, faz a pergunta do capitulo e devolve a analise em
// Markdown. E a chamada demorada (30 a 90 segundos, o tempo do LLM).

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// ai_response, erro_llm = dsa_roda_agentes(
//     f"Resumir a recomendação do analista e compartilhar as últimas notícias para {ticker}"
// )
// if erro_llm is not None:
//     ... st.error(<mensagem por tipo de erro>) ...
//     st.stop()
//
// clean_response = re.sub(r"(Running:[\s\S]*?\n\n)|(^\s*-?\s*transfer_task_to_\w+.*\n?)",
//                         "", ai_response.content, flags=re.MULTILINE).strip()
// st.markdown(clean_response)
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: (1) A pergunta e a mesma, palavra por palavra. (2) O erro vira uma
//               resposta HTTP com a mensagem explicada (dsaExplicaErro) em vez de
//               st.error + st.stop. (3) O re.sub de limpeza sumiu: o AI SDK devolve so o
//               texto final do lider; as chamadas de ferramenta vao para o log do
//               servidor. (4) Ganhou 'maxDuration': na Vercel, uma funcao serverless tem
//               tempo maximo de execucao, e o padrao poderia cortar a analise no meio.
// ==============================================================================

import { dsaProvedoresDisponiveis } from "@/lib/dsa-provedores";
import { dsaCriaTimeDeAgentes, dsaRodaAgentes, dsaExplicaErro } from "@/lib/dsa-agentes";
import type { RespostaAnalise, RespostaErro } from "@/lib/dsa-tipos";

export const dynamic = "force-dynamic";

// Tempo maximo (em segundos) que a Vercel deixa esta funcao rodar. O plano
// Hobby (gratuito) permite ate 300 s com o Fluid Compute, que e o padrao dos
// projetos novos; o plano Pro vai a 800 s. Um time de agentes leva de 30 a 90 s.
// Rodando local (npm run dev) este valor e ignorado.
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  // O corpo chega em JSON. Lemos com cuidado: um corpo vazio ou mal formado
  // nao pode derrubar a rota.
  let corpo: { ticker?: unknown; provedor?: unknown } = {};
  try {
    corpo = await request.json();
  } catch {
    // fica {} e cai na validacao abaixo
  }
  const ticker = typeof corpo.ticker === "string" ? corpo.ticker.trim().toUpperCase() : "";
  const apelido = typeof corpo.provedor === "string" ? corpo.provedor : "";

  if (!ticker) {
    const erro: RespostaErro = { erro: "Ticker inválido. Insira um símbolo de ação válido." };
    return Response.json(erro, { status: 400 });
  }

  // Descobrimos o provedor DE NOVO, no servidor, em vez de confiar no que o
  // navegador mandou: o navegador so conhece o apelido; a chave e o modelo
  // vem do .env. Se o apelido pedido nao existir (alguem editou a requisicao,
  // ou a chave foi removida), caimos no primeiro disponivel -- o mesmo padrao
  // da caixa de selecao.
  const disponiveis = await dsaProvedoresDisponiveis();
  const provedor = disponiveis.find((p) => p.apelido === apelido) ?? disponiveis[0];
  if (!provedor) {
    const erro: RespostaErro = {
      erro:
        "**Nenhum motor de IA disponivel.**\n\nPreencha pelo menos uma chave de API no arquivo `.env` " +
        "(rodando local) ou em Settings > Environment Variables (Vercel), ou inicie o Ollama na sua maquina.",
    };
    return Response.json(erro, { status: 503 });
  }

  console.log(`[/api/analisar] ${ticker} via ${provedor.apelido} (${provedor.modelo})`);

  // Monta o time para ESTE provedor e faz a pergunta do capitulo.
  const time = dsaCriaTimeDeAgentes(provedor);
  const { texto, erro } = await dsaRodaAgentes(
    time,
    `Resumir a recomendação do analista e compartilhar as últimas notícias para ${ticker}`,
  );

  if (erro !== null || texto === null) {
    const explicado = dsaExplicaErro(erro ?? new Error("resposta vazia"), provedor);
    console.error(`[/api/analisar] falha (${explicado.status}):`, explicado.mensagem.split("\n")[0]);
    const resposta: RespostaErro = { erro: explicado.mensagem };
    return Response.json(resposta, { status: explicado.status });
  }

  const resposta: RespostaAnalise = { analise: texto, provedor: provedor.apelido, modelo: provedor.modelo };
  return Response.json(resposta);
}
