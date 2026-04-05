import httpx
from app.core.settings import settings
from app.core.logger import logger

class EmbeddingModel:
    def __init__(self, model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model
        self.api_token = settings.hf_token
        # Endpoint obrigatório pelo roteamento novo da HF
        self.api_url = f"https://router.huggingface.co/hf-inference/models/{self.model_name}"

    def encode(self, texto: str):
        if not self.api_token:
            logger.error("HF_TOKEN não encontrado!")
            raise RuntimeError("Variável HF_TOKEN não configurada.")

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
            "x-wait-for-model": "true",
            # O "pulo do gato" para evitar o erro de 'sentences'
            "x-use-pipeline": "feature-extraction" 
        }
        
        payload = {"inputs": texto}

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.api_url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Garante que retornamos apenas a lista de floats [0.1, 0.2, ...]
                    while isinstance(result, list) and len(result) > 0 and isinstance(result[0], list):
                        result = result[0]
                    
                    return result
                else:
                    logger.error(f"Erro na API HF: {response.status_code} - {response.text}")
                    raise RuntimeError(f"Falha na API de Embedding: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Erro de conexão com Hugging Face: {str(e)}")
            # Retorna vetor zerado (384 dim para o MiniLM) em caso de falha crítica
            return [0.0] * 384