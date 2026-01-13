# app/routers/auditor_route.py
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from app.routers.deps import get_auditor_service
from app.services.auditor_service import AuditorService
from app.schemas.audit_schema import AuditListResponse, AuditCard

router = APIRouter(prefix="/api/auditoria", tags=["Auditoria"])

class ChatPayload(BaseModel):
    mensagem: str

@router.get("/summary")
async def get_summary(service: AuditorService = Depends(get_auditor_service)):
    return service.get_home_stats()

@router.get("/viagens", response_model=AuditListResponse)
def listar_viagens(
    busca: str = "", 
    score_min: float = 0.0, 
    service: AuditorService = Depends(get_auditor_service)):
    dados_banco = service.get_viagens_auditaveis(busca, score_min)
    
    # Monta o objeto de resposta seguindo o Schema
    return {
        "total_encontrados": len(dados_banco),
        "termo_busca": busca,
        "nivel_risco": "Crítico" if score_min >= 0.8 else "Alerta" if score_min >= 0.5 else "Todos",
        "viagens": dados_banco
    }

@router.get("/detalhes/{id_viagem}")
async def detalhes(id_viagem: str, service: AuditorService = Depends(get_auditor_service)):
    return service.get_audit_dossie(id_viagem)

@router.post("/chat")
async def chat_ia(payload: ChatPayload, service: AuditorService = Depends(get_auditor_service)):
    resposta = await service.perguntar_ia(payload.mensagem)
    return {"resposta": resposta}
