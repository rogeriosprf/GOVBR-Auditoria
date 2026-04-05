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
        """Gerenciador de conexão com retry para problemas de SSL (comum no Render)"""
        conn = None
        for attempt in range(3):  # máximo 3 tentativas
            try:
                conn = psycopg2.connect(
                    self.db_url,
                    connect_timeout=10,
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=5,
                )
                
                # Registra o tipo vector do pgvector
                register_vector(conn)
                
                yield conn
                return  # se chegou aqui, deu certo
                
            except psycopg2.OperationalError as e:
                error_msg = str(e).lower()
                
                # Erros típicos de SSL / conexão fechada pelo Render
                if any(keyword in error_msg for keyword in [
                    "ssl connection has been closed",
                    "server closed the connection",
                    "connection reset",
                    "no connection to the server"
                ]):
                    logger.warning(f"Tentativa {attempt + 1}/3: Conexão SSL fechada inesperadamente. Reconectando...")
                    
                    if conn:
                        try:
                            conn.close()
                        except:
                            pass
                    conn = None
                    
                    if attempt == 2:  # última tentativa
                        logger.error("Falha após 3 tentativas de reconexão com o banco.")
                        raise
                    continue  # tenta novamente
                
                else:
                    # Outro erro do PostgreSQL
                    logger.error(f"Erro de conexão com o banco: {e}")
                    raise
                    
            except Exception as e:
                logger.error(f"Erro inesperado ao conectar no banco: {e}")
                raise
                
            finally:
                if conn:
                    try:
                        conn.close()
                    except:
                        pass

    # ==================== MÉTODOS DE CONSULTA ====================

    def fetch_dashboard_summary(self) -> Dict[str, Any]:
        query = "SELECT * FROM audit_bi.kpi_resumo_executivo;"
        result = self._execute_query(query)
        return result[0] if result else {}

    def fetch_lista_orgaos(self) -> List[Dict[str, Any]]:
        query = "SELECT * FROM audit_bi.fn_get_ranking_orgaos();"
        return self._execute_query(query)

    def fetch_viagens_auditaveis(self, busca: Optional[str] = None, criticidade: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM audit_search.fn_get_viagens_auditaveis(%s, %s);"
        crit_param = criticidade if (criticidade and str(criticidade).strip()) else None
        return self._execute_query(query, (busca, crit_param))

    def fetch_analise_temporal(self) -> List[Dict[str, Any]]:
        query = "SELECT * FROM audit_bi.cubo_analise_temporal ORDER BY mes ASC;"
        return self._execute_query(query)

    def fetch_ranking_destinos(self) -> List[Dict[str, Any]]:
        query = """
            SELECT
                cidade AS destinos,
                CAST(qtd_viagens AS INTEGER) AS contagem,
                valor_total,
                percentual_risco AS risco_medio
            FROM audit_bi.cubo_ranking_destinos
            ORDER BY qtd_viagens DESC
            LIMIT 20;
        """
        return self._execute_query(query)

    def fetch_ranking_servidores(self) -> List[Dict[str, Any]]:
        query = "SELECT * FROM audit_bi.cubo_ranking_servidores LIMIT 50;"
        return self._execute_query(query)

    def fetch_ranking_orgaos(self) -> List[Dict[str, Any]]:
        query = """
            SELECT *
            FROM audit_bi.cubo_ranking_orgaos
            ORDER BY CAST(qtd_viagens AS INTEGER) DESC
            LIMIT 20;
        """
        return self._execute_query(query)

    def fetch_top_alvos(self) -> List[Dict[str, Any]]:
        query = """
            SELECT *
            FROM audit_bi.cubo_top_alvos_detalhe
            ORDER BY score_final DESC
            LIMIT 50;
        """
        return self._execute_query(query)

    def fetch_criticidades(self) -> List[Dict[str, Any]]:
        query = """
            SELECT criticidade
            FROM (
                SELECT DISTINCT
                    CASE
                        WHEN upper(nivel_criticidade) IN ('CRITICO', 'CRÍTICO') THEN 'CRÍTICO'
                        WHEN upper(nivel_criticidade) IN ('ALTO', 'ALTA') THEN 'ALTO'
                        WHEN upper(nivel_criticidade) IN ('MEDIO', 'MÉDIO', 'MEDIA', 'MÉDIA') THEN 'MÉDIO'
                        WHEN upper(nivel_criticidade) IN ('BAIXO', 'BAIXA') THEN 'BAIXO'
                        ELSE upper(nivel_criticidade)
                    END AS criticidade,
                    CASE
                        WHEN upper(nivel_criticidade) IN ('CRITICO', 'CRÍTICO') THEN 1
                        WHEN upper(nivel_criticidade) IN ('ALTO', 'ALTA') THEN 2
                        WHEN upper(nivel_criticidade) IN ('MEDIO', 'MÉDIO', 'MEDIA', 'MÉDIA') THEN 3
                        WHEN upper(nivel_criticidade) IN ('BAIXO', 'BAIXA') THEN 4
                        ELSE 5
                    END AS sort_ord
                FROM audit_search.inteligencia_viagens
                WHERE nivel_criticidade IS NOT NULL
                  AND trim(nivel_criticidade) <> ''
            ) t
            ORDER BY t.sort_ord, t.criticidade;
        """
        return self._execute_query(query)

    def fetch_detalhe_viagem(self, id_viagem: str) -> Dict[str, Any]:
        query = "SELECT * FROM audit_search.fn_get_detalhe_viagem(%s);"
        res = self._execute_query(query, (id_viagem,))
        if not res:
            return {"viagem": {}, "trechos": []}
        return {
            "viagem": res[0].get("viagem_json"),
            "trechos": res[0].get("trechos_json")
        }

    def fetch_trechos(self, id_viagem: str) -> List[Dict[str, Any]]:
        query = """
            SELECT
                identificador_do_processo_de_viagem,
                numero_da_proposta_pcdp,
                sequencia_trecho,
                origem_data,
                origem_pais,
                origem_uf,
                origem_cidade,
                destino_data,
                destino_pais,
                destino_uf,
                destino_cidade,
                meio_de_transporte,
                numero_diarias,
                missao
            FROM audit_search.trechos
            WHERE identificador_do_processo_de_viagem = %s
            ORDER BY sequencia_trecho ASC;
        """
        return self._execute_query(query, (id_viagem,))

    def fetch_pagamentos(self, id_viagem: str) -> List[Dict[str, Any]]:
        query = """
            SELECT
                identificador_do_processo_de_viagem,
                numero_da_proposta_pcdp,
                tipo_de_pagamento,
                valor,
                codigo_do_orgao_superior,
                nome_do_orgao_superior,
                codigo_do_orgao_pagador,
                nome_do_orgao_pagador,
                codigo_da_unidade_gestora_pagadora,
                nome_da_unidade_gestora_pagadora
            FROM audit_search.pagamentos
            WHERE identificador_do_processo_de_viagem = %s
            ORDER BY valor DESC NULLS LAST;
        """
        return self._execute_query(query, (id_viagem,))

    def fetch_passagens(self, id_viagem: str) -> List[Dict[str, Any]]:
        query = """
            SELECT
                identificador_do_processo_de_viagem,
                numero_da_proposta_pcdp,
                meio_de_transporte,
                pais_origem_ida,
                uf_origem_ida,
                cidade_origem_ida,
                pais_destino_ida,
                uf_destino_ida,
                cidade_destino_ida,
                pais_origem_volta,
                uf_origem_volta,
                cidade_origem_volta,
                pais_destino_volta,
                uf_destino_volta,
                cidade_destino_volta,
                valor_da_passagem,
                taxa_de_servico,
                data_da_emissao_compra,
                hora_da_emissao_compra
            FROM audit_search.passagens
            WHERE identificador_do_processo_de_viagem = %s
            ORDER BY data_da_emissao_compra DESC NULLS LAST;
        """
        return self._execute_query(query, (id_viagem,))

    def fetch_insights(self) -> List[Dict[str, Any]]:
        insights = []
        def first_value(rows, key, default=0):
            if not rows:
                return default
            return rows[0].get(key, default)

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

        urgentes = first_value(
            self._execute_query(
                "SELECT COUNT(*) AS total FROM audit_search.viagens WHERE COALESCE(viagem_urgente, 0) > 0;"
            ),
            "total", 0
        )
        insights.append({
            "titulo": "Viagens urgentes",
            "valor": int(urgentes or 0),
            "detalhe": "marcadas como urgentes",
            "tipo": "alerta",
        })

        devolucao = self._execute_query(
            """
            SELECT COUNT(*) AS qtd, COALESCE(SUM(valor_devolucao), 0) AS total
            FROM audit_search.viagens WHERE COALESCE(valor_devolucao, 0) > 0;
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

        # ... (o resto do método insights continua igual - não alterei para não ficar muito longo)

        return insights

    # ==================== MÉTODOS DE CONTROLE ====================

    def fetch_control_payment_monitor(self, month: Optional[str] = None) -> Dict[str, Any]:
        # (seu método continua igual, só usa o _get_connection melhorado)
        serie_query = """ ... """  # mantenha seu query original aqui
        # ... resto do método igual

        with self._get_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(serie_query, (self._parse_month_number(month),))
            serie = cur.fetchall() or []
            # ... resto do código igual

    # Outros métodos de control (outliers, tardias, etc.) continuam iguais

    def _parse_month_number(self, month: Optional[str]) -> Optional[int]:
        # seu método original
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

    def _execute_query(self, query, params=None, use_real_dict=True):
        try:
            with self._get_connection() as conn:
                cursor_factory = RealDictCursor if use_real_dict else None
                cur = conn.cursor(cursor_factory=cursor_factory)
                cur.execute(query, params or ())
                rows = cur.fetchall()

                if not use_real_dict and rows:
                    columns = [desc[0] for desc in cur.description]
                    rows = [dict(zip(columns, row)) for row in rows]
                return rows
        except Exception as e:
            logger.error(f"Erro ao executar query: {query[:150]}... | {e}")
            raise