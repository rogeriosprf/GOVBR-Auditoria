# app/infrastructure/embedding.py
import openai

class EmbeddingModel:
    def __init__(self, model="text-embedding-3-small"):
        self.model = model

    def encode(self, texto: str):
        resp = openai.Embedding.create(input=texto, model=self.model)
        return resp["data"][0]["embedding"]
