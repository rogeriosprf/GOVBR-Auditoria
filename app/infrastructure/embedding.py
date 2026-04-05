import httpx
from app.core.settings import settings
from app.core.logger import logger

class EmbeddingModel:
    def __init__(self, model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model
        self.api_token = settings.hf_token
        # Endpoint atualizado conforme o log de erro do Render
        self.api_url = f"https://router.huggingface.co/hf-inference/models/{self.model_name}"

    def encode(self, texto: str):
        if not self.api_token:
            logger.error("HF_TOKEN não encontrado!")
            raise RuntimeError("Variável HF_TOKEN não configurada.")

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "X-Wait-For-Model": "true",
            "Content-Type": "application/json"
        }
        
        # O payload correto para evitar o erro 400 (SentenceSimilarityPipeline)
        payload = {
            "inputs": [texto],  # Enviando como lista para garantir feature-extraction
            "options": {"wait_for_model": True}
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.api_url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # A API de feature-extraction retorna [[[...]]] ou [[...]]
                    # Precisamos extrair até chegar na lista de números (float)
                    while isinstance(result, list) and len(result) > 0 and isinstance(result[0], list):
                        result = result[0]
                    
                    return result
                else:
                    logger.error(f"Erro na API HF: {response.status_code} - {response.text}")
                    raise RuntimeError(f"Falha na API de Embedding: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Erro de conexão com Hugging Face: {str(e)}")
            # Fallback para o sistema não travar, retornando vetor zerado de 384 dimensões
            return [0.0] * 384