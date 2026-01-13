# app/core/startup.py
from fastapi import FastAPI
from app.core.settings import settings
from app.infrastructure.data_engine import DataEngine
from app.infrastructure.embedding import EmbeddingModel
from app.infrastructure.groq_client import GroqClient
from app.services.auditor_service import AuditorService

def init_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    data_engine = DataEngine(db_url=settings.database_url)  # conecta ao Postgres real
    embedding_model = EmbeddingModel()                       # OpenAI embeddings
    groq_client = GroqClient()                               # Modelo IA real

    app.state.auditor_service = AuditorService(
        data_engine=data_engine,
        embedding_model=embedding_model,
        groq_client=groq_client
    )

    return app
