# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Audit-GOV | Investigador IA"
    database_url: str  # obrigatório - erro claro se faltar
    groq_api_key: str  # obrigatório
    debug: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }

settings = Settings()  # instância única