# app/infrastructure/data_engine.py
import logging
from datetime import date
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
        """Conexão resiliente com retry para Render"""
        conn = None
        for attempt in range(3):
            try:
                conn = psycopg2.connect(
                    self.db_url,
                    connect_timeout=10,
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=5,
                )
                register_vector(conn)
                yield conn
                return
            except psycopg2.OperationalError as e:
                error_msg = str(e).lower()
                if any(k in error_msg for k in ["ssl", "closed", "reset", "no connection"]):
                    logger.warning(f"Tentativa {attempt+1}/3: SSL connection closed. Reconectando...")
                    if conn:
                        try: conn.close()
                        except: pass
                    if attempt == 2:
                        raise
                    continue
                else:
                    logger.error(f"Erro no banco: {e}")
                    raise
            except Exception as e:
                logger.error(f"Erro inesperado: {e}")
                raise
            finally:
                if conn:
                    try: conn.close()
                    except: pass

    # ====================== MÉTODOS CORRIGIDOS ======================

    def fetch_contexto_rag(self, vetor_pergunta) -> List[Dict[str, Any]]:
        """Método corrigido - usado pelo Chat IA"""
        query = """
            SELECT
                conteudo_texto AS narrativa_txt,
                score_risco AS score_final,
                criticidade AS nivel_criticidade
            FROM audit_rag.conhecimento_vetorial
            ORDER BY vetor_embedding <=> %s::vector
            LIMIT 5;
        """
        return self._execute_query(query, (vetor_pergunta,), use_real_dict=True)

    def fetch_insights(self) -> List[Dict[str, Any]]:
        """Corrigido COALESCE boolean x integer"""
        insights = []

        def first_value(rows, key, default=0):
            if not rows:
                return default
            return rows[0].get(key, default)

        # === Total de viagens ===
        total_viagens = first_value(
            self._execute_query("SELECT COUNT(*) AS total FROM audit_search.viagens;"),
            "total", 0
        )
        insights.append({
            "titulo": "Total de viagens",
            "valor": int(total_viagens or 0),
            "detalhe": "na base auditável",
            "tipo": "kpi",
        })

        # === Viagens urgentes - CORRIGIDO ===
        urgentes = first_value(
            self._execute_query(
                """
                SELECT COUNT(*) AS total 
                FROM audit_search.viagens 
                WHERE viagem_urgente IS TRUE;
                """
            ),
            "total", 0
        )
        insights.append({
            "titulo": "Viagens urgentes",
            "valor": int(urgentes or 0),
            "detalhe": "marcadas como urgentes",
            "tipo": "alerta",
        })

        # === Devoluções ===
        devolucao = self._execute_query(
            """
            SELECT COUNT(*) AS qtd, COALESCE(SUM(valor_devolucao), 0) AS total
            FROM audit_search.viagens 
            WHERE COALESCE(valor_devolucao, 0) > 0;
            """
        )
        devolucao_qtd = first_value(devolucao, "qtd", 0)
        devolucao_total = first_value(devolucao, "total", 0)

        insights.append({
            "titulo": "Devoluções registradas",
            "valor": int(devolucao_qtd or 0),
            "detalhe": f"R$ {float(devolucao_total or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "tipo": "financeiro",
        })

        # === Total pago ===
        total_pagamentos = first_value(
            self._execute_query("SELECT COALESCE(SUM(valor), 0) AS total FROM audit_search.pagamentos;"),
            "total", 0
        )
        insights.append({
            "titulo": "Total pago",
            "valor": f"R$ {float(total_pagamentos or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "detalhe": "somatório de pagamentos",
            "tipo": "financeiro",
        })

        # === Maior órgão pagador ===
        top_orgao = self._execute_query(
            """
            SELECT nome_do_orgao_pagador, COALESCE(SUM(valor), 0) AS total
            FROM audit_search.pagamentos
            WHERE nome_do_orgao_pagador IS NOT NULL
            GROUP BY nome_do_orgao_pagador
            ORDER BY total DESC LIMIT 1;
            """
        )
        insights.append({
            "titulo": "Maior órgão pagador",
            "valor": first_value(top_orgao, "nome_do_orgao_pagador", "—"),
            "detalhe": f"R$ {float(first_value(top_orgao, 'total', 0) or 0):,.2f}"
                      .replace(",", "X").replace(".", ",").replace("X", "."),
            "tipo": "orgao",
        })

        # === Destino mais recorrente ===
        top_destino = self._execute_query(
            """
            SELECT destinos, COUNT(*) AS total
            FROM audit_search.viagens
            WHERE destinos IS NOT NULL AND trim(destinos) <> ''
            GROUP BY destinos
            ORDER BY total DESC LIMIT 1;
            """
        )
        insights.append({
            "titulo": "Destino mais recorrente",
            "valor": first_value(top_destino, "destinos", "—"),
            "detalhe": f"{int(first_value(top_destino, 'total', 0) or 0)} viagens",
            "tipo": "rota",
        })

        return insights

    def _execute_query(self, query, params=None, use_real_dict=True):
        """Método central de execução com tratamento melhorado"""
        try:
            with self._get_connection() as conn:
                cursor_factory = RealDictCursor if use_real_dict else None
                cur = conn.cursor(cursor_factory=cursor_factory)
                cur.execute(query, params or ())
                rows = cur.fetchall()

                # Conversão manual quando não usa RealDictCursor
                if not use_real_dict and rows and cur.description:
                    columns = [desc[0] for desc in cur.description]
                    rows = [dict(zip(columns, row)) for row in rows]

                return rows or []
        except Exception as e:
            logger.error(f"Erro ao executar query: {query[:180]}... | {e}")
            raise

    # ====================== OUTROS MÉTODOS (mantidos iguais) ======================
    # ... (todos os outros métodos como fetch_dashboard_summary, fetch_ranking_*, etc.)

    def fetch_control_payment_monitor(self, month: Optional[str] = None) -> Dict[str, Any]:
        # (mantido igual ao que você tinha, só usando o novo _get_connection)
        serie_query = """
            WITH params AS (
                SELECT COALESCE(%s::int, 
                    (SELECT EXTRACT(MONTH FROM MAX(dia))::int 
                     FROM audit_bi.cubo_total_pagamentos_por_dia WHERE dia IS NOT NULL)
                ) AS month_num
            )
            SELECT
                to_char(c.dia, 'DD') AS dia,
                COALESCE(SUM(c.total), 0) AS total,
                p.month_num AS mes_ref
            FROM audit_bi.cubo_total_pagamentos_por_dia c
            CROSS JOIN params p
            WHERE c.dia IS NOT NULL AND EXTRACT(MONTH FROM c.dia) = p.month_num
            GROUP BY to_char(c.dia, 'DD'), p.month_num
            ORDER BY to_char(c.dia, 'DD')::int ASC;
        """
        today = date.today()
        month_num = self._parse_month_number(month)

        with self._get_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(serie_query, (month_num,))
            serie = cur.fetchall() or []

        pico = max(serie, key=lambda row: float(row.get("total") or 0), default=None)
        total_mes = sum(float(row.get("total") or 0) for row in serie)
        mes_ref = int(serie[0].get("mes_ref")) if serie and serie[0].get("mes_ref") is not None else (month_num or today.month)

        return {
            "serie": serie,
            "pico": pico,
            "total_mes": total_mes,
            "meses": [],
            "mes_atual": f"{mes_ref:02d}",
            "ano_atual": today.year,
        }

    def _parse_month_number(self, month: Optional[str]) -> Optional[int]:
        month_num = None
        if month is not None:
            raw = str(month).strip()
            if len(raw) == 7 and raw[4] == "-" and raw[:4].isdigit() and raw[5:7].isdigit():
                month_num = int(raw[5:7])
            elif raw.isdigit():
                month_num = int(raw)
            if month_num is not None and (month_num < 1 or month_num > 12):
                month_num = None
        return month_num