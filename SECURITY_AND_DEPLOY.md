# Segurança e Deploy (Resumo Rápido)

Ajustes aplicados:

- Extraiu variáveis sensíveis para variáveis de ambiente:
  - DATABASE_URL
  - GROQ_API_KEY
- Adicionado `.env.example` com placeholders.
- Adicionado endpoint `/status` para health checks.
- Adicionado `/api/stats`, `/api/v1/investigar`, `/audit/consultar` e `/api/auditorias/{case_id}/analise` para compatibilidade com UIs (Streamlit e frontend).
- Tornou inicialização tolerante à ausência de BD/GROQ (retornos 503 com mensagens claras).
- Adicionado `.gitignore` para evitar commitar `.env`.

Como configurar:

1. Copie `.env.example` para `.env` e preencha as variáveis sensíveis.

2. Instale dependências:

   pip install -r requirements.txt

3. Execute o servidor:

   python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

4. Teste:

   - `GET /status` -> {"message": "ok"}
   - `GET /api/auditorias` -> lista (ou 503 se DB não presente)
   - `POST /api/v1/investigar` -> retorna resposta do auditor (ou 503 se GROQ não configurado)

Notas de segurança:
- Não comitar `.env` nem credenciais. Use secret manager em produção.
- Configure CORS para domínios específicos em produção.

Próximos passos recomendados:
- Adicionar testes unitários e integração para os serviços de DB e Groq.
- Adicionar GitHub Actions para lint + testes.
- Introduzir logging estruturado e métricas.
