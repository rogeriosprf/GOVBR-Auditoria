import os
import psycopg2
from psycopg2.extras import RealDictCursor

class StatsService:
    def __init__(self):
        # Read DB URL from environment
        self.db_url = os.environ.get("DATABASE_URL")

    def get_dashboard_stats(self):
        if not self.db_url:
            return {"error": "Database not configured"}
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Puxa o ranking que geramos no cubo
            cur.execute("""
                SELECT nome_do_orgao_superior, percentual_anomalias, valor_sob_risco, total_viagens_orgao 
                FROM audit_bi.ranking_risco_orgao 
                ORDER BY valor_sob_risco DESC LIMIT 10
            """)
            ranking = cur.fetchall()

            # Puxa estatísticas por gestão
            cur.execute("SELECT * FROM audit_bi.estatisticas_gestao")
            gestao = cur.fetchall()

            cur.close()
            conn.close()
            return {"ranking": ranking, "gestao": gestao}
        except Exception as e:
            return {"error": str(e)}