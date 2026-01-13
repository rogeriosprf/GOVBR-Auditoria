from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.startup import init_app
from app.routers import auditor_route

# 1. Inicialização
app: FastAPI = init_app()

# 2. Rotas de API (Sempre primeiro)
# O prefixo já está no auditor_route.py, então aqui fica limpo
app.include_router(auditor_route.router)

# 3. Healthcheck (Mova para cima do SPA Fallback)
@app.get("/status", tags=["Health"])
async def status():
    return {
        "status": "online",
        "engine": "Llama 3.3 Active",
        "db": "Azure Postgres"
    }

# 4. Arquivos Estáticos
STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory="static"), name="static")

# 5. Rota Raiz
@app.get("/", include_in_schema=False)
async def root():
    return FileResponse(STATIC_DIR / "index.html")

# 6. SPA Fallback (A ÚLTIMA rota de todas)
@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    # Proteção: Se a requisição for para algo que deveria ser API e não existe, 
    # retorna 404 real em vez de entregar o index.html
    if full_path.startswith("api") or full_path.startswith("static"):
        raise HTTPException(status_code=404, detail="Recurso não encontrado")
        
    return FileResponse(STATIC_DIR / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)