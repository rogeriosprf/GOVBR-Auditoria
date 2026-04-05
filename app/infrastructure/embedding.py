import httpx
from app.core.settings import settings
from app.core.logger import logger

class EmbeddingModel:
    def __init__(self, model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model
        self.api_token = settings.hf_token
        
        # ✅ Endpoint CORRETO com pipeline explícito
        self.api_url = (
            f"https://router.huggingface.co/hf-inference/models/"
            f"{self.model_name}/pipeline/feature-extraction"
        )

    def encode(self, texto: str):
        if not self.api_token:
            logger.error("HF_TOKEN não encontrado!")
            raise RuntimeError("Variável HF_TOKEN não configurada.")

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

        # Payload correto para feature-extraction
        payload = {
            "inputs": texto,
            "options": {
                "wait_for_model": True,
                "use_cache": True
            }
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.api_url, headers=headers, json=payload)

                if response.status_code == 200:
                    result = response.json()
                    
                    # Normaliza o resultado (às vezes vem [[[...]]] ou [ [...] ])
                    while isinstance(result, list) and len(result) > 0 and isinstance(result[0], list):
                        result = result[0]
                    
                    return result  # deve ser uma lista de 384 floats

                else:
                    logger.error(f"Erro na API HF: {response.status_code} - {response.text}")
                    raise RuntimeError(f"Falha na API de Embedding: {response.status_code}")

        except Exception as e:
            logger.error(f"Erro de conexão com Hugging Face: {str(e)}")
            # Fallback seguro
            return [0.0] * 384