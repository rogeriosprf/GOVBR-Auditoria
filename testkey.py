import os
from dotenv import load_dotenv
from groq import Groq

# Carrega o .env se existir
load_dotenv()

# DEBUG: Este print vai mostrar no terminal se o Python achou a chave
key = os.environ.get('GROQ_API_KEY')
if key:
    print(f"--- DEBUG CHAVE: {key[:10]}... ---")
else:
    print("--- DEBUG CHAVE: MISSING ---")