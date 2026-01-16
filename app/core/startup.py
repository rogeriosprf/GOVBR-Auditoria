# app/core/startup.py
from fastapi import FastAPI
from app.core.settings import settings
from app.core.middlewares import register_middlewares
from app.core.logger import logger
from app.infrastructure.data_engine import DataEngine
from app.infrastructure.embedding import EmbeddingModel
from app.infrastructure.groq_client import GroqClient
from app.services.auditor_service import AuditorService
from app.routers import auditor_route, dashboard_route

def init_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    # Logger + middlewares
    logger.info("Iniciando app: %s", settings.app_name)
    register_middlewares(app)

    # Infra
    data_engine = DataEngine(db_url=settings.database_url)
    embedding_model = EmbeddingModel()
    groq_client = GroqClient(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=settings.groq_temperature,
    )

    # Service
    app.state.auditor_service = AuditorService(
        data_engine=data_engine,
        embedding_model=embedding_model,
        groq_client=groq_client,
    )

    # Routers
    app.include_router(auditor_route.router)
    app.include_router(dashboard_route.router)

    return app
