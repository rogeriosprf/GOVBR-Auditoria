# app/routers/auditor_route.py
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from typing import Optional
from app.routers.deps import get_auditor_service
from app.services.auditor_service import AuditorService
from app.schemas.audit_schema import AuditListResponse, AuditCard

router = APIRouter(prefix="/api/auditoria", tags=["Auditoria"])

class ChatPayload(BaseModel):
    mensagem: str
    id_viagem: Optional[str] = None

class InsightPayload(BaseModel):
    titulo: str
    valor: Optional[str] = None
    detalhe: Optional[str] = None
    tipo: Optional[str] = None

@router.get("/summary")
def get_summary(service: AuditorService = Depends(get_auditor_service)):
    return service.get_home_stats()

@router.get("/viagens", response_model=AuditListResponse)
def listar_viagens(
    busca: str = "", 
    criticidade: Optional[str] = None,
    urgente: Optional[bool] = None,
    service: AuditorService = Depends(get_auditor_service)):
    dados_banco = service.get_viagens_auditaveis(busca, criticidade, urgente)
    
    # Monta o objeto de resposta seguindo o Schema
    return {
        "total_encontrados": len(dados_banco),
        "termo_busca": busca,
        "nivel_risco": criticidade or "Todos",
        "viagens": dados_banco
    }

@router.get("/criticidades")
def listar_criticidades(service: AuditorService = Depends(get_auditor_service)):
    return service.get_criticidades()

@router.get("/insights")
def listar_insights(service: AuditorService = Depends(get_auditor_service)):
    return service.get_insights()

@router.get("/control-summary")
def control_summary(mes: Optional[str] = None, service: AuditorService = Depends(get_auditor_service)):
    return service.get_control_summary(mes)

@router.get("/control-alertas")
def control_alertas(service: AuditorService = Depends(get_auditor_service)):
    return service.get_control_alerts()

@router.get("/control-fila")
def control_fila(service: AuditorService = Depends(get_auditor_service)):
    return service.get_control_queue(10)

@router.get("/control-conformidade")
def control_conformidade(service: AuditorService = Depends(get_auditor_service)):
    return service.get_control_compliance()

@router.get("/control-orgaos")
def control_orgaos(service: AuditorService = Depends(get_auditor_service)):
    return service.get_control_orgaos()

@router.get("/control-urgentes")
def control_urgentes(service: AuditorService = Depends(get_auditor_service)):
    return service.get_control_urgentes()

@router.get("/control-pagamentos")
def control_pagamentos(mes: Optional[str] = None, service: AuditorService = Depends(get_auditor_service)):
    return service.get_control_payment_monitor(mes)

@router.get("/control-pagamentos-outliers")
def control_pagamentos_outliers(mes: Optional[str] = None, service: AuditorService = Depends(get_auditor_service)):
    return service.get_control_payment_outliers(mes, 5)

@router.get("/control-pagamentos-tardias")
def control_pagamentos_tardias(mes: Optional[str] = None, service: AuditorService = Depends(get_auditor_service)):
    return service.get_control_payment_late_purchases(mes, 5)

@router.get("/control-pagamentos-casos")
def control_pagamentos_casos(service: AuditorService = Depends(get_auditor_service)):
    return service.get_control_payment_actionable_cases(10)

@router.get("/detalhes/{id_viagem}")
def detalhes(id_viagem: str, service: AuditorService = Depends(get_auditor_service)):
    return service.get_audit_dossie(id_viagem)

@router.post("/chat")
def chat_ia(payload: ChatPayload, service: AuditorService = Depends(get_auditor_service)):
    resposta = service.perguntar_ia(payload.mensagem, payload.id_viagem)
    return {"resposta": resposta}

@router.get("/chat/analise-caso/{id_viagem}")
def chat_analise_caso(id_viagem: str, service: AuditorService = Depends(get_auditor_service)):
    resposta = service.analisar_caso_ia(id_viagem)
    return {"id_viagem": id_viagem, "resposta": resposta}

@router.post("/chat/analise-insight")
def chat_analise_insight(payload: InsightPayload, service: AuditorService = Depends(get_auditor_service)):
    insight = {
        "titulo": payload.titulo,
        "valor": payload.valor,
        "detalhe": payload.detalhe,
        "tipo": payload.tipo,
    }
    blocos = service.analisar_insight_ia(insight)
    resposta = service.format_insight_blocos_texto(blocos)
    return {"insight": insight, "blocos": blocos, "resposta": resposta}

@router.get("/ia-status")
def ia_status(request: Request, service: AuditorService = Depends(get_auditor_service)):
    return service.get_ia_status(getattr(request.app.state, "embedding_error", None))
