// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
// Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização
//
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: app/layout.tsx
//
// ==============================================================================
// O QUE E O LAYOUT
// ==============================================================================
// No Next.js, app/layout.tsx e a "moldura" de todas as paginas: o <html> e o
// <body> que envolvem tudo. E OBRIGATORIO existir um. Este arquivo roda no
// SERVIDOR (nao tem "use client"): ele so monta HTML estatico, sem estado.
//
// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// # Configuração da página do Streamlit
// st.set_page_config(page_title="Data Science Academy", page_icon=":100:", layout="wide")
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: page_title vira o objeto 'metadata' (o Next.js o transforma na tag
//               <title>). page_icon=":100:" vira o arquivo app/icon.svg, que o Next.js
//               serve como favicon so por existir com esse nome. layout="wide" vira CSS
//               (globals.css): a pagina ocupa a largura toda por padrao.
// ==============================================================================

import type { Metadata } from "next";
import "./globals.css";

// O Next.js le este objeto e gera as tags <title> e <meta> do <head>.
export const metadata: Metadata = {
  title: "Data Science Academy",
  description: "Day Trade Analytics em Tempo Real com Agentes de IA",
};

// 'children' e a pagina que esta sendo exibida (app/page.tsx). O tipo
// React.ReactNode significa "qualquer coisa que o React saiba desenhar".
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
