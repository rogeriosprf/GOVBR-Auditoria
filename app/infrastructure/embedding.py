import httpx
from app.core.settings import settings
from app.core.logger import logger

class EmbeddingModel:
    def __init__(self, model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model
        self.api_token = settings.hf_token
        # Usamos o endpoint de inference direto para evitar o erro de roteamento
        self.api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.model_name}"

    def encode(self, texto: str):
        if not self.api_token:
            logger.error("HF_TOKEN não encontrado!")
            raise RuntimeError("Variável HF_TOKEN não configurada.")

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        # Enviamos apenas a string pura em "inputs"
        payload = {"inputs": texto}

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.api_url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Garante que estamos pegando a lista de floats simples
                    # A API de feature-extraction pode retornar [[...]]
                    if isinstance(result, list) and len(result) > 0:
                        return result[0] if isinstance(result[0], list) else result
                    return result
                else:
                    logger.error(f"Erro na API HF: {response.status_code} - {response.text}")
                    raise RuntimeError(f"Falha na API de Embedding: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Erro de conexão com Hugging Face: {str(e)}")
            return [0.0] * 384