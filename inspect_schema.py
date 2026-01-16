from app.core.settings import settings
from app.infrastructure.data_engine import DataEngine
import json

def inspect():
    try:
        engine = DataEngine(settings.database_url)
        
        tables = [
            "cubo_analise_temporal",
            "cubo_ranking_destinos",
            "cubo_ranking_servidores"
        ]
        
        for t in tables:
            print(f"--- {t} ---")
            query = f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'audit_bi' AND table_name = '{t}';
            """
            cols = engine._execute_query(query)
            print(json.dumps(cols))

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect()
