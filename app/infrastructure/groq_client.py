# app/infrastructure/groq_client.py
from groq import Groq
from typing import List, Dict, Any, Optional

class GroqClient:
    def __init__(self, api_key: str, model: str, temperature: float = 0.0):
        self.client = Groq(api_key=api_key)
        self.model = model
        self.temperature = temperature

    def perguntar(self, pergunta: str, contexto: List[Dict[str, Any]]) -> str:
        # Monta contexto RAG com delimitação clara
        trechos = []
        for i, c in enumerate(contexto or [], start=1):
            txt = (c.get("narrativa_txt") or "").strip()
            score = c.get("score_final")
            crit = c.get("nivel_criticidade")
            if txt:
                trechos.append(f"[Trecho {i} | score={score} | criticidade={crit}]\n{txt}")

        contexto_txt = "\n\n".join(trechos) if trechos else "Sem contexto disponível."

        messages = [
            {
                "role": "system",
                "content": (
                    "Você é um assistente de auditoria. Use APENAS o contexto fornecido. "
                    "Se houver score/criticidade no contexto, mencione explicitamente. "
                    "Não diga que algo está indisponível se estiver no contexto. "
                    "Se um insight citar um nome/órgão e ele estiver no contexto, mencione-o."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"CONTEXTO (RAG):\n{contexto_txt}\n\n"
                    f"PERGUNTA:\n{pergunta}\n\n"
                    "Responda de forma objetiva, com passos/itens quando fizer sentido."
                ),
            },
        ]

        resp = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
        )
        return resp.choices[0].message.content.strip()
