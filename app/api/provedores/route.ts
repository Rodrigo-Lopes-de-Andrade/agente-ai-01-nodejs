// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: app/api/provedores/route.ts
// Rota: GET /api/provedores
//
// ==============================================================================
// O QUE E UMA ROTA DE API (route.ts)
// ==============================================================================
// No Next.js, um arquivo chamado route.ts dentro de app/api/<nome>/ vira um
// endereco HTTP: este aqui responde em http://localhost:3000/api/provedores.
// Cada funcao exportada com nome de metodo HTTP (GET, POST...) atende esse
// metodo. O codigo roda no SERVIDOR (Node.js) -- na Vercel, vira uma funcao
// serverless. E o unico lugar onde as chaves de API existem.
//
// No Streamlit nao havia rotas: a barra lateral chamava
// dsa_provedores_disponiveis() diretamente, porque tela e logica moravam no
// mesmo processo. Aqui a tela (navegador) precisa PERGUNTAR ao servidor quais
// provedores existem -- e o servidor responde com a lista SEM as chaves.
// ==============================================================================

import { dsaProvedoresDisponiveis } from "@/lib/dsa-provedores";
import type { RespostaProvedores } from "@/lib/dsa-tipos";

// Diz ao Next.js para nunca guardar esta resposta em cache de build: a lista
// depende do .env e do Ollama estar ou nao no ar, que so se sabe na hora.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const configurados = await dsaProvedoresDisponiveis();

  // Do objeto completo (com chave) sai so o par { apelido, modelo }. Este
  // .map() e a fronteira de seguranca do app: o que nao esta aqui nao vai
  // para o navegador.
  const resposta: RespostaProvedores = {
    provedores: configurados.map(({ apelido, modelo }) => ({ apelido, modelo })),
  };
  return Response.json(resposta);
}
