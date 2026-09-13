# Módulo Especial de Consultoria na Área de Dados com Agentes de IA
# Projeto Prático Para Consultoria na Área de Dados com Agentes de IA
# Deploy de App Para Day Trade Analytics em Tempo Real com Agentes de IA, Groq, DeepSeek e AWS Para Monetização

# Imports
# ==============================================================================
# CODIGO ORIGINAL (mantido comentado para referencia)
# ==============================================================================
# import re
# import streamlit as st
# import yfinance as yf
# import plotly.graph_objects as go
# import plotly.express as px
# from phi.agent import Agent
# from phi.model.groq import Groq
# from phi.tools.yfinance import YFinanceTools
# from phi.tools.duckduckgo import DuckDuckGo
# from dotenv import load_dotenv
#
# ==============================================================================
# VERSAO MODERNA (Python 3.12 + uv)
# O que mudou: Alem dos imports originais, agora trazemos os/json/Path (para achar o .env
#               e montar as ferramentas), as classes dos 5 provedores de LLM e o pacote
#               'ddgs'. Saiu 'from phi.tools.duckduckgo import DuckDuckGo': essa ferramenta
#               depende do pacote renomeado e hoje devolve busca vazia.
# ==============================================================================
# Imports
import os
import re
import json
import time
from pathlib import Path

import streamlit as st
import yfinance as yf
import plotly.graph_objects as go
import plotly.express as px

from phi.agent import Agent
from phi.tools import Toolkit
from phi.tools.yfinance import YFinanceTools

# Cada provedor de LLM tem sua propria classe dentro do phidata. Importamos as
# cinco porque o usuario escolhe qual usar na barra lateral (veja "SELETOR DE
# PROVEDOR").
from phi.model.groq import Groq
from phi.model.openai import OpenAIChat
from phi.model.anthropic import Claude
from phi.model.xai import xAI
from phi.model.ollama import Ollama

# Busca na web. O pacote "duckduckgo_search" foi RENOMEADO para "ddgs". O nome
# antigo ainda instala, mas virou uma casca vazia: devolve zero resultados.
from ddgs import DDGS

# Usado so para perguntar ao Ollama local se ele esta no ar (veja
# dsa_ollama_disponivel). Ja era dependencia do projeto.
import requests

from dotenv import load_dotenv

# ==============================================================================
# CODIGO ORIGINAL (mantido comentado para referencia)
# ==============================================================================
# # Carrega o arquivo de variáveis de ambiente
# load_dotenv()
#
# ==============================================================================
# VERSAO MODERNA (Python 3.12 + uv)
# O que mudou: load_dotenv() sem argumento procura o .env a partir da pasta do SCRIPT que
#               chamou. Se voce iniciar o app de outra pasta, ele nao acha as chaves e o
#               erro que aparece e 'API key not set', como se o .env estivesse vazio.
#               Path(__file__).parent elimina essa pegadinha.
# ==============================================================================
# Carrega o arquivo .env que fica AO LADO deste arquivo
load_dotenv(Path(__file__).parent / ".env")

########## Analytics ##########

# Usa o cache de dados do Streamlit para armazenar os resultados da função e evitar reprocessamento
# Define a função que extrai dados históricos de uma ação com base no ticker e período especificado
@st.cache_data
def dsa_extrai_dados(ticker, period="6mo"):

    # Cria um objeto Ticker do Yahoo Finance para a ação especificada
    stock = yf.Ticker(ticker)
    
    # Obtém o histórico de preços da ação para o período definido
    hist = stock.history(period=period)
    
    # Reseta o índice do DataFrame para transformar a coluna de data em uma coluna normal
    hist.reset_index(inplace=True)
    
    # Retorna o DataFrame com os dados históricos da ação
    return hist

# Define a função para plotar o preço das ações com base no histórico fornecido
def dsa_plot_stock_price(hist, ticker):
    # Cria um gráfico de linha interativo usando Plotly Express
    # O eixo X representa a data e o eixo Y representa o preço de fechamento das ações
    # O título do gráfico inclui o ticker da ação e o período de análise
    fig = px.line(hist, x="Date", y="Close", title=f"{ticker} Preços das Ações (Últimos 6 Meses)", markers=True)
    
    # Exibe o gráfico no Streamlit
    # ==============================================================================
    # CODIGO ORIGINAL (mantido comentado para referencia)
    # ==============================================================================
    # st.plotly_chart(fig)
    #
    # ==============================================================================
    # VERSAO MODERNA (Python 3.12 + uv)
    # O que mudou: A pagina usa layout='wide', mas st.plotly_chart(fig) desenha o grafico no
    #               tamanho nativo, deixando sobra dos dois lados. width='stretch' e a forma
    #               atual de ocupar a largura toda (use_container_width=True esta deprecated
    #               no Streamlit 1.63).
    # ==============================================================================
    st.plotly_chart(fig, width="stretch")

# Define a função para plotar um gráfico de candlestick com base no histórico fornecido
def dsa_plot_candlestick(hist, ticker):

    # Cria um objeto Figure do Plotly para armazenar o gráfico
    fig = go.Figure(

        # Adiciona um gráfico de candlestick com os dados do histórico da ação
        data=[go.Candlestick(x=hist['Date'],        # Define as datas no eixo X
                             open=hist['Open'],     # Define os preços de abertura
                             high=hist['High'],     # Define os preços mais altos
                             low=hist['Low'],       # Define os preços mais baixos
                             close=hist['Close'])]  # Define os preços de fechamento
    )
    
    # Atualiza o layout do gráfico, incluindo um título dinâmico com o ticker da ação
    fig.update_layout(title=f"{ticker} Candlestick Chart (Últimos 6 Meses)")
    
    # Exibe o gráfico no Streamlit
    # ==============================================================================
    # CODIGO ORIGINAL (mantido comentado para referencia)
    # ==============================================================================
    # st.plotly_chart(fig)
    #
    # ==============================================================================
    # VERSAO MODERNA (Python 3.12 + uv)
    # O que mudou: Mesma mudanca do grafico anterior: width='stretch' ocupa a largura da pagina.
    # ==============================================================================
    st.plotly_chart(fig, width="stretch")

# Define a função para plotar médias móveis com base no histórico fornecido
def dsa_plot_media_movel(hist, ticker):

    # Calcula a Média Móvel Simples (SMA) de 20 períodos e adiciona ao DataFrame
    hist['SMA_20'] = hist['Close'].rolling(window=20).mean()
    
    # Calcula a Média Móvel Exponencial (EMA) de 20 períodos e adiciona ao DataFrame
    hist['EMA_20'] = hist['Close'].ewm(span=20, adjust=False).mean()
    
    # Cria um gráfico de linha interativo usando Plotly Express
    # Plota os preços de fechamento, a SMA de 20 períodos e a EMA de 20 períodos
    fig = px.line(hist, 
                  x='Date', 
                  y=['Close', 'SMA_20', 'EMA_20'],
                  title=f"{ticker} Médias Móveis (Últimos 6 Meses)",  # Define o título do gráfico
                  labels={'value': 'Price (USD)', 'Date': 'Date'})    # Define os rótulos dos eixos
    
    # Exibe o gráfico no Streamlit
    # ==============================================================================
    # CODIGO ORIGINAL (mantido comentado para referencia)
    # ==============================================================================
    # st.plotly_chart(fig)
    #
    # ==============================================================================
    # VERSAO MODERNA (Python 3.12 + uv)
    # O que mudou: Mesma mudanca do grafico anterior: width='stretch' ocupa a largura da pagina.
    # ==============================================================================
    st.plotly_chart(fig, width="stretch")

# Define a função para plotar o volume de negociação da ação com base no histórico fornecido
def dsa_plot_volume(hist, ticker):

    # Cria um gráfico de barras interativo usando Plotly Express
    # O eixo X representa a data e o eixo Y representa o volume negociado
    fig = px.bar(hist, 
                 x='Date', 
                 y='Volume', 
                 title=f"{ticker} Trading Volume (Últimos 6 Meses)")  # Define o título do gráfico
    
    # Exibe o gráfico no Streamlit
    # ==============================================================================
    # CODIGO ORIGINAL (mantido comentado para referencia)
    # ==============================================================================
    # st.plotly_chart(fig)
    #
    # ==============================================================================
    # VERSAO MODERNA (Python 3.12 + uv)
    # O que mudou: Mesma mudanca do grafico anterior: width='stretch' ocupa a largura da pagina.
    # ==============================================================================
    st.plotly_chart(fig, width="stretch")

########## Agentes de IA ##########

# ==============================================================================
# NOVO: SELETOR DE PROVEDOR DE LLM
# ==============================================================================
# O capitulo original falava apenas com a Groq, com o nome do modelo escrito
# direto no codigo. Com o tempo isso criou dois problemas:
#
#   1) os modelos "deepseek-r1-distill-llama-70b" e "llama-3.3-70b-versatile"
#      foram descontinuados pela Groq -- hoje as duas chamadas retornam 404;
#   2) quem nao tem chave da Groq simplesmente nao conseguia rodar o capitulo.
#
# A solucao: o app le o .env, descobre quais chaves existem DE VERDADE e monta
# uma lista so com esses provedores. O usuario escolhe um deles numa caixa de
# selecao na barra lateral; o primeiro da lista e o padrao. O Ollama, que roda
# na sua propria maquina e nao precisa de chave, entra como ultima opcao -- mas
# so se houver um servidor Ollama respondendo. Na nuvem (Streamlit Community
# Cloud, AWS) nao ha Ollama, e oferecer uma opcao que falha nao ajuda ninguem.
#
# A licao central do capitulo continua valendo, e fica ate mais visivel aqui:
# os agentes NAO sabem quem e o LLM. Eles recebem um objeto em "model=". Trocar
# de provedor e trocar esse objeto -- nenhuma outra linha do app muda. E e por
# isso que os agentes sao criados DEPOIS da barra lateral: so ali sabemos qual
# objeto de modelo entregar a eles.

# Comecos de texto que significam "o aluno ainda nao preencheu esta chave".
DSA_PLACEHOLDERS = ("seu-", "sua-", "cole-", "coloque", "your-", "xxx", "<")


def dsa_chave_valida(nome_da_variavel):
    """Devolve a chave de API se estiver mesmo preenchida; caso contrario, None.

    Uma chave ausente e uma chave com o texto de exemplo dao no mesmo: o
    provedor deve ser pulado sem erro, como se nao existisse.
    """
    valor = (os.getenv(nome_da_variavel) or "").strip().strip('"').strip("'")
    if not valor or valor.lower().startswith(DSA_PLACEHOLDERS):
        return None
    return valor


# Ordem de preferencia. A Groq vem primeiro por fidelidade ao capitulo original.
# Formato: (apelido, variavel da chave, variavel do modelo, modelo padrao)
DSA_PROVEDORES = [
    ("Groq",      "GROQ_API_KEY",      "GROQ_MODEL",      "openai/gpt-oss-120b"),
    ("OpenAI",    "OPENAI_API_KEY",    "OPENAI_MODEL",    "gpt-4o-mini"),
    ("Anthropic", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "claude-sonnet-4-5"),
    ("Grok",      "XAI_API_KEY",       "XAI_MODEL",       "grok-4"),
]


@st.cache_data(ttl=60, show_spinner=False)
def dsa_ollama_disponivel(host):
    """True se um servidor Ollama responde em 'host'; False se nao.

    O Ollama expoe a rota GET /api/tags (lista de modelos baixados). Se ela
    responde, o servidor esta no ar. O timeout curto evita que o app trave
    esperando por um Ollama que nao existe -- caso da nuvem.

    O @st.cache_data guarda a resposta por 60 segundos. Sem ele, o Streamlit
    faria esta pergunta na rede a cada clique, porque reexecuta o arquivo
    inteiro toda vez.
    """
    try:
        return requests.get(f"{host}/api/tags", timeout=1.5).ok
    except requests.RequestException:
        return False


def dsa_provedores_disponiveis():
    """Lista os provedores com chave configurada, na ordem de preferencia.

    Devolve uma lista de tuplas (apelido, chave, modelo). O Ollama entra no
    fim, com chave None, apenas se estiver respondendo. A lista PODE ficar
    vazia -- sem chave e sem Ollama nao ha motor de IA -- e a barra lateral
    trata esse caso com uma mensagem clara.
    """
    disponiveis = []
    for apelido, var_chave, var_modelo, modelo_padrao in DSA_PROVEDORES:
        chave = dsa_chave_valida(var_chave)
        if chave:
            disponiveis.append((apelido, chave, os.getenv(var_modelo) or modelo_padrao))
    host_ollama = os.getenv("OLLAMA_HOST") or "http://localhost:11434"
    if dsa_ollama_disponivel(host_ollama):
        disponiveis.append(("Ollama", None, os.getenv("OLLAMA_MODEL") or "llama3.2"))
    return disponiveis


# DSA_PROVEDOR, DSA_CHAVE e DSA_MODELO sao definidos mais abaixo, na barra
# lateral, a partir da escolha do usuario. dsa_cria_modelo() le essas tres
# variaveis na hora em que e chamada -- e ela so e chamada depois da escolha.
def dsa_cria_modelo():
    """Cria um objeto de LLM novo, ja apontando para o provedor escolhido.

    Por que uma FUNCAO e nao uma variavel unica? Porque no phidata o objeto de
    modelo guarda estado -- entre outras coisas, as ferramentas registradas
    naquele agente. Se os tres agentes compartilhassem o mesmo objeto, as
    ferramentas de um vazariam para o outro. Uma "fabrica" entrega um objeto
    limpo para cada agente, que e o que o codigo original fazia ao escrever
    Groq(...) tres vezes.
    """
    if DSA_PROVEDOR == "Groq":
        return Groq(id=DSA_MODELO, api_key=DSA_CHAVE)
    if DSA_PROVEDOR == "OpenAI":
        return OpenAIChat(id=DSA_MODELO, api_key=DSA_CHAVE)
    if DSA_PROVEDOR == "Anthropic":
        return Claude(id=DSA_MODELO, api_key=DSA_CHAVE)
    if DSA_PROVEDOR == "Grok":
        return xAI(id=DSA_MODELO, api_key=DSA_CHAVE)
    return Ollama(id=DSA_MODELO,
                  host=os.getenv("OLLAMA_HOST") or "http://localhost:11434")


# ==============================================================================
# NOVO: FERRAMENTA DE BUSCA NA WEB (substitui phi.tools.duckduckgo)
# ==============================================================================
# Por dentro, a ferramenta DuckDuckGo do phidata importa o pacote
# "duckduckgo_search". Esse pacote foi renomeado para "ddgs": a versao antiga
# ainda instala, mas esta abandonada e quase sempre devolve uma lista VAZIA,
# emitindo apenas um aviso de renomeacao.
#
# Repare como essa falha e traicoeira: o agente de busca nao quebra com erro,
# ele apenas nunca encontra nada. E como mandar alguem pesquisar numa biblioteca
# que fechou -- a pessoa volta de maos vazias e voce nao fica sabendo por que.
#
# Aqui recriamos a mesma ferramenta usando o pacote novo. Os nomes dos metodos e
# o texto das docstrings sao iguais aos do phidata DE PROPOSITO: e a docstring
# que o phidata le para explicar a ferramenta ao LLM.


class DSADuckDuckGo(Toolkit):
    """Busca na web usando o pacote ddgs (nome atual do duckduckgo_search)."""

    def __init__(self, fixed_max_results=5):
        super().__init__(name="duckduckgo")
        self.fixed_max_results = fixed_max_results
        self.register(self.duckduckgo_search)
        self.register(self.duckduckgo_news)

    def duckduckgo_search(self, query: str, max_results: int = 5) -> str:
        """Use this function to search DuckDuckGo for a query.

        Args:
            query(str): The query to search for.
            max_results (optional, default=5): The maximum number of results to return.

        Returns:
            The result from DuckDuckGo.
        """
        quantos = self.fixed_max_results or max_results
        try:
            return json.dumps(list(DDGS().text(query, max_results=quantos)),
                              ensure_ascii=False)
        except Exception as erro:
            return json.dumps({"erro": f"busca indisponivel: {erro}"},
                              ensure_ascii=False)

    def duckduckgo_news(self, query: str, max_results: int = 5) -> str:
        """Use this function to get the latest news from DuckDuckGo.

        Args:
            query(str): The query to search for.
            max_results (optional, default=5): The maximum number of results to return.

        Returns:
            The latest news from DuckDuckGo.
        """
        quantos = self.fixed_max_results or max_results
        try:
            return json.dumps(list(DDGS().news(query, max_results=quantos)),
                              ensure_ascii=False)
        except Exception as erro:
            return json.dumps({"erro": f"busca indisponivel: {erro}"},
                              ensure_ascii=False)

########## App Web ##########

# Configuração da página do Streamlit
st.set_page_config(page_title="Data Science Academy", page_icon=":100:", layout="wide")

# Barra Lateral com instruções
st.sidebar.title("Instruções")
st.sidebar.markdown("""
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
""")

# ==============================================================================
# NOVO: caixa de selecao do motor de IA na barra lateral
# ==============================================================================
# Antes, o app escolhia sozinho o primeiro provedor com chave. Agora quem escolhe
# e o usuario, numa caixa de selecao (selectbox) logo abaixo das instrucoes.
# Passo a passo do que acontece aqui:
#
#   1) dsa_provedores_disponiveis() le o .env e devolve so os provedores com
#      chave preenchida de verdade, mais o Ollama local no fim da lista (se
#      houver um Ollama respondendo).
#   2) st.sidebar.selectbox() desenha a caixa. Cada argumento tem um papel:
#        - options      : o que aparece na lista -- so os apelidos ("Groq",
#                         "OpenAI"...), tirados das tuplas do passo 1;
#        - format_func  : como cada opcao e ESCRITA na tela. O valor devolvido
#                         continua sendo o apelido puro ("Ollama"); so o texto
#                         visivel ganha o complemento "(local, sem chave)";
#        - key          : nome com que o Streamlit guarda a escolha. Importante:
#                         o Streamlit reexecuta este arquivo INTEIRO a cada
#                         clique. Sem o key, a caixa voltaria ao padrao toda vez
#                         que o usuario clicasse em "Analisar";
#        - help         : o texto do "?" ao lado do rotulo.
#      A primeira opcao da lista e o padrao -- Groq, se houver chave, por
#      fidelidade ao capitulo original.
#   3) next(...) procura, na lista do passo 1, a tupla cujo apelido e o
#      escolhido, e desempacota em DSA_PROVEDOR, DSA_CHAVE e DSA_MODELO -- as
#      tres variaveis que dsa_cria_modelo() usa para montar o objeto de LLM.
#   4) Logo abaixo, os agentes sao criados com esse objeto. Por isso eles ficam
#      DEPOIS da barra lateral: antes da escolha nao ha como saber qual modelo
#      entregar a eles.
st.sidebar.markdown("### Motor de IA")
DSA_DISPONIVEIS = dsa_provedores_disponiveis()                       # passo 1

# Sem chave alguma e sem Ollama no ar, nao ha o que escolher. Avisamos e paramos
# aqui (st.stop) em vez de deixar o usuario clicar em "Analisar" e receber um
# erro de conexao sem explicacao.
if not DSA_DISPONIVEIS:
    st.sidebar.error(
        "**Nenhum motor de IA disponivel.**\n\n"
        "Preencha pelo menos uma chave de API no arquivo `.env` (rodando local) "
        "ou no painel de *Secrets* (Streamlit Community Cloud), ou inicie o "
        "Ollama na sua maquina. Depois, reinicie o app."
    )
    st.stop()

DSA_ESCOLHA = st.sidebar.selectbox(                                  # passo 2
    "Escolha o LLM",
    options=[apelido for apelido, _, _ in DSA_DISPONIVEIS],
    format_func=lambda apelido: "Ollama (local, sem chave)" if apelido == "Ollama" else apelido,
    key="dsa_provedor_escolhido",
    help="So aparecem os provedores com chave de API preenchida no arquivo .env.",
)
DSA_PROVEDOR, DSA_CHAVE, DSA_MODELO = next(                          # passo 3
    p for p in DSA_DISPONIVEIS if p[0] == DSA_ESCOLHA
)

# Abaixo da caixa, uma mensagem confirma provedor e modelo em uso. Sem isto,
# quando a resposta vem estranha, o aluno nao tem como saber se falou com a
# Groq, com a OpenAI ou com o modelo local. Tres situacoes:
#   - provedor com chave        -> caixa verde com provedor e modelo;
#   - Ollama e a UNICA opcao    -> aviso de que nenhuma chave foi encontrada;
#   - Ollama escolhido de       -> lembrete de que existem opcoes melhores.
#     proposito, havendo outras
if DSA_PROVEDOR != "Ollama":
    st.sidebar.success(f"**{DSA_PROVEDOR}** - modelo `{DSA_MODELO}`")
elif len(DSA_DISPONIVEIS) == 1:
    st.sidebar.info(
        f"**Ollama** (local) - modelo `{DSA_MODELO}`\n\n"
        "Nenhuma chave de API foi encontrada no arquivo `.env`, entao o app esta "
        "usando o modelo que roda na sua propria maquina. E gratuito e funciona, "
        "mas modelos pequenos erram bem mais em analise financeira."
    )
else:
    st.sidebar.info(
        f"**Ollama** (local) - modelo `{DSA_MODELO}`\n\n"
        "Gratuito e sem cota, mas modelos pequenos erram bem mais em analise "
        "financeira. Para respostas melhores, escolha um provedor com chave."
    )

# Agentes de IA 
# ==============================================================================
# CODIGO ORIGINAL (mantido comentado para referencia)
# ==============================================================================
# dsa_agente_web_search = Agent(name="DSA Agente Web Search",
#                               role="Fazer busca na web",
#                               model=Groq(id="deepseek-r1-distill-llama-70b"),
#                               tools=[DuckDuckGo()],
#                               instructions=["Sempre inclua as fontes"],
#                               show_tool_calls=True, markdown=True)
#
# dsa_agente_financeiro = Agent(name="DSA Agente Financeiro",
#                               model=Groq(id="deepseek-r1-distill-llama-70b"),
#                               tools=[YFinanceTools(stock_price=True,
#                                                    analyst_recommendations=True,
#                                                    stock_fundamentals=True,
#                                                    company_news=True)],
#                               instructions=["Use tabelas para mostrar os dados"],
#                               show_tool_calls=True, markdown=True)
#
# multi_ai_agent = Agent(team=[dsa_agente_web_search, dsa_agente_financeiro],
#                        model=Groq(id="llama-3.3-70b-versatile"),
#                        instructions=["Sempre inclua as fontes", "Use tabelas para mostrar os dados"],
#                        show_tool_calls=True, markdown=True)
#
# ==============================================================================
# VERSAO MODERNA (Python 3.12 + uv)
# O que mudou: Os IDs de modelo escritos no codigo ('deepseek-r1-distill-llama-70b' e
#               'llama-3.3-70b-versatile') foram descontinuados pela Groq e hoje retornam
#               erro 404 -- o app do capitulo nao roda mais como esta. Agora o modelo vem
#               do seletor da barra lateral, e a busca usa DSADuckDuckGo (pacote ddgs).
# ==============================================================================
# Agentes de IA
# Repare no que mudou: apenas o objeto passado em "model=" e a ferramenta de
# busca. Toda a logica dos agentes -- papeis, instrucoes, time -- continua
# exatamente igual a do capitulo.
dsa_agente_web_search = Agent(name="DSA Agente Web Search",
                              role="Fazer busca na web",
                              model=dsa_cria_modelo(),
                              tools=[DSADuckDuckGo()],
                              instructions=["Sempre inclua as fontes"],
                              show_tool_calls=True, markdown=True)

dsa_agente_financeiro = Agent(name="DSA Agente Financeiro",
                              model=dsa_cria_modelo(),
                              tools=[YFinanceTools(stock_price=True,
                                                   analyst_recommendations=True,
                                                   stock_fundamentals=True,
                                                   company_news=True)],
                              instructions=["Use tabelas para mostrar os dados"],
                              show_tool_calls=True, markdown=True)

multi_ai_agent = Agent(team=[dsa_agente_web_search, dsa_agente_financeiro],
                       model=dsa_cria_modelo(),
                       instructions=["Sempre inclua as fontes", "Use tabelas para mostrar os dados"],
                       show_tool_calls=True, markdown=True)


# Botão de suporte na barra lateral
if st.sidebar.button("Suporte"):
    st.sidebar.write("No caso de dúvidas envie e-mail para: suporte@datascienceacademy.com.br")

# Título principal
st.title(":100: Data Science Academy")

# Interface principal
st.header("Day Trade Analytics em Tempo Real com Agentes de IA")

# Caixa de texto para input do usuário
ticker = st.text_input("Digite o Código (símbolo do ticker):").upper()

# Se o usuário pressionar o botão, entramos neste bloco
if st.button("Analisar"):

    # Se temos o código da ação (ticker)
    if ticker:

        # Inicia o processamento
        with st.spinner("Buscando os Dados em Tempo Real. Aguarde..."):
            
            # ==============================================================================
            # CODIGO ORIGINAL (mantido comentado para referencia)
            # ==============================================================================
            # # Obtém os dados
            # hist = dsa_extrai_dados(ticker)
            #
            # ==============================================================================
            # VERSAO MODERNA (Python 3.12 + uv)
            # O que mudou: Ticker inexistente nao gera erro no yfinance: ele devolve tabela vazia.
            #               Passamos a detectar isso e parar, em vez de desenhar graficos em branco e
            #               gastar uma chamada de LLM a toa.
            # ==============================================================================
            # Obtem os dados
            hist = dsa_extrai_dados(ticker)

            # Se o ticker nao existe, o Yahoo Finance NAO levanta erro: ele devolve uma
            # tabela vazia. Sem esta checagem o app seguiria em frente, desenharia quatro
            # graficos em branco e ainda gastaria uma chamada paga de LLM perguntando sobre
            # uma acao que nao existe. Melhor avisar e parar aqui.
            if hist.empty:
                st.error(f"Nao encontrei dados para o ticker '{ticker}'. "
                         "Confira o simbolo (exemplos: MSFT, TSLA, AMZN, GOOG).")
                st.stop()
            
            # Renderiza um subtítulo
            st.subheader("Análise Gerada Por IA")
            
            # ==============================================================================
            # CODIGO ORIGINAL (mantido comentado para referencia)
            # ==============================================================================
            # # Executa o time de Agentes de IA
            # ai_response = multi_ai_agent.run(f"Resumir a recomendação do analista e compartilhar as últimas notícias para {ticker}")
            #
            # # Remove linhas que começam com "Running:"
            # # Remove o bloco "Running:" e também linhas "transfer_task_to_finance_ai_agent"
            # clean_response = re.sub(r"(Running:[\s\S]*?\n\n)|(^transfer_task_to_finance_ai_agent.*\n?)","", ai_response.content, flags=re.MULTILINE).strip()
            #
            # # Imprime a resposta
            # st.markdown(clean_response)
            #
            # ==============================================================================
            # VERSAO MODERNA (Python 3.12 + uv)
            # O que mudou: Tres mudancas: (1) cada erro do LLM e tratado pelo nome -- limite de uso
            #               por minuto e ferramenta inventada pelo modelo sao repetidos sozinhos, e
            #               cota diaria, modelo inexistente e chave recusada tem mensagens proprias;
            #               (2) o regex aceita qualquer 'transfer_task_to_<agente>'.
            # ==============================================================================
            # Executa o time de Agentes de IA
            # Limite acima do qual NAO adianta esperar dentro do app (2 minutos). Um limite
            # por minuto passa em segundos; um limite diario pode pedir horas de espera.
            DSA_ESPERA_MAXIMA = 120.0


            def dsa_segundos_de_espera(mensagem_de_erro, padrao=15.0):
                """Le quantos segundos o provedor pediu para esperar antes de tentar de novo.

                A mensagem vem em formatos diferentes: "try again in 6.31s", "in 1m30s" e
                ate "in 4h30m36.288s" (quando o limite estourado e o DIARIO, nao o por
                minuto). Ler so os segundos, como se fosse sempre o primeiro formato, faz o
                programa esperar 15 segundos quando deveria esperar horas -- ele tenta de
                novo, falha de novo, e voce conclui que o codigo esta quebrado quando o
                problema era so a cota.
                """
                achado = re.search(r"try again in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s", mensagem_de_erro)
                if not achado:
                    return padrao
                horas = int(achado.group(1) or 0)
                minutos = int(achado.group(2) or 0)
                segundos = float(achado.group(3) or 0)
                return horas * 3600 + minutos * 60 + segundos


            def dsa_roda_agentes(pergunta, tentativas=4):
                """Chama o time de agentes, repetindo so os erros que passam sozinhos.

                Dois erros aqui NAO sao bugs do seu codigo -- sao fatos da vida com LLMs:

                1) LIMITE DE USO (429). Um time de agentes conversa varias vezes com o
                   modelo para responder uma unica pergunta, entao gasta muitos tokens.
                   Existem dois limites diferentes, e a diferenca importa: o POR MINUTO
                   (TPM) libera em segundos, e vale a pena esperar; o DIARIO (TPD) pode
                   pedir horas, e ai esperar dentro do app nao faz sentido nenhum.

                2) FERRAMENTA INVENTADA (tool_use_failed). De vez em quando o modelo pede
                   uma ferramenta que nao existe -- por exemplo "duckduckgo_open", que ele
                   conhece de outros contextos. O provedor recusa a requisicao inteira com
                   erro 400. Como isso e sorteio, repetir quase sempre resolve.

                E como pedir informacao a um atendente muito rapido: as vezes ele fala
                rapido demais e erra o nome do formulario. Voce so pede de novo.
                """
                for tentativa in range(1, tentativas + 1):
                    try:
                        return multi_ai_agent.run(pergunta), None
                    except Exception as erro:
                        texto = str(erro)
                        eh_limite = ("rate_limit" in texto) or ("429" in texto)
                        eh_ferramenta = ("tool_use_failed" in texto) or ("was not in request.tools" in texto)

                        if not (eh_limite or eh_ferramenta) or tentativa == tentativas:
                            return None, erro

                        if eh_ferramenta:
                            st.warning(f"O modelo pediu uma ferramenta que nao existe "
                                       f"(tentativa {tentativa} de {tentativas}). Tentando de novo...")
                            continue

                        espera = dsa_segundos_de_espera(texto)
                        if espera > DSA_ESPERA_MAXIMA:
                            # Cota longa (tipicamente a diaria): nao faz sentido segurar a
                            # tela do usuario esperando. Melhor explicar e devolver o erro.
                            return None, erro

                        st.warning(f"Limite de uso por minuto atingido. Aguardando "
                                   f"{espera:.0f}s e tentando novamente "
                                   f"(tentativa {tentativa} de {tentativas})...")
                        time.sleep(espera)
                return None, None


            ai_response, erro_llm = dsa_roda_agentes(
                f"Resumir a recomendação do analista e compartilhar as últimas notícias para {ticker}"
            )

            # Cada tipo de erro tem causa e solucao diferentes. Dizer "deu erro" nao ajuda
            # ninguem; dizer QUAL erro e o que fazer a respeito, sim.
            if erro_llm is not None:
                detalhe = str(erro_llm)
                if ("rate_limit" in detalhe) or ("429" in detalhe):
                    espera = dsa_segundos_de_espera(detalhe, padrao=0.0)
                    cota_diaria = ("per day" in detalhe) or ("TPD" in detalhe) or (espera > DSA_ESPERA_MAXIMA)
                    if cota_diaria:
                        quanto = f"{espera / 3600:.1f} hora(s)" if espera else "algumas horas"
                        st.error(
                            f"**Cota DIARIA do provedor {DSA_PROVEDOR} esgotada.**\n\n"
                            f"O provedor pediu para tentar novamente em {quanto}. Esperar "
                            "dentro do app nao ajuda. As saidas sao: escolher outro provedor "
                            "na barra lateral (basta ter a chave dele no `.env`), usar o Ollama local (que "
                            "nao tem cota), ou aumentar o plano no painel do provedor.\n\n"
                            f"Mensagem original: `{detalhe[:300]}`"
                        )
                    else:
                        st.error(
                            f"**Limite por minuto do provedor {DSA_PROVEDOR} atingido.**\n\n"
                            "Um time de agentes faz varias chamadas ao modelo para responder "
                            "uma unica pergunta. Espere um minuto e clique em Analisar de "
                            "novo, ou escolha um modelo menor no `.env`.\n\n"
                            f"Mensagem original: `{detalhe[:300]}`"
                        )
                elif ("tool_use_failed" in detalhe) or ("was not in request.tools" in detalhe):
                    st.error(
                        "**O modelo insistiu em usar uma ferramenta que nao existe.**\n\n"
                        "Isso acontece de vez em quando e costuma passar na tentativa "
                        "seguinte. Clique em Analisar novamente. Se insistir, troque o "
                        "modelo no `.env` por outro da lista de "
                        "`uv run python dsa_lista_modelos.py`.\n\n"
                        f"Mensagem original: `{detalhe[:300]}`"
                    )
                elif ("model_not_found" in detalhe) or ("does not exist" in detalhe) or ("404" in detalhe):
                    st.error(
                        f"**O modelo `{DSA_MODELO}` nao existe mais no provedor {DSA_PROVEDOR}.**\n\n"
                        "Provedores aposentam modelos o tempo todo -- foi exatamente o que "
                        "aconteceu com os dois modelos originais deste capitulo. Rode "
                        "`uv run python dsa_lista_modelos.py` para ver os nomes validos hoje "
                        "e ajuste o `.env`.\n\n"
                        f"Mensagem original: `{detalhe[:300]}`"
                    )
                elif ("api_key" in detalhe.lower()) or ("401" in detalhe) or ("403" in detalhe):
                    st.error(
                        f"**A chave de API do provedor {DSA_PROVEDOR} foi recusada.**\n\n"
                        "Confira a chave no arquivo `.env` (sem espacos sobrando, sem aspas) "
                        "e veja se ela continua ativa no painel do provedor.\n\n"
                        f"Mensagem original: `{detalhe[:300]}`"
                    )
                else:
                    st.error(
                        f"**Falha ao falar com o provedor {DSA_PROVEDOR} "
                        f"(modelo `{DSA_MODELO}`).**\n\n"
                        f"Mensagem original: `{detalhe[:400]}`"
                    )
                st.stop()

            # Limpa a resposta antes de exibir.
            # O phidata escreve no meio do texto um bloco "Running:" com as chamadas de
            # ferramenta e, no modo time, as linhas "transfer_task_to_<agente>". Isso ajuda
            # a depurar, mas polui a resposta final para o usuario.
            #
            # Detalhe importante: o regex original procurava por
            # "transfer_task_to_finance_ai_agent", um nome que os agentes deste capitulo
            # nunca geram -- o nome real vem do "name" do agente, ou seja,
            # "transfer_task_to_dsa_agente_financeiro". Aqui aceitamos qualquer nome depois
            # de "transfer_task_to_", entao a limpeza funciona mesmo se voce renomear os
            # agentes.
            clean_response = re.sub(r"(Running:[\s\S]*?\n\n)|(^\s*-?\s*transfer_task_to_\w+.*\n?)",
                                    "",
                                    ai_response.content,
                                    flags=re.MULTILINE).strip()

            # Imprime a resposta
            st.markdown(clean_response)

            # Renderiza os gráficos
            st.subheader("Visualização dos Dados")
            dsa_plot_stock_price(hist, ticker)
            dsa_plot_candlestick(hist, ticker)
            dsa_plot_media_movel(hist, ticker)
            dsa_plot_volume(hist, ticker)
    else:
        st.error("Ticker inválido. Insira um símbolo de ação válido.")


# Fim
# Obrigado DSA!




