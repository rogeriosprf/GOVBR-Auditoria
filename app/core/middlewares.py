from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

def register_middlewares(app: FastAPI):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # ou seu domínio específico
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
