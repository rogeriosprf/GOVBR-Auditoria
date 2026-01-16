# main.py
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.startup import init_app
from app.core.settings import settings

app: FastAPI = init_app()

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/status", tags=["Health"])
def status():
    return {
        "status": "online",
        "db_configured": bool(settings.database_url),
        "llm_configured": bool(settings.groq_api_key),
        "llm_model": settings.groq_model,
    }

@app.get("/", include_in_schema=False)
def root():
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    if full_path.startswith("api") or full_path.startswith("static"):
        raise HTTPException(status_code=404, detail="Recurso não encontrado")
    return FileResponse(STATIC_DIR / "index.html")
