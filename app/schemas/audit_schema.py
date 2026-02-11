from pydantic import BaseModel
from typing import List, Optional

class GestaoStats(BaseModel):
    gestao: str
    viagens: int
    anomalias: int
    sigilo: int
    taxa_risco: float

class DashboardSummary(BaseModel):
    total_viagens: int
    total_critico: int
    total_valor: float
    taxa_risco_global: float
    resumo_gestao: List[GestaoStats]

# Este é o contrato para CADA CARD
class AuditCard(BaseModel):
    id_viagem: str
    nome_viajante: str
    orgao_superior: str
    destino_resumo: str
    valor_total: float
    score_risco: float
    criticidade: str
    urgente: bool

# Este é o contrato para a RESPOSTA DA API da lista
class AuditListResponse(BaseModel):
    total_encontrados: int
    termo_busca: Optional[str]
    nivel_risco: str
    viagens: List[AuditCard]
