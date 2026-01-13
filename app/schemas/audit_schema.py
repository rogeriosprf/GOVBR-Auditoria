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
    total_sigilo: int
    taxa_risco: float
    resumo_gestao: List[GestaoStats]