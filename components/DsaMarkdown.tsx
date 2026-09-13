// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: components/DsaMarkdown.tsx
//
// ==============================================================================
// CODIGO ORIGINAL (Python -- mantido comentado para referencia)
// ==============================================================================
// st.markdown(clean_response)
//
// ==============================================================================
// VERSAO NODE.JS
// O que mudou: O Streamlit sabia desenhar Markdown; o React nao. O pacote react-markdown
//               faz isso, e o remark-gfm ensina a ele as TABELAS (o "GFM" e o Markdown do
//               GitHub, que tem tabelas -- e os agentes recebem a instrucao "Use tabelas
//               para mostrar os dados", entao sem isso a resposta viria com barras "|"
//               soltas). O mesmo componente serve para as instrucoes da barra lateral e
//               para as mensagens de erro, que tambem sao Markdown.
// ==============================================================================

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function DsaMarkdown({ texto }: { texto: string }) {
  return (
    <div className="dsa-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{texto}</ReactMarkdown>
    </div>
  );
}
