# app/core/settings.py  (ou renomeie seu config.py para settings.py)
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Audit-GOV | Investigador IA"
    debug: bool = False

    # database_url: str = Field(..., alias="DATABASE_URL")
    database_url: str = Field(..., alias="PG_DSN")
    groq_api_key: str = Field(..., alias="GROQ_API_KEY")

    # LLM config (portfólio-friendly)
    groq_model: str = "llama-3.3-70b-versatile"  # ajuste se quiser
    groq_temperature: float = 0.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

settings = Settings()
