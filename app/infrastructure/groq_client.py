# app/infrastructure/groq_client.py
class GroqClient:
    def __init__(self):
        pass  # configure seu endpoint real ou modelo local aqui

    def perguntar(self, pergunta: str, contexto: list):
        """
        Recebe pergunta e contexto (vetores) e retorna a resposta do modelo.
        """
        # Aqui você pode chamar OpenAI, Llama local ou outro
        # Exemplo simplificado com OpenAI GPT
        import openai
        context_text = "\n".join([c["narrativa_txt"] for c in contexto])
        prompt = f"{context_text}\n\nPergunta: {pergunta}\nResposta:"
        resp = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        return resp["choices"][0]["message"]["content"]
