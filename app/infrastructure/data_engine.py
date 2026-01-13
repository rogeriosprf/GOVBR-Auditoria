# app/infrastructure/data_engine.py
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from pgvector.psycopg2 import register_vector
from typing import List, Dict, Any, Optional
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DataEngine:
    def __init__(self, db_url: str):
        if not db_url:
            raise ValueError("DATABASE_URL não configurado")
        self.db_url = db_url

    @contextmanager
    def _get_connection(self):
        conn = None
        try:
            conn = psycopg2.connect(self.db_url)
            register_vector(conn)
            yield conn
        except Exception as e:
            logger.error(f"Erro na conexão: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def fetch_dashboard_summary(self) -> Dict[str, Any]:
        query = "SELECT * FROM audit_bi.fn_get_dashboard_summary();"
        result = self._execute_query(query)
        return result[0] if result else {}

    def fetch_lista_orgaos(self) -> List[Dict[str, Any]]:
        query = "SELECT * FROM audit_bi.fn_get_ranking_orgaos();"
        return self._execute_query(query)

    def fetch_viagens_filtradas(self, busca: Optional[str] = None, score_min: float = 0.0) -> List[Dict[str, Any]]:
        query = "SELECT * FROM audit_consulta.fn_get_viagens_auditaveis(%s, %s);"
        return self._execute_query(query, (busca, score_min))

    def fetch_detalhe_viagem(self, id_viagem: str) -> Dict[str, Any]:
        query = "SELECT * FROM audit_consulta.fn_get_detalhe_viagem(%s);"
        res = self._execute_query(query, (id_viagem,))
        if not res:
            return {"viagem": {}, "trechos": []}
        return {
            "viagem": res[0].get("viagem_json"),
            "trechos": res[0].get("trechos_json")
        }

    def fetch_contexto_rag(self, vetor_pergunta) -> List[Dict[str, Any]]:
        query = """
            SELECT narrativa_txt, score_final, nivel_criticidade
            FROM audit_consulta.base_rag_vetorizada
            ORDER BY vetor_embedding <=> %s::vector
            LIMIT 5;
        """
        return self._execute_query(query, (vetor_pergunta,), use_real_dict=False)

    def _execute_query(self, query, params=None, use_real_dict=True):
        try:
            with self._get_connection() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor if use_real_dict else None)
                cur.execute(query, params or ())
                rows = cur.fetchall()
                if not use_real_dict:
                    columns = [desc[0] for desc in cur.description]
                    rows = [dict(zip(columns, row)) for row in rows]
                return rows
        except Exception as e:
            logger.error(f"Erro ao executar query: {query[:100]}... | {e}")
            return []
