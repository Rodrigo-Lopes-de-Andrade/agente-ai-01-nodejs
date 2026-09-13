// Módulo Especial de Consultoria na Área de Dados com Agentes de IA
// VERSAO NODE.JS (Next.js + Vercel) -- arquivo: types/plotly-finance.d.ts
//
// O QUE E ESTE ARQUIVO: uma "declaracao de tipos". O pacote
// plotly.js-finance-dist-min e JavaScript puro, sem informacao de tipos para o
// TypeScript. Sem este arquivo, a linha
//
//     import Plotly from "plotly.js-finance-dist-min";
//
// daria o erro "Could not find a declaration file for module". Aqui dizemos ao
// TypeScript: "esse pacote tem exatamente a mesma cara do plotly.js completo,
// use os tipos do @types/plotly.js". O bundle 'finance' e o plotly.js inteiro
// menos os tipos de grafico que nao usamos (mapas, 3D, etc.) -- por isso os
// tipos servem sem nenhuma adaptacao.
//
// Em Python nao existe esse passo: o interpretador nao confere tipos antes de
// rodar. E o preco (pequeno) que o TypeScript cobra para avisar ERROS DE
// DIGITACAO antes de voce abrir o navegador.

declare module "plotly.js-finance-dist-min" {
  import * as Plotly from "plotly.js";
  export = Plotly;
}
