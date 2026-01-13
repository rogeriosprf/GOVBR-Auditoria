from pydantic import BaseModel

class MessageResponse(BaseModel):
    content: str
    role: str  # 'user' ou 'assistant'
