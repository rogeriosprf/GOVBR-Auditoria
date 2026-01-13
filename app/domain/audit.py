from typing import Optional

class AuditRecord:
    def __init__(self, viagem_id: int, nome: str, orgao: str, motivo: str, 
                 score_final: float, nivel_criticidade: float, gestao: str):
        self.viagem_id = viagem_id
        self.nome = nome
        self.orgao = orgao
        self.motivo = motivo
        self.score_final = score_final
        self.nivel_criticidade = nivel_criticidade
        self.gestao = gestao

    def resumo(self) -> str:
        """Retorna um resumo legível da auditoria."""
        return f"{self.nome} ({self.orgao}) - Score: {self.score_final}, Criticidade: {self.nivel_criticidade}"

    def nivel_risco(self) -> str:
        """Classifica o nível de risco com base no score_final."""
        if self.score_final >= 0.8:
            return "Alto"
        elif self.score_final >= 0.5:
            return "Médio"
        else:
            return "Baixo"
