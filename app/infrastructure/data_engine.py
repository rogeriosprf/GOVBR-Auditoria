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
        # Assumindo colunas padrao, sem order especifico arriscado por enquanto ou order by risco se existir
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
            "total",
            0,
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
            "total",
            0,
        )
        insights.append({
            "titulo": "Viagens urgentes",
            "valor": int(urgentes or 0),
            "detalhe": "marcadas como urgentes",
            "tipo": "alerta",
        })

        devolucao = self._execute_query(
            """
            SELECT
                COUNT(*) AS qtd,
                COALESCE(SUM(valor_devolucao), 0) AS total
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

        total_pagamentos = first_value(
            self._execute_query("SELECT COALESCE(SUM(valor), 0) AS total FROM audit_search.pagamentos;"),
            "total",
            0,
        )
        insights.append({
            "titulo": "Total pago",
            "valor": f"R$ {float(total_pagamentos or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "detalhe": "somatório de pagamentos",
            "tipo": "financeiro",
        })

        top_orgao = self._execute_query(
            """
            SELECT
                nome_do_orgao_pagador,
                COALESCE(SUM(valor), 0) AS total
            FROM audit_search.pagamentos
            WHERE nome_do_orgao_pagador IS NOT NULL
            GROUP BY nome_do_orgao_pagador
            ORDER BY total DESC
            LIMIT 1;
            """
        )
        insights.append({
            "titulo": "Maior órgão pagador",
            "valor": first_value(top_orgao, "nome_do_orgao_pagador", "—"),
            "detalhe": f"R$ {float(first_value(top_orgao, 'total', 0) or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "tipo": "orgao",
        })

        top_destino = self._execute_query(
            """
            SELECT destinos, COUNT(*) AS total
            FROM audit_search.viagens
            WHERE destinos IS NOT NULL AND trim(destinos) <> ''
            GROUP BY destinos
            ORDER BY total DESC
            LIMIT 1;
            """
        )
        insights.append({
            "titulo": "Destino mais recorrente",
            "valor": first_value(top_destino, "destinos", "—"),
            "detalhe": f"{int(first_value(top_destino, 'total', 0) or 0)} viagens",
            "tipo": "rota",
        })

        return insights

    def check_rag_health(self) -> Dict[str, Any]:
        result = {
            "schema_exists": False,
            "table_exists": False,
            "row_count": None,
            "error": None,
        }
        try:
            schema_rows = self._execute_query(
                "SELECT 1 AS ok FROM information_schema.schemata WHERE schema_name = 'audit_rag' LIMIT 1;"
            )
            result["schema_exists"] = bool(schema_rows)

            table_rows = self._execute_query(
                """
                SELECT 1 AS ok
                FROM information_schema.tables
                WHERE table_schema = 'audit_rag'
                  AND table_name = 'conhecimento_vetorial'
                LIMIT 1;
                """
            )
            result["table_exists"] = bool(table_rows)

            if result["table_exists"]:
                count_rows = self._execute_query(
                    "SELECT COUNT(*) AS total FROM audit_rag.conhecimento_vetorial;"
                )
                if count_rows:
                    result["row_count"] = count_rows[0].get("total")
        except Exception as exc:
            result["error"] = str(exc)
        return result

    def fetch_control_alerts(self) -> List[Dict[str, Any]]:
        rows = self._execute_query(
            """
            SELECT *
            FROM audit_bi.kpi_alertas_operacionais;
            """
        )
        return [
            {
                "titulo": row.get("titulo") or row.get("alerta") or row.get("nome") or "Alerta",
                "total": int(row.get("total", 0) or 0),
                "detalhe": row.get("detalhe") or row.get("descricao") or "",
                "tipo": row.get("tipo") or "geral",
            }
            for row in (rows or [])
        ]

    def fetch_control_queue(self, limit: int = 10) -> List[Dict[str, Any]]:
        query = """
            SELECT
                v.identificador_do_processo_de_viagem::TEXT AS id_viagem,
                v.nome::TEXT AS nome_viajante,
                v.destinos::TEXT AS destino_resumo,
                (
                  COALESCE(v.valor_diarias, 0) +
                  COALESCE(v.valor_passagens, 0) +
                  COALESCE(v.valor_outros_gastos, 0)
                )::DOUBLE PRECISION AS valor_total,
                i.score_final_combinado AS score_risco,
                i.nivel_criticidade AS criticidade
            FROM audit_search.viagens v
            JOIN audit_search.inteligencia_viagens i
              ON v.identificador_do_processo_de_viagem = i.identificador_do_processo_de_viagem
            ORDER BY i.score_final_combinado DESC NULLS LAST
            LIMIT %s;
        """
        return self._execute_query(query, (limit,))

    def fetch_control_compliance(self) -> Dict[str, Any]:
        criticidades = self._execute_query(
            """
            SELECT
                criticidade,
                COALESCE(total, 0) AS total
            FROM audit_bi.cubo_distribuicao_criticidade
            ORDER BY
                CASE
                    WHEN upper(criticidade) IN ('CRITICO', 'CRÍTICO') THEN 1
                    WHEN upper(criticidade) = 'ALTO' THEN 2
                    WHEN upper(criticidade) IN ('MEDIO', 'MÉDIO') THEN 3
                    WHEN upper(criticidade) = 'BAIXO' THEN 4
                    ELSE 5
                END;
            """
        )
        total = sum(int(row.get("total", 0) or 0) for row in (criticidades or []))

        def pct(part):
            if total <= 0:
                return 0.0
            return round((part / total) * 100, 2)

        return {
            "total_viagens": total,
            "criticidades": [
                {
                    "label": row.get("criticidade"),
                    "total": int(row.get("total", 0) or 0),
                    "pct": pct(int(row.get("total", 0) or 0)),
                }
                for row in (criticidades or [])
            ],
        }

    def fetch_control_orgao_destaque(self) -> Dict[str, Any]:
        top_pagadores = self._execute_query(
            """
            SELECT
                nome_do_orgao_pagador,
                COALESCE(SUM(valor), 0) AS total
            FROM audit_search.pagamentos
            WHERE nome_do_orgao_pagador IS NOT NULL
            GROUP BY nome_do_orgao_pagador
            ORDER BY total DESC
            LIMIT 5;
            """
        )
        top_criticos = self._execute_query(
            """
            SELECT
                v.nome_do_orgao_superior,
                COALESCE(AVG(i.score_final_combinado), 0) AS score_medio,
                COUNT(*) AS total_viagens
            FROM audit_search.viagens v
            JOIN audit_search.inteligencia_viagens i
              ON v.identificador_do_processo_de_viagem = i.identificador_do_processo_de_viagem
            WHERE v.nome_do_orgao_superior IS NOT NULL
            GROUP BY v.nome_do_orgao_superior
            ORDER BY score_medio DESC
            LIMIT 5;
            """
        )
        return {
            "top_pagadores": top_pagadores,
            "top_criticos": top_criticos,
        }

    def fetch_control_payment_monitor(self, month: Optional[str] = None) -> Dict[str, Any]:
        serie_query = """
            WITH params AS (
                SELECT COALESCE(
                    %s::int,
                    (
                        SELECT EXTRACT(MONTH FROM MAX(dia))::int
                        FROM audit_bi.cubo_total_pagamentos_por_dia
                        WHERE dia IS NOT NULL
                    )
                ) AS month_num
            )
            SELECT
                to_char(c.dia, 'DD') AS dia,
                COALESCE(SUM(c.total), 0) AS total,
                p.month_num AS mes_ref
            FROM audit_bi.cubo_total_pagamentos_por_dia c
            CROSS JOIN params p
            WHERE c.dia IS NOT NULL
              AND EXTRACT(MONTH FROM c.dia) = p.month_num
            GROUP BY to_char(c.dia, 'DD'), p.month_num
            ORDER BY to_char(c.dia, 'DD')::int ASC;
        """
        today = date.today()
        month_num = self._parse_month_number(month)

        with self._get_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            cur.execute(serie_query, (month_num,))
            serie = cur.fetchall() or []

            pico = max(
                serie,
                key=lambda row: float(row.get("total") or 0),
                default=None,
            )
            total_mes = sum(float(row.get("total") or 0) for row in serie)
            mes_ref = (
                int(serie[0].get("mes_ref"))
                if serie and serie[0].get("mes_ref") is not None
                else (month_num or today.month)
            )

            return {
                "serie": serie,
                "pico": pico,
                "total_mes": total_mes,
                "meses": [],
                "mes_atual": f"{mes_ref:02d}",
                "ano_atual": today.year,
            }

    def fetch_control_payment_outliers(self, month: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        month_num = self._parse_month_number(month)
        query = """
            WITH params AS (
                SELECT COALESCE(
                    %s::int,
                    (
                        SELECT EXTRACT(MONTH FROM MAX(data_da_emissao_compra))::int
                        FROM audit_bi.cubo_taxa_servico_maior_10
                        WHERE data_da_emissao_compra IS NOT NULL
                    )
                ) AS month_num
            )
            SELECT
                c.identificador_do_processo_de_viagem::text AS id_viagem,
                c.numero_da_proposta_pcdp,
                c.nivel_criticidade,
                c.score_final,
                c.data_da_emissao_compra,
                c.meio_de_transporte,
                c.valor_da_passagem,
                c.taxa_de_servico,
                c.percentual_taxa_servico
            FROM audit_bi.cubo_taxa_servico_maior_10 c
            CROSS JOIN params p
            WHERE c.data_da_emissao_compra IS NOT NULL
              AND EXTRACT(MONTH FROM c.data_da_emissao_compra) = p.month_num
            ORDER BY c.percentual_taxa_servico DESC NULLS LAST, c.taxa_de_servico DESC NULLS LAST
            LIMIT %s;
        """
        return self._execute_query(query, (month_num, limit))

    def fetch_control_payment_late_purchases(self, month: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        month_num = self._parse_month_number(month)
        query = """
            WITH params AS (
                SELECT COALESCE(
                    %s::int,
                    (
                        SELECT EXTRACT(MONTH FROM MAX(data_da_emissao_compra))::int
                        FROM audit_bi.cubo_passagens_emissao_apos_inicio
                        WHERE data_da_emissao_compra IS NOT NULL
                    )
                ) AS month_num
            )
            SELECT
                identificador_do_processo_de_viagem::text AS id_viagem,
                numero_da_proposta_pcdp,
                nome,
                nome_do_orgao_superior,
                nivel_criticidade,
                score_final,
                data_inicio,
                data_da_emissao_compra,
                dias_apos_inicio,
                valor_da_passagem
            FROM audit_bi.cubo_passagens_emissao_apos_inicio c
            CROSS JOIN params p
            WHERE c.data_da_emissao_compra IS NOT NULL
              AND EXTRACT(MONTH FROM c.data_da_emissao_compra) = p.month_num
            ORDER BY c.dias_apos_inicio DESC NULLS LAST, c.valor_da_passagem DESC NULLS LAST
            LIMIT %s;
        """
        return self._execute_query(query, (month_num, limit))

    def fetch_control_payment_actionable_cases(self, limit: int = 10) -> List[Dict[str, Any]]:
        query = """
            SELECT
                identificador_do_processo_de_viagem::text AS id_viagem,
                nome,
                nome_do_orgao_superior,
                valor_viagem,
                score_final,
                nivel_criticidade,
                motivo_tag,
                viagem_urgente
            FROM audit_bi.cubo_top_alvos_detalhe
            WHERE valor_viagem IS NOT NULL
            ORDER BY score_final DESC NULLS LAST, valor_viagem DESC NULLS LAST
            LIMIT %s;
        """
        return self._execute_query(query, (limit,))

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

    def fetch_control_urgentes(self) -> Dict[str, Any]:
        has_status_col = self._execute_query(
            """
            SELECT 1 AS ok
            FROM information_schema.columns
            WHERE table_schema = 'audit_bi'
              AND table_name = 'cubo_viagem_urgente_sem_justificativa'
              AND column_name = 'status_justificativa'
            LIMIT 1;
            """
        )

        if has_status_col:
            rows = self._execute_query(
                """
                SELECT
                    COALESCE(NULLIF(trim(status_justificativa), ''), 'sem_status') AS motivo,
                    COALESCE(total, 0) AS total
                FROM audit_bi.cubo_viagem_urgente_sem_justificativa
                ORDER BY COALESCE(total, 0) DESC;
                """
            )
            total = sum(int(row.get("total", 0) or 0) for row in (rows or []))
            motivos = rows[:3] if rows else []
            return {
                "total": total,
                "motivos": motivos,
            }

        # Fallback para ambientes onde a tabela ainda está no formato detalhado.
        total_rows = self._execute_query(
            """
            SELECT COUNT(*) AS total
            FROM audit_bi.cubo_viagem_urgente_sem_justificativa
            WHERE viagem_urgente IS TRUE
              AND (
                    justificativa_urgencia_viagem IS NULL
                    OR trim(justificativa_urgencia_viagem) = ''
              );
            """
        )
        total = int(total_rows[0].get("total", 0) or 0) if total_rows else 0

        motivos = self._execute_query(
            """
            SELECT
                COALESCE(NULLIF(trim(nivel_criticidade), ''), 'SEM_CLASSIFICACAO') AS motivo,
                COUNT(*) AS total
            FROM audit_bi.cubo_viagem_urgente_sem_justificativa
            WHERE viagem_urgente IS TRUE
              AND (
                    justificativa_urgencia_viagem IS NULL
                    OR trim(justificativa_urgencia_viagem) = ''
              )
            GROUP BY COALESCE(NULLIF(trim(nivel_criticidade), ''), 'SEM_CLASSIFICACAO')
            ORDER BY total DESC
            LIMIT 3;
            """
        )
        return {
            "total": total,
            "motivos": motivos,
        }

    def fetch_contexto_rag(self, vetor_pergunta) -> List[Dict[str, Any]]:
        query = """
            SELECT
                conteudo_texto AS narrativa_txt,
                score_risco AS score_final,
                criticidade AS nivel_criticidade
            FROM audit_rag.conhecimento_vetorial
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
            raise
