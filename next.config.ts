// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: next.config.ts
//
// Este e o arquivo de configuracao do Next.js. Equivale, grosso modo, ao
// st.set_page_config() do Streamlit somado ao .streamlit/config.toml -- so que
// aqui as opcoes sao do FRAMEWORK (build, imagens, redirecionamentos...), nao da
// pagina. As opcoes da pagina (titulo, icone) ficam em app/layout.tsx.
//
// Para este projeto NAO precisamos configurar nada: o Next.js ja descobre
// sozinho que as rotas em app/api/ rodam no servidor Node.js e que os
// componentes com "use client" rodam no navegador. Deixamos o arquivo aqui
// porque a Vercel e o proprio Next.js o procuram ao iniciar, e porque e o
// lugar onde voce mexeria se um dia precisasse (por exemplo, para liberar
// imagens de um dominio externo ou mudar o diretorio de saida do build).

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* nenhuma opcao necessaria neste capitulo */

  // Curiosidade de 2026: o 'next dev' cria sozinho os arquivos AGENTS.md e
  // CLAUDE.md na raiz, com um aviso para assistentes de IA (Claude Code, Codex,
  // Cursor) de que esta versao do Next.js e mais nova que o treinamento deles
  // e onde estao os docs. Sao inofensivos e podem ir para o git. Se preferir
  // nao te-los, descomente a linha abaixo.
  // agentRules: false,
};

export default nextConfig;
