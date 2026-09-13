# Módulo Especial de Consultoria na Área de Dados com Agentes de IA
# Utilitario de apoio: lista os modelos VALIDOS da sua conta em cada provedor.
#
# Para que serve: nomes de modelo saem do ar sem aviso. Foi o que aconteceu com
# os dois modelos originais deste capitulo -- "deepseek-r1-distill-llama-70b" e
# "llama-3.3-70b-versatile" hoje retornam erro 404 na Groq. Quando o app
# reclamar de "model_not_found", rode este script, escolha um nome da lista e
# coloque no .env.
#
# Uso:  uv run python dsa_lista_modelos.py

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# Mesma regra do app: chave vazia ou com texto de exemplo = nao configurada.
DSA_PLACEHOLDERS = ("seu-", "sua-", "cole-", "coloque", "your-", "xxx", "<")


def dsa_chave_valida(nome_da_variavel):
    valor = (os.getenv(nome_da_variavel) or "").strip().strip('"').strip("'")
    if not valor or valor.lower().startswith(DSA_PLACEHOLDERS):
        return None
    return valor


def titulo(texto):
    print()
    print("=" * 78)
    print(texto)
    print("=" * 78)


def lista_groq():
    titulo("GROQ")
    chave = dsa_chave_valida("GROQ_API_KEY")
    if not chave:
        print("  GROQ_API_KEY nao configurada no .env -- provedor pulado.")
        return
    from groq import Groq

    modelos = sorted(m.id for m in Groq(api_key=chave).models.list().data)
    for m in modelos:
        print("  -", m)
    print(f"  ({len(modelos)} modelos)")


def lista_openai():
    titulo("OPENAI")
    chave = dsa_chave_valida("OPENAI_API_KEY")
    if not chave:
        print("  OPENAI_API_KEY nao configurada no .env -- provedor pulado.")
        return
    from openai import OpenAI

    modelos = sorted(m.id for m in OpenAI(api_key=chave).models.list().data)
    # A conta costuma ter dezenas de modelos (audio, imagem, embeddings...).
    # Mostramos so os de conversa, que sao os que interessam para os agentes.
    conversa = [m for m in modelos if m.startswith(("gpt-", "o1", "o3", "o4"))]
    for m in conversa:
        print("  -", m)
    print(f"  ({len(conversa)} de conversa, {len(modelos)} no total)")


def lista_anthropic():
    titulo("ANTHROPIC")
    chave = dsa_chave_valida("ANTHROPIC_API_KEY")
    if not chave:
        print("  ANTHROPIC_API_KEY nao configurada no .env -- provedor pulado.")
        return
    import anthropic

    modelos = [m.id for m in anthropic.Anthropic(api_key=chave).models.list().data]
    for m in modelos:
        print("  -", m)
    print(f"  ({len(modelos)} modelos)")


def lista_grok():
    titulo("GROK (xAI)")
    chave = dsa_chave_valida("XAI_API_KEY")
    if not chave:
        print("  XAI_API_KEY nao configurada no .env -- provedor pulado.")
        return
    # A xAI usa a MESMA biblioteca da OpenAI. So muda o endereco do servidor.
    from openai import OpenAI

    cliente = OpenAI(api_key=chave, base_url="https://api.x.ai/v1")
    modelos = sorted(m.id for m in cliente.models.list().data)
    for m in modelos:
        print("  -", m)
    print(f"  ({len(modelos)} modelos)")


def lista_ollama():
    titulo("OLLAMA (local, sem chave)")
    import ollama

    endereco = os.getenv("OLLAMA_HOST") or "http://localhost:11434"
    try:
        modelos = ollama.Client(host=endereco, timeout=10).list()["models"]
    except Exception as erro:
        print(f"  Servidor local nao respondeu em {endereco}: {erro}")
        print("  Dica: instale com 'curl -fsSL https://ollama.com/install.sh | sh'")
        return
    for m in modelos:
        print("  -", m["model"])
    print(f"  ({len(modelos)} modelos baixados em {endereco})")


if __name__ == "__main__":
    for funcao in (lista_groq, lista_openai, lista_anthropic, lista_grok, lista_ollama):
        try:
            funcao()
        except Exception as erro:
            print(f"  ERRO ao consultar: {type(erro).__name__}: {erro}")
    print()
    print("Copie o nome escolhido para a variavel de modelo no .env.")
    print("Ex.: GROQ_MODEL=openai/gpt-oss-120b")
