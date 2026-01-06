from pydantic import BaseModel
from typing import List, Optional

class AuditQuery(BaseModel):
    pergunta: str

class AuditResponse(BaseModel):
    resposta: str
    contexto_utilizado: Optional[List[dict]] = None # Para mostrar os detalhes se quiseres