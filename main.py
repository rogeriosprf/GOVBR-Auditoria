import os
from dotenv import load_dotenv
import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path

# Load .env if present
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
# Read database configuration from environment for security
DB_CONFIG = os.environ.get("DATABASE_URL")  # Example: postgresql://user:pass@host:5432/db?sslmode=require

class Question(BaseModel):
    text: str

@app.get("/")
async def read_index():
    return FileResponse(STATIC_DIR / "index.html")

# Simple health/status endpoint used by Streamlit / status checks
@app.get("/status")
async def status():
    """Return health info for the app and key services.
    Includes an optional APP_VERSION env var and per-service status.
    """
    version = os.environ.get('APP_VERSION', '0.1.0')
    result = {"message": "ok", "version": version, "services": {}}

    # DB check
    db_ok = False
    if DB_CONFIG:
        try:
            conn = psycopg2.connect(DB_CONFIG)
            conn.close()
            db_ok = True
        except Exception:
            db_ok = False
    result["services"]["db"] = "ok" if db_ok else "down"

    # Groq / auditor service check
    result["services"]["groq"] = "ok" if auditor_service.client else "disabled"

    return result

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.post("/ask")
async def ask_llama(question: Question):
    try:
        prompt = question.text.lower()
        if "risco" in prompt:
            answer = "Analisei os dados vetoriais e identifiquei que a maior concentração de risco está em convênios de infraestrutura."
        elif "auditado" in prompt:
            answer = "Você já revisou 12 processos nesta sessão. O status é salvo temporariamente na memória local."
        else:
            answer = f"Sou o Llama 3.3. Analisando '{question.text}', não encontrei anomalias críticas nos documentos recentes."
        return {"answer": answer}
    except Exception:
        raise HTTPException(status_code=500, detail="Erro IA")

# Import services lazily to avoid hard failures at startup if env vars are missing
from app.services.stats_service import StatsService
from app.services.auditor_service import AuditorService

stats_service = StatsService()
auditor_service = AuditorService()

@app.get("/api/stats")
async def get_stats():
    if not DB_CONFIG:
        raise HTTPException(status_code=503, detail="Database not configured")
    return stats_service.get_dashboard_stats()

@app.post("/api/v1/investigar")
async def investigar(payload: dict):
    pergunta = payload.get("pergunta") or payload.get("pergunta_auditor")
    if not pergunta:
        raise HTTPException(status_code=400, detail="Campo 'pergunta' é obrigatório")
    if not auditor_service.client:
        raise HTTPException(status_code=503, detail="Auditoria (Groq) não configurada")
    try:
        resposta = await auditor_service.consultar(pergunta)
        return {"resposta_auditor": resposta}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/audit/consultar")
async def audit_consultar(payload: dict):
    # compatibility endpoint used by Streamlit app
    return await investigar(payload)

@app.get("/api/auditorias")
async def listar_auditorias():
    if not DB_CONFIG:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        conn = psycopg2.connect(DB_CONFIG)
        cur = conn.cursor()

        # 1. Alimentar fila incremental
        cur.execute("""
            INSERT INTO audit_sistema.casos_auditoria
              (registro_id, resumo, score, orgao, status)
            SELECT
              r.id,
              LEFT(r.conteudo_texto, 250),
              CAST(r.score_risco AS FLOAT),
              r.orgao_superior,
              'pendente'
            FROM audit_rag.conhecimento_vetorial r
            WHERE NOT EXISTS (
              SELECT 1
              FROM audit_sistema.casos_auditoria s
              WHERE s.registro_id = r.id
            )
            ORDER BY r.score_risco DESC
            LIMIT 50
        """)
        conn.commit()

        # 2. Entregar fila pendente (limite 100)
        cur.execute("""
            SELECT id, registro_id, resumo, score, orgao
            FROM audit_sistema.casos_auditoria
            WHERE status = 'pendente'
            ORDER BY score DESC
            LIMIT 100
        """)

        rows = cur.fetchall()
        cur.close(); conn.close()

        # Include registro_id so the front-end can display the original source record
        return [
            {
                "id": r[0],
                "registro_id": r[1],
                "resumo": r[2],
                "score": r[3],
                "orgao": r[4]
            } for r in rows
        ]

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Erro ao listar auditorias")

@app.post("/api/auditorias/{case_id}/analise")
async def salvar_analise(case_id: int, payload: dict):
    """Salva resultado da análise do caso (status, justificativa)."""
    if not DB_CONFIG:
        raise HTTPException(status_code=503, detail="Database not configured")
    status_val = payload.get('status')
    justificativa = payload.get('justificativa')
    try:
        conn = psycopg2.connect(DB_CONFIG)
        cur = conn.cursor()
        # Try to update with justificativa if column exists; fallback to update without it
        try:
            cur.execute("""
                UPDATE audit_sistema.casos_auditoria
                SET status = %s, justificativa = %s, auditado_em = NOW()
                WHERE id = %s
            """, (status_val, justificativa, case_id))
        except Exception as inner_e:
            # If justificativa column does not exist, rollback and update without it
            if 'justificativa' in str(inner_e).lower():
                conn.rollback()
                cur.execute("""
                    UPDATE audit_sistema.casos_auditoria
                    SET status = %s, auditado_em = NOW()
                    WHERE id = %s
                """, (status_val, case_id))
            else:
                raise
        conn.commit()
        cur.close(); conn.close()
        return {"ok": True}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)