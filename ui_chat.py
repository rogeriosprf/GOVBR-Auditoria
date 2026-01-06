import streamlit as st
import requests

# Configuração da Página
st.set_page_config(page_title="Audit-GOV | Investigador IA", layout="centered")

st.title("🕵️ Auditoria Inteligente")
st.caption("Interface de interrogatório baseada nas anomalias detectadas pelo motor de IA.")

# Inicializar histórico de chat
if "messages" not in st.session_state:
    st.session_state.messages = []

# Exibir mensagens anteriores
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Campo de entrada
if prompt := st.chat_input("Ex: Quais ministérios tiveram gastos acima da média em 2023?"):
    
    # 1. Mostrar mensagem do usuário
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # 2. Chamar a API FastAPI
    with st.chat_message("assistant"):
        with st.spinner("O Auditor está analisando as evidências no Groq..."):
            try:
                # O endpoint que criamos no main.py
                url = "http://127.0.0.1:8000/api/v1/investigar"
                payload = {"pergunta": prompt}
                
                response = requests.post(url, json=payload)
                
                if response.status_code == 200:
                    resposta_texto = response.json()["resposta_auditor"]
                    st.markdown(resposta_texto)
                    st.session_state.messages.append({"role": "assistant", "content": resposta_texto})
                else:
                    st.error(f"Erro na API: {response.status_code}")
            
            except Exception as e:
                st.error(f"Não foi possível conectar à API. Verifique se o Uvicorn está rodando. Erro: {e}")

# Rodapé lateral com status
with st.sidebar:
    st.header("Status do Sistema")
    try:
        status = requests.get("http://127.0.0.1:8000/status").json()
        st.success(f"API Online: {status['message']}")
    except Exception:
        st.error("API Offline")