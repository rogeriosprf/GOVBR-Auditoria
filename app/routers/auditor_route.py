# app/routers/auditor_route.py
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from app.routers.deps import get_auditor_service
from app.services.auditor_service import AuditorService

router = APIRouter(prefix="/api/auditoria", tags=["Auditoria"])

class ChatPayload(BaseModel):
    mensagem: str

@router.get("/summary")
async def get_summary(service: AuditorService = Depends(get_auditor_service)):
    return service.get_home_stats()

@router.get("/cards")
async def listar_cards(
    q: Optional[str] = Query(None),
    risk: Optional[float] = Query(0.0),
    service: AuditorService = Depends(get_auditor_service)
):
    return service.get_audit_list(busca=q, score_min=risk)

@router.get("/detalhes/{id_viagem}")
async def detalhes(id_viagem: str, service: AuditorService = Depends(get_auditor_service)):
    return service.get_audit_dossie(id_viagem)

@router.post("/chat")
async def chat_ia(payload: ChatPayload, service: AuditorService = Depends(get_auditor_service)):
    resposta = await service.perguntar_ia(payload.mensagem)
    return {"resposta": resposta}
