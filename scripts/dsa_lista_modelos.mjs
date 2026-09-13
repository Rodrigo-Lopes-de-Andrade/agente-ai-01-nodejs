// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Utilitario de apoio: lista os modelos VALIDOS da sua conta em cada provedor.
//
// VERSAO NODE.JS -- corresponde ao dsa_lista_modelos.py.
//
// Para que serve: nomes de modelo saem do ar sem aviso. Foi o que aconteceu com
// os dois modelos originais deste capitulo -- "deepseek-r1-distill-llama-70b" e
// "llama-3.3-70b-versatile" hoje retornam erro na Groq. Quando o app reclamar
// que o modelo nao existe, rode este script, escolha um nome da lista e coloque
// no .env (ou nas variaveis de ambiente da Vercel).
//
// Uso:  npm run modelos
//       (que executa: node --env-file-if-exists=.env scripts/dsa_lista_modelos.mjs)
//
// O que mudou em relacao ao Python: la usavamos o SDK de cada provedor
// (groq, openai, anthropic, ollama). Aqui usamos so o 'fetch' nativo do Node,
// porque a rota "listar modelos" e um GET simples em todos eles -- e assim
// voce ve o endereco real de cada API. O .env e carregado pelo proprio Node
// (--env-file), sem dotenv.
//
// A extensao .mjs diz ao Node que o arquivo usa 'import' (modulos ES) em vez
// do 'require' antigo.

// Mesma regra do app: chave vazia ou com texto de exemplo = nao configurada.
const DSA_PLACEHOLDERS = ["seu-", "sua-", "cole-", "coloque", "your-", "xxx", "<"];

function dsaChaveValida(nomeDaVariavel) {
  const valor = (process.env[nomeDaVariavel] ?? "").trim().replace(/^["']|["']$/g, "");
  if (!valor || DSA_PLACEHOLDERS.some((inicio) => valor.toLowerCase().startsWith(inicio))) return null;
  return valor;
}

function titulo(texto) {
  console.log();
  console.log("=".repeat(78));
  console.log(texto);
  console.log("=".repeat(78));
}

/** GET com cabecalhos; lanca erro com o corpo da resposta se nao for 2xx. */
async function dsaGetJson(url, cabecalhos = {}) {
  const resposta = await fetch(url, { headers: cabecalhos, signal: AbortSignal.timeout(15_000) });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}: ${(await resposta.text()).slice(0, 200)}`);
  return resposta.json();
}

async function listaGroq() {
  titulo("GROQ");
  const chave = dsaChaveValida("GROQ_API_KEY");
  if (!chave) return console.log("  GROQ_API_KEY nao configurada no .env -- provedor pulado.");
  const { data } = await dsaGetJson("https://api.groq.com/openai/v1/models", { Authorization: `Bearer ${chave}` });
  const modelos = data.map((m) => m.id).sort();
  for (const m of modelos) console.log("  -", m);
  console.log(`  (${modelos.length} modelos)`);
}

async function listaOpenAI() {
  titulo("OPENAI");
  const chave = dsaChaveValida("OPENAI_API_KEY");
  if (!chave) return console.log("  OPENAI_API_KEY nao configurada no .env -- provedor pulado.");
  const { data } = await dsaGetJson("https://api.openai.com/v1/models", { Authorization: `Bearer ${chave}` });
  const modelos = data.map((m) => m.id).sort();
  // A conta costuma ter dezenas de modelos (audio, imagem, embeddings...).
  // Mostramos so os de conversa, que sao os que interessam para os agentes.
  const conversa = modelos.filter((m) => /^(gpt-|o1|o3|o4)/.test(m));
  for (const m of conversa) console.log("  -", m);
  console.log(`  (${conversa.length} de conversa, ${modelos.length} no total)`);
}

async function listaAnthropic() {
  titulo("ANTHROPIC");
  const chave = dsaChaveValida("ANTHROPIC_API_KEY");
  if (!chave) return console.log("  ANTHROPIC_API_KEY nao configurada no .env -- provedor pulado.");
  // A Anthropic usa o cabecalho x-api-key (nao Authorization) e exige a versao da API.
  const { data } = await dsaGetJson("https://api.anthropic.com/v1/models?limit=100", {
    "x-api-key": chave,
    "anthropic-version": "2023-06-01",
  });
  const modelos = data.map((m) => m.id);
  for (const m of modelos) console.log("  -", m);
  console.log(`  (${modelos.length} modelos)`);
}

async function listaGrok() {
  titulo("GROK (xAI)");
  const chave = dsaChaveValida("XAI_API_KEY");
  if (!chave) return console.log("  XAI_API_KEY nao configurada no .env -- provedor pulado.");
  // A xAI fala o MESMO protocolo da OpenAI. So muda o endereco do servidor.
  const { data } = await dsaGetJson("https://api.x.ai/v1/models", { Authorization: `Bearer ${chave}` });
  const modelos = data.map((m) => m.id).sort();
  for (const m of modelos) console.log("  -", m);
  console.log(`  (${modelos.length} modelos)`);
}

async function listaOllama() {
  titulo("OLLAMA (local, sem chave)");
  const endereco = process.env.OLLAMA_HOST || "http://localhost:11434";
  let modelos;
  try {
    ({ models: modelos } = await dsaGetJson(`${endereco}/api/tags`));
  } catch (erro) {
    console.log(`  Servidor local nao respondeu em ${endereco}: ${erro.message}`);
    console.log("  Dica: instale com 'curl -fsSL https://ollama.com/install.sh | sh'");
    return;
  }
  for (const m of modelos) console.log("  -", m.model);
  console.log(`  (${modelos.length} modelos baixados em ${endereco})`);
}

for (const funcao of [listaGroq, listaOpenAI, listaAnthropic, listaGrok, listaOllama]) {
  try {
    await funcao();
  } catch (erro) {
    console.log(`  ERRO ao consultar: ${erro.constructor.name}: ${erro.message}`);
  }
}
console.log();
console.log("Copie o nome escolhido para a variavel de modelo no .env.");
console.log("Ex.: GROQ_MODEL=openai/gpt-oss-120b");
