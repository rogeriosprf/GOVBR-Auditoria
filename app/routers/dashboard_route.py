# app/routers/dashboard_route.py
from fastapi import APIRouter, Depends
from app.routers.deps import get_auditor_service
from app.services.auditor_service import AuditorService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/kpis")
def get_kpis(service: AuditorService = Depends(get_auditor_service)):
    """Retorna KPIs do resumo executivo"""
    return service.data_engine._execute_query("SELECT * FROM audit_bi.kpi_resumo_executivo LIMIT 1;")

@router.get("/analise-temporal")
def get_analise_temporal(service: AuditorService = Depends(get_auditor_service)):
    """Retorna série temporal de viagens (evolução mensal)"""
    return service.get_analise_temporal()

@router.get("/ranking-destinos")
def get_ranking_destinos(service: AuditorService = Depends(get_auditor_service)):
    """Retorna ranking dos destinos mais visitados"""
    return service.get_ranking_destinos()

@router.get("/ranking-orgaos")
def get_ranking_orgaos(service: AuditorService = Depends(get_auditor_service)):
    """Retorna ranking de órgãos por risco"""
    return service.data_engine._execute_query(
        "SELECT * FROM audit_bi.cubo_ranking_orgaos ORDER BY CAST(qtd_viagens AS INTEGER) DESC LIMIT 20;"
    )

@router.get("/ranking-servidores")
def get_ranking_servidores(service: AuditorService = Depends(get_auditor_service)):
    """Retorna ranking de servidores com maior risco acumulado"""
    return service.get_ranking_servidores()

@router.get("/top-alvos")
def get_top_alvos(service: AuditorService = Depends(get_auditor_service)):
    """Retorna detalhes dos principais alvos de auditoria"""
    return service.data_engine._execute_query(
        "SELECT * FROM audit_bi.cubo_top_alvos_detalhe ORDER BY score_final DESC LIMIT 50;"
    )
