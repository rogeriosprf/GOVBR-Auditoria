from fastapi import Request
from app.services.auditor_service import AuditorService

def get_auditor_service(request: Request) -> AuditorService:
    return request.app.state.auditor_service
