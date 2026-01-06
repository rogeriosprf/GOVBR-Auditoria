import os
import psycopg2
from groq import Groq
from sentence_transformers import SentenceTransformer
from pgvector.psycopg2 import register_vector

class AuditorService:
    def __init__(self):
        # 1. Configurações de API e DB (lidas de variáveis de ambiente)
        self.api_key = os.environ.get("GROQ_API_KEY")
        self.db_url = os.environ.get("DATABASE_URL")
        
        if not self.api_key:
            # Do not crash at import time; log a warning and leave client uninitialized
            print("⚠️ GROQ_API_KEY não encontrada; funcionalidades de LLM estarão limitadas.")
            self.client = None
        else:
            self.client = Groq(api_key=self.api_key)

        self.llm_model = "llama-3.3-70b-versatile"
        self.embed_model = None  # Lazy load

    def _ensure_embed_model(self):
        if not self.embed_model:
            print("🧠 Carregando modelo de busca vetorial (lazy)...")
            self.embed_model = SentenceTransformer('intfloat/multilingual-e5-small')

    def _buscar_contexto_no_azure(self, pergunta: str):
        """Busca os casos mais relevantes no Azure usando busca vetorial."""
        try:
            if not self.db_url:
                return "Base de dados não configurada para busca vetorial."

            self._ensure_embed_model()
            # Transforma a pergunta em vetor (prefixo 'query: ' é padrão do modelo E5)
            vetor_pergunta = self.embed_model.encode(f"query: {pergunta}").tolist()

            conn = psycopg2.connect(self.db_url)
            register_vector(conn) # Habilita suporte ao pgvector
            cur = conn.cursor()

            # BUSCA VETORIAL: Busca os 5 casos mais parecidos com a pergunta
            query = """
                SELECT conteudo_texto, gestao, orgao_superior, score_risco, criticidade
                FROM audit_rag.conhecimento_vetorial
                ORDER BY vetor_embedding <=> %s::vector
                LIMIT 5;
            """
            cur.execute(query, (vetor_pergunta,))
            rows = cur.fetchall()
            
            # Formata os resultados para o Llama entender
            contexto = "\n\n".join([
                f"Órgão: {r[2]} | Risco: {r[3]:.2f} ({r[4]})\nJustificativa: {r[0]}"
                for r in rows
            ])
            
            cur.close()
            conn.close()
            return contexto if contexto else "Nenhum caso relevante encontrado no banco."
        except Exception as e:
            print(f"❌ Erro na busca vetorial: {e}")
            return "Erro ao acessar a base de dados vetorial."
    async def consultar(self, pergunta: str):
        # 1. Busca o contexto dinâmico no Azure
        contexto_dinamico = self._buscar_contexto_no_azure(pergunta)

        # 2. Envia para o Llama 3.3 responder
        prompt_sistema = f"""
        Você é o SIAV (Sistema de Inteligência em Auditoria de Viagens).
        Sua função é analisar gastos públicos e identificar possíveis fraudes ou anomalias.
        
        Use os seguintes casos reais detectados pela nossa IA para responder:
        ---
        {contexto_dinamico}
        ---
        Regras:
        1. Se o usuário perguntar de um nome ou órgão específico, cite o Score de Risco e a Criticidade.
        2. Seja direto, técnico e imparcial.
        """

        if not self.client:
            # Graceful fallback when Groq client is not configured
            return "Serviço de LLM não configurado (GROQ_API_KEY ausente)"

        chat_completion = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": pergunta}
            ],
            model=self.llm_model,
        )
        return chat_completion.choices[0].message.content