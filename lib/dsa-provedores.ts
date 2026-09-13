// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: lib/dsa-provedores.ts
// Corresponde a secao "NOVO: SELETOR DE PROVEDOR DE LLM" do dsa_app.py.
//
// Este arquivo roda SO NO SERVIDOR (e importado apenas pelas rotas em app/api/).
// E aqui que as chaves de API sao lidas -- e e daqui que elas nunca saem.

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// from phi.model.groq import Groq
// from phi.model.openai import OpenAIChat
// from phi.model.anthropic import Claude
// from phi.model.xai import xAI
// from phi.model.ollama import Ollama
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: No phidata cada provedor era uma CLASSE (Groq, OpenAIChat...). No AI SDK
//               da Vercel cada provedor e um PACOTE (@ai-sdk/groq, @ai-sdk/openai...) que
//               exporta uma funcao "create<Provedor>". O Ollama nao tem pacote oficial:
//               usamos @ai-sdk/openai-compatible apontando para o endereco do Ollama, que
//               fala o mesmo protocolo da OpenAI (a mesma ideia da xAI no .env original).
// ==============================================================================
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createXai } from "@ai-sdk/xai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// # Comecos de texto que significam "o aluno ainda nao preencheu esta chave".
// DSA_PLACEHOLDERS = ("seu-", "sua-", "cole-", "coloque", "your-", "xxx", "<")
//
// def dsa_chave_valida(nome_da_variavel):
//     valor = (os.getenv(nome_da_variavel) or "").strip().strip('"').strip("'")
//     if not valor or valor.lower().startswith(DSA_PLACEHOLDERS):
//         return None
//     return valor
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: Traducao linha a linha. os.getenv(X) vira process.env[X]; a tupla vira um
//               array; startswith(tupla) vira .some(). Como o Next.js ja carregou o .env
//               em process.env, nao ha load_dotenv() em lugar nenhum.
// ==============================================================================

// Comecos de texto que significam "o aluno ainda nao preencheu esta chave".
export const DSA_PLACEHOLDERS = ["seu-", "sua-", "cole-", "coloque", "your-", "xxx", "<"];

/**
 * Devolve a chave de API se estiver mesmo preenchida; caso contrario, null.
 *
 * Uma chave ausente e uma chave com o texto de exemplo dao no mesmo: o
 * provedor deve ser pulado sem erro, como se nao existisse.
 */
export function dsaChaveValida(nomeDaVariavel: string): string | null {
  const valor = (process.env[nomeDaVariavel] ?? "")
    .trim()
    .replace(/^["']|["']$/g, ""); // tira aspas sobrando, como o .strip('"').strip("'")
  if (!valor || DSA_PLACEHOLDERS.some((inicio) => valor.toLowerCase().startsWith(inicio))) {
    return null;
  }
  return valor;
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// # Formato: (apelido, variavel da chave, variavel do modelo, modelo padrao)
// DSA_PROVEDORES = [
//     ("Groq",      "GROQ_API_KEY",      "GROQ_MODEL",      "openai/gpt-oss-120b"),
//     ("OpenAI",    "OPENAI_API_KEY",    "OPENAI_MODEL",    "gpt-4o-mini"),
//     ("Anthropic", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "claude-sonnet-4-5"),
//     ("Grok",      "XAI_API_KEY",       "XAI_MODEL",       "grok-4"),
// ]
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: A tupla posicional virou um objeto com nomes de campo -- em JavaScript e
//               o idioma natural, e evita o "p[0], p[1], p[2]" que o Python precisava.
//               O modelo padrao da Anthropic subiu de claude-sonnet-4-5 para claude-sonnet-5
//               (a familia atual). Os nomes mudam o tempo todo: 'npm run modelos' lista
//               os validos na SUA conta hoje.
// ==============================================================================

// Ordem de preferencia. A Groq vem primeiro por fidelidade ao capitulo original.
export const DSA_PROVEDORES = [
  { apelido: "Groq",      varChave: "GROQ_API_KEY",      varModelo: "GROQ_MODEL",      modeloPadrao: "openai/gpt-oss-120b" },
  { apelido: "OpenAI",    varChave: "OPENAI_API_KEY",    varModelo: "OPENAI_MODEL",    modeloPadrao: "gpt-4o-mini" },
  { apelido: "Anthropic", varChave: "ANTHROPIC_API_KEY", varModelo: "ANTHROPIC_MODEL", modeloPadrao: "claude-sonnet-5" },
  { apelido: "Grok",      varChave: "XAI_API_KEY",       varModelo: "XAI_MODEL",       modeloPadrao: "grok-4" },
] as const;

// Um provedor pronto para uso, como o SERVIDOR o enxerga (com a chave).
// Compare com ProvedorDisponivel em dsa-tipos.ts, a versao SEM chave que vai
// para o navegador.
export type ProvedorConfigurado = {
  apelido: string;
  chave: string | null;   // null so para o Ollama, que nao precisa de chave
  modelo: string;
};

/** Endereco do servidor Ollama: o do .env, ou o padrao da instalacao local. */
export function dsaHostOllama(): string {
  return process.env.OLLAMA_HOST || "http://localhost:11434";
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// @st.cache_data(ttl=60, show_spinner=False)
// def dsa_ollama_disponivel(host):
//     try:
//         return requests.get(f"{host}/api/tags", timeout=1.5).ok
//     except requests.RequestException:
//         return False
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: O @st.cache_data(ttl=60) virou uma variavel de modulo com carimbo de tempo.
//               No Node.js o modulo e carregado UMA vez e fica em memoria entre requisicoes
//               (na Vercel, enquanto a funcao estiver "quente"), entao uma variavel
//               simples faz o papel do cache. requests.get(timeout=1.5) virou fetch com
//               AbortSignal.timeout(1500) -- o fetch nativo nao tem parametro de timeout.
// ==============================================================================

// Cache: { quando: carimbo de tempo em ms, disponivel: resposta guardada }.
let dsaCacheOllama: { quando: number; disponivel: boolean } | null = null;

/**
 * true se um servidor Ollama responde em 'host'; false se nao.
 *
 * O Ollama expoe a rota GET /api/tags (lista de modelos baixados). Se ela
 * responde, o servidor esta no ar. O timeout curto evita que o app trave
 * esperando por um Ollama que nao existe -- caso da Vercel.
 *
 * A resposta fica guardada por 60 segundos: sem isso, cada requisicao do
 * navegador (lista de provedores, analise...) faria esta pergunta na rede.
 */
export async function dsaOllamaDisponivel(host: string): Promise<boolean> {
  const agora = Date.now();
  if (dsaCacheOllama && agora - dsaCacheOllama.quando < 60_000) {
    return dsaCacheOllama.disponivel;
  }
  let disponivel = false;
  try {
    const resposta = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(1500) });
    disponivel = resposta.ok;
  } catch {
    disponivel = false; // conexao recusada, timeout, DNS... qualquer falha = nao esta no ar
  }
  dsaCacheOllama = { quando: agora, disponivel };
  return disponivel;
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// def dsa_provedores_disponiveis():
//     disponiveis = []
//     for apelido, var_chave, var_modelo, modelo_padrao in DSA_PROVEDORES:
//         chave = dsa_chave_valida(var_chave)
//         if chave:
//             disponiveis.append((apelido, chave, os.getenv(var_modelo) or modelo_padrao))
//     host_ollama = os.getenv("OLLAMA_HOST") or "http://localhost:11434"
//     if dsa_ollama_disponivel(host_ollama):
//         disponiveis.append(("Ollama", None, os.getenv("OLLAMA_MODEL") or "llama3.2"))
//     return disponiveis
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: Virou 'async' porque a checagem do Ollama e uma chamada de rede e, em
//               JavaScript, rede nunca bloqueia: a funcao devolve uma Promise e quem
//               chama usa 'await'. Fora isso, e a mesma logica.
// ==============================================================================

/**
 * Lista os provedores com chave configurada, na ordem de preferencia.
 *
 * O Ollama entra no fim, com chave null, apenas se estiver respondendo. A
 * lista PODE ficar vazia -- sem chave e sem Ollama nao ha motor de IA -- e a
 * barra lateral trata esse caso com uma mensagem clara.
 */
export async function dsaProvedoresDisponiveis(): Promise<ProvedorConfigurado[]> {
  const disponiveis: ProvedorConfigurado[] = [];
  for (const { apelido, varChave, varModelo, modeloPadrao } of DSA_PROVEDORES) {
    const chave = dsaChaveValida(varChave);
    if (chave) {
      disponiveis.push({ apelido, chave, modelo: process.env[varModelo] || modeloPadrao });
    }
  }
  if (await dsaOllamaDisponivel(dsaHostOllama())) {
    disponiveis.push({ apelido: "Ollama", chave: null, modelo: process.env.OLLAMA_MODEL || "llama3.2" });
  }
  return disponiveis;
}

// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// def dsa_cria_modelo():
//     if DSA_PROVEDOR == "Groq":
//         return Groq(id=DSA_MODELO, api_key=DSA_CHAVE)
//     if DSA_PROVEDOR == "OpenAI":
//         return OpenAIChat(id=DSA_MODELO, api_key=DSA_CHAVE)
//     if DSA_PROVEDOR == "Anthropic":
//         return Claude(id=DSA_MODELO, api_key=DSA_CHAVE)
//     if DSA_PROVEDOR == "Grok":
//         return xAI(id=DSA_MODELO, api_key=DSA_CHAVE)
//     return Ollama(id=DSA_MODELO,
//                   host=os.getenv("OLLAMA_HOST") or "http://localhost:11434")
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: Duas coisas. (1) A funcao recebe o provedor como PARAMETRO em vez de ler
//               variaveis globais (DSA_PROVEDOR, DSA_CHAVE, DSA_MODELO). No Streamlit havia
//               um usuario por processo, entao globais funcionavam; num servidor web
//               varios usuarios podem escolher provedores diferentes AO MESMO TEMPO, e
//               cada requisicao precisa carregar a sua escolha. (2) Cada provedor e
//               criado em dois passos: create<Provedor>({ apiKey }) devolve uma "fabrica"
//               e fabrica(modelo) devolve o objeto de modelo.
// ==============================================================================

/**
 * Cria um objeto de LLM novo, ja apontando para o provedor escolhido.
 *
 * O objeto devolvido e o que os agentes recebem em "model:". Trocar de
 * provedor e trocar esse objeto -- nenhuma outra linha do app muda. Essa era
 * a licao central do capitulo, e continua valendo aqui.
 *
 * Diferente do phidata, o objeto de modelo do AI SDK NAO guarda estado (as
 * ferramentas ficam no agente, nao no modelo), entao um mesmo objeto pode ser
 * compartilhado pelos tres agentes sem vazamento. Ainda assim mantivemos a
 * "fabrica" porque o provedor muda a cada requisicao.
 */
export function dsaCriaModelo(provedor: ProvedorConfigurado): LanguageModel {
  const chave = provedor.chave ?? undefined;
  switch (provedor.apelido) {
    case "Groq":
      return createGroq({ apiKey: chave })(provedor.modelo);
    case "OpenAI":
      return createOpenAI({ apiKey: chave })(provedor.modelo);
    case "Anthropic":
      return createAnthropic({ apiKey: chave })(provedor.modelo);
    case "Grok":
      return createXai({ apiKey: chave })(provedor.modelo);
    default:
      // Ollama: nao ha pacote oficial no AI SDK, mas o Ollama expoe um endpoint
      // compativel com a API da OpenAI em <host>/v1. O pacote "openai-compatible"
      // existe exatamente para servidores assim.
      return createOpenAICompatible({ name: "ollama", baseURL: `${dsaHostOllama()}/v1` })(provedor.modelo);
  }
}
