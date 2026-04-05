import httpx
import time
from app.core.settings import settings
from app.core.logger import logger  # Usando o logger que vi no seu tree

class EmbeddingModel:
    def __init__(self, model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model
        self.api_token = settings.hf_token
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"

    def encode(self, texto: str):
        if not self.api_token:
            logger.error("HF_TOKEN não encontrado nas configurações!")
            raise RuntimeError("Variável HF_TOKEN não configurada.")

        headers = {"Authorization": f"Bearer {self.api_token}"}
        payload = {"inputs": texto, "options": {"wait_for_model": True}}

        try:
            # Usando httpx síncrono para não quebrar a chamada no seu auditor_service
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.api_url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Erro na API HF: {response.status_code} - {response.text}")
                    raise RuntimeError(f"Falha na API de Embedding: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Erro de conexão com Hugging Face: {str(e)}")
            # Fallback: retorna um vetor de zeros para o app não crashar total
            return [0.0] * 384