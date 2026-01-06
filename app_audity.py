import streamlit as st
import requests

st.set_page_config(page_title="SIAV - Inteligência em Auditoria", layout="wide")

st.title("🕵️‍♂️ SIAV - Sistema de Inteligência em Auditoria")

# Na barra lateral, podes colocar o filtro que o cubo permite
st.sidebar.header("Filtros de IA")
min_risco = st.sidebar.slider("Nível de Risco Mínimo", 0.0, 1.0, 0.5)

# Área do Chat
st.subheader("🤖 Assistente de Auditoria (Llama 3.3 + RAG)")
pergunta = st.text_input("Ex: Por que a viagem da Clarissa Carvalho foi marcada?")

if st.button("Consultar"):
    with st.spinner("Consultando base vetorial no Azure..."):
        # Chama o teu backend FastAPI
        response = requests.post("http://localhost:8000/audit/consultar", json={"pergunta": pergunta})
        if response.status_code == 200:
            st.write(response.json()["resposta"])
        else:
            st.error("Erro ao consultar o serviço de auditoria.")

# Área de Gráficos (Dashboard)
st.divider()
st.subheader("📊 Ranking de Risco por Órgão (Dados do Cubo)")

# Aqui chamarias o teu stats_service
# Exemplo visual rápido:
st.info(f"Exibindo órgãos com score médio acima de {min_risco}")
# O Streamlit leria o cubo_viagens_gestao.parquet que geraste localmente