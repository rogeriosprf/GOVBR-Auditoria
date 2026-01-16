# app/infrastructure/embedding.py
from sentence_transformers import SentenceTransformer

class EmbeddingModel:
    def __init__(self, model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model)

    def encode(self, texto: str):
        # normalize_embeddings ajuda bastante em busca vetorial
        return self.model.encode(texto, normalize_embeddings=True).tolist()
