import importlib

class EmbeddingModel:
    def __init__(self, model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        try:
            sentence_transformers = importlib.import_module("sentence_transformers")
        except Exception as exc:
            raise RuntimeError(
                "Falha ao importar sentence_transformers. "
                "Instale dependencias compativeis (sentence-transformers, transformers, torch) "
                "ou ajuste a versao do Python."
            ) from exc
        self.model = sentence_transformers.SentenceTransformer(model)

    def encode(self, texto: str):
        # normalize_embeddings ajuda bastante em busca vetorial
        return self.model.encode(texto, normalize_embeddings=True).tolist()
