from typing import List, Dict, Any, Optional
import time


class AuditorService:
    
    def __init__(self, data_engine, embedding_model=None, groq_client=None):
        self.data_engine = data_engine
        self.embedding_model = embedding_model
        self.groq_client = groq_client
        self._insights_cache = None
        self._control_alerts_cache = None
        self._control_alerts_cache_ts = 0.0
    
    def get_home_stats(self):
        # 1️⃣ Obter dados brutos do DataEngine
        summary = self.data_engine.fetch_dashboard_summary() or {}        

        # 2️⃣ Normaliza KPIs do summary com fallbacks
        def to_int(val, default=0):
            try:
                return int(val)
            except Exception:
                return default

        def to_float(val, default=0.0):
            try:
                return float(val)
            except Exception:
                return default

        total_viagens = to_int(summary.get("total_viagens"))
        total_critico = to_int(summary.get("total_criticos"))
        total_valor = to_float(summary.get("total_valor"))
        raw_risco = summary.get("risco_medio_global")
        
        try:
            raw_risco = float(raw_risco)
        except Exception:
            raw_risco = 0.0

        if raw_risco > 1:
            taxa_risco_global = round(raw_risco, 2)
        else:
            taxa_risco_global = round(raw_risco * 100, 2)

        result = {
            "summary": {
                "total_viagens": total_viagens,
                "total_critico": total_critico,
                "total_valor": total_valor,
                "taxa_risco_global": taxa_risco_global,
            }            
        }

        return result

    def get_insights(self) -> List[Dict[str, Any]]:
        # Tenta IA + RAG primeiro; se falhar, usa insights SQL
        if self._insights_cache is not None:
            return self._insights_cache
        insights_ai = self._get_insights_ai()
        if insights_ai:
            self._insights_cache = insights_ai
            return insights_ai
        self._insights_cache = self.data_engine.fetch_insights()
        return self._insights_cache

    def get_control_summary(self, month: Optional[str] = None) -> Dict[str, Any]:
        return {
            "fila_prioritaria": self.data_engine.fetch_control_queue(10),
            "conformidade": self.data_engine.fetch_control_compliance(),
            "orgaos": self.data_engine.fetch_control_orgao_destaque(),
            "urgentes": self.data_engine.fetch_control_urgentes(),
        }

    def get_control_alerts(self) -> List[Dict[str, Any]]:
        now = time.time()
        if self._control_alerts_cache is not None and (now - self._control_alerts_cache_ts) < 120:
            return self._control_alerts_cache
        self._control_alerts_cache = self.data_engine.fetch_control_alerts()
        self._control_alerts_cache_ts = now
        return self._control_alerts_cache

    def get_control_queue(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_control_queue(limit)

    def get_control_compliance(self) -> Dict[str, Any]:
        return self.data_engine.fetch_control_compliance()

    def get_control_orgaos(self) -> Dict[str, Any]:
        return self.data_engine.fetch_control_orgao_destaque()

    def get_control_urgentes(self) -> Dict[str, Any]:
        return self.data_engine.fetch_control_urgentes()

    def get_control_payment_monitor(self, month: Optional[str] = None) -> Dict[str, Any]:
        return self.data_engine.fetch_control_payment_monitor(month)

    def get_control_payment_outliers(self, month: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_control_payment_outliers(month, limit)

    def get_control_payment_late_purchases(self, month: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_control_payment_late_purchases(month, limit)

    def get_control_payment_actionable_cases(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_control_payment_actionable_cases(limit)

    def get_viagens_auditaveis(self, busca: str, criticidade: str = None, urgente: bool = None) -> List[Dict[str, Any]]:
        rows = self.data_engine.fetch_viagens_auditaveis(busca, criticidade)
        normalized = [self._normalize_viagem_row(r) for r in rows]
        if urgente is not None:
            normalized = [r for r in normalized if bool(r.get("urgente")) == bool(urgente)]

        if not criticidade:
            return normalized

        crit = self._normalize_criticidade(criticidade)
        return [r for r in normalized if self._normalize_criticidade(r.get("criticidade")) == crit]

    def get_analise_temporal(self) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_analise_temporal()

    def get_ranking_destinos(self) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_ranking_destinos()

    def get_ranking_servidores(self) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_ranking_servidores()

    def get_dashboard_kpis(self) -> List[Dict[str, Any]]:
        summary = self.data_engine.fetch_dashboard_summary() or {}
        return [{
            "total_alvos": int(summary.get("total_viagens") or 0),
            "valor_total_risco": float(summary.get("total_valor") or 0),
            "risco_medio_global": float(summary.get("risco_medio_global") or 0),
            "casos_criticos_extremos": int(summary.get("total_criticos") or 0),
        }]

    def get_ranking_orgaos(self) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_ranking_orgaos()

    def get_top_alvos(self) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_top_alvos()

    def get_criticidades(self) -> List[Dict[str, Any]]:
        rows = self.data_engine.fetch_criticidades()
        if rows:
            return rows
        return [
            {"criticidade": "CRÍTICO"},
            {"criticidade": "ALTO"},
            {"criticidade": "MÉDIO"},
            {"criticidade": "BAIXO"},
        ]

    def get_ia_status(self, embedding_error: Optional[str] = None) -> Dict[str, Any]:
        return {
            "groq_configurada": bool(self.groq_client),
            "embedding_configurado": bool(self.embedding_model),
            "embedding_error": embedding_error,
            "rag": self.data_engine.check_rag_health(),
        }

    def get_audit_dossie(self, id_viagem):
        res = self.data_engine.fetch_detalhe_viagem(id_viagem) or {}
        viagem = self._normalize_viagem_detalhe(res.get('viagem') or {})
        trechos_fn = res.get('trechos') or []
        trechos_tbl = self.data_engine.fetch_trechos(id_viagem) or []
        trechos = trechos_tbl if trechos_tbl else trechos_fn
        pagamentos = self.data_engine.fetch_pagamentos(id_viagem) or []
        passagens = self.data_engine.fetch_passagens(id_viagem) or []

        return {
            'viagem': viagem,
            'trechos': trechos,
            'pagamentos': pagamentos,
            'passagens': passagens,
        }

    def perguntar_ia(self, pergunta: str, id_viagem: str = None) -> str:
        if not self.groq_client or not self.embedding_model:
            return "IA não configurada"
        
        # Se id_viagem fornecido, buscar contexto específico da viagem
        if id_viagem:
            try:
                dossie = self.get_audit_dossie(id_viagem)
                contexto_viagem = self._build_contexto_viagem(id_viagem, dossie)
                pergunta_limpa = (pergunta or "").strip() or "Faça uma análise completa do caso."
                # Para viagem específica, usar contexto customizado sem RAG
                return self._perguntar_com_contexto_texto(pergunta_limpa, contexto_viagem)
                
            except Exception as e:
                return f"Erro ao processar viagem {id_viagem}: {str(e)}"
        
        # Sem viagem, usar RAG normal
        vetor = self.embedding_model.encode(pergunta)
        contexto_rag = self.data_engine.fetch_contexto_rag(vetor)
        return self.groq_client.perguntar(pergunta, contexto_rag)

    def analisar_caso_ia(self, id_viagem: str) -> str:
        if not self.groq_client or not self.embedding_model:
            return "IA não configurada"
        if not id_viagem:
            return "ID da viagem não informado"

        try:
            dossie = self.get_audit_dossie(id_viagem)
            contexto_viagem = self._build_contexto_viagem(id_viagem, dossie)
            pergunta = (
                "Faça uma análise completa deste caso com base nos dados do banco, "
                "incluindo resumo, sinais de risco, evidências e recomendações."
            )
            return self._perguntar_com_contexto_texto(pergunta, contexto_viagem)
        except Exception as e:
            return f"Erro ao processar viagem {id_viagem}: {str(e)}"

    def analisar_insight_ia(self, insight: Dict[str, Any]) -> Dict[str, Any]:
        if not self.groq_client:
            return {
                "achado": "IA não configurada.",
                "causas": ["Configuração do cliente Groq ausente."],
                "validacoes": ["Verificar variáveis de ambiente e credenciais da IA."],
            }

        titulo = str((insight or {}).get("titulo") or "").strip()
        valor = str((insight or {}).get("valor") or "—").strip()
        detalhe = str((insight or {}).get("detalhe") or "").strip()
        tipo = str((insight or {}).get("tipo") or "geral").strip()

        if not titulo:
            return {
                "achado": "Insight inválido: título não informado.",
                "causas": ["Não foi possível identificar o insight selecionado."],
                "validacoes": ["Recarregar a lista de insights e tentar novamente."],
            }

        contexto_insight = "\n".join([
            "CONTEXTO DO INSIGHT",
            f"- Título: {titulo}",
            f"- Tipo: {tipo}",
            f"- Valor: {valor}",
            f"- Detalhe: {detalhe or 'N/A'}",
        ])

        messages = [
            {
                "role": "system",
                "content": (
                    "Você é um auditor. Responda SOMENTE JSON válido "
                    "no formato: {\"achado\":\"...\",\"causas\":[\"...\"],\"validacoes\":[\"...\"]}. "
                    "Use apenas o contexto fornecido; não invente dados."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"{contexto_insight}\n\n"
                    "Gere a análise em 3 blocos fixos: achado, causas, validações."
                ),
            },
        ]

        try:
            resp = self.groq_client.client.chat.completions.create(
                model=self.groq_client.model,
                messages=messages,
                temperature=0.1,
                max_tokens=300,
            )
            raw = (resp.choices[0].message.content or "").strip()
            return self._parse_insight_blocos(raw)
        except Exception:
            return {
                "achado": f"{titulo}: {valor}. {detalhe}".strip(),
                "causas": ["Indícios preliminares a partir do insight selecionado."],
                "validacoes": ["Conferir base original e filtros aplicados no painel de insights."],
            }

    def format_insight_blocos_texto(self, blocos: Dict[str, Any]) -> str:
        achado = str((blocos or {}).get("achado") or "Sem leitura do achado.")
        causas = self._to_str_list((blocos or {}).get("causas")) or ["Sem causas informadas."]
        validacoes = self._to_str_list((blocos or {}).get("validacoes")) or ["Sem validações informadas."]
        return "\n".join([
            "1) Leitura do achado",
            f"- {achado}",
            "2) Possíveis causas",
            *[f"- {c}" for c in causas[:3]],
            "3) Validações recomendadas",
            *[f"- {v}" for v in validacoes[:3]],
        ])

    def _parse_insight_blocos(self, raw: str) -> Dict[str, Any]:
        import json
        data = None
        try:
            data = json.loads(raw)
        except Exception:
            start = raw.find("{")
            end = raw.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    data = json.loads(raw[start:end + 1])
                except Exception:
                    data = None
        if not isinstance(data, dict):
            return {
                "achado": raw[:240] if raw else "Análise indisponível.",
                "causas": ["Não foi possível estruturar automaticamente as causas."],
                "validacoes": ["Revisar o insight e repetir a análise."],
            }
        return {
            "achado": str(data.get("achado") or "Sem leitura do achado."),
            "causas": self._to_str_list(data.get("causas")) or ["Sem causas informadas."],
            "validacoes": self._to_str_list(data.get("validacoes")) or ["Sem validações informadas."],
        }

    def _to_str_list(self, value: Any) -> List[str]:
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    def _get_insights_ai(self) -> List[Dict[str, Any]]:
        if not self.groq_client or not self.embedding_model:
            return []
        try:
            prompt = (
                "Gere 6 insights operacionais de auditoria com base no contexto. "
                "Retorne SOMENTE JSON puro (sem markdown) no formato de lista de objetos: "
                "[{\"titulo\":\"...\",\"valor\":\"...\",\"detalhe\":\"...\"}]. "
                "Se não houver dados suficientes, responda com uma lista vazia []."
            )
            vetor = self.embedding_model.encode(prompt)
            contexto_rag = self.data_engine.fetch_contexto_rag(vetor)

            trechos = []
            for i, c in enumerate(contexto_rag or [], start=1):
                txt = (c.get("narrativa_txt") or "").strip()
                score = c.get("score_final")
                crit = c.get("nivel_criticidade")
                if txt:
                    trechos.append(f"[Trecho {i} | score={score} | criticidade={crit}]\n{txt}")
            contexto_txt = "\n\n".join(trechos) if trechos else "Sem contexto disponível."

            messages = [
                {
                    "role": "system",
                    "content": (
                        "Você é um analista de auditoria. "
                        "Use APENAS o contexto fornecido. "
                        "Retorne JSON válido conforme instrução."
                    ),
                },
                {
                    "role": "user",
                    "content": f"CONTEXTO:\n{contexto_txt}\n\n{prompt}",
                },
            ]
            resp = self.groq_client.client.chat.completions.create(
                model=self.groq_client.model,
                messages=messages,
                temperature=0.2,
                max_tokens=500,
            )
            raw = (resp.choices[0].message.content or "").strip()
            import json
            try:
                data = json.loads(raw)
            except Exception:
                # tenta extrair array JSON
                start = raw.find('[')
                end = raw.rfind(']')
                if start != -1 and end != -1 and end > start:
                    data = json.loads(raw[start:end+1])
                else:
                    return []
            if isinstance(data, list):
                return data
            return []
        except Exception:
            return []
    
    def _perguntar_com_contexto_texto(self, pergunta: str, contexto_texto: str) -> str:
        """Versão alternativa que aceita contexto como texto puro"""
        messages = [
            {
                "role": "system",
                "content": (
                    "Você é um assistente de auditoria especializado. "
                    "IMPORTANTE: Use TODOS os dados fornecidos no contexto. "
                    "Seja CONCISO mas COMPLETO. Use bullet points. "
                    "NÃO diga que faltam informações se elas estão no contexto. "
                    "Analise com base nos dados disponíveis."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"{contexto_texto}\n\n"
                    f"PERGUNTA: {pergunta}\n\n"
                    "Resposta objetiva em tópicos, incluindo resumo do caso, sinais de risco, evidências e recomendações."
                ),
            },
        ]
        
        resp = self.groq_client.client.chat.completions.create(
            model=self.groq_client.model,
            messages=messages,
            temperature=0.1,  # Mais determinístico
            max_tokens=400,  # Aumentado para não cortar
        )
        return resp.choices[0].message.content.strip()

    def _build_contexto_viagem(self, id_viagem: str, dossie: Dict[str, Any]) -> str:
        viagem = dossie.get("viagem") or {}
        trechos = dossie.get("trechos") or []
        pagamentos = dossie.get("pagamentos") or []
        passagens = dossie.get("passagens") or []

        valor_diarias = self._safe_float(viagem.get("valor_diarias"))
        valor_passagens = self._safe_float(viagem.get("valor_passagens"))
        valor_outros = self._safe_float(viagem.get("valor_outros_gastos"))
        valor_devolucao = self._safe_float(viagem.get("valor_devolucao"))
        valor_total_viagem = valor_diarias + valor_passagens + valor_outros
        valor_total_pagamentos = sum(self._safe_float(p.get("valor")) for p in pagamentos)
        valor_total_passagens = sum(self._safe_float(p.get("valor_da_passagem")) for p in passagens)

        linhas = [
            f"CONTEXTO DO CASO (ID: {id_viagem})",
            "",
            "[VIAGEM]",
            f"- Viajante: {viagem.get('nome', 'N/A')}",
            f"- Cargo: {viagem.get('cargo', 'N/A')}",
            f"- Órgão superior: {viagem.get('nome_do_orgao_superior', 'N/A')}",
            f"- Órgão solicitante: {viagem.get('nome_orgao_solicitante', 'N/A')}",
            f"- Destino(s): {viagem.get('destinos', 'N/A')}",
            f"- Período: {viagem.get('periodo_data_de_inicio', 'N/A')} até {viagem.get('periodo_data_de_fim', 'N/A')}",
            f"- Situação: {viagem.get('situacao', 'N/A')}",
            f"- Viagem urgente: {viagem.get('viagem_urgente', 'N/A')}",
            f"- Justificativa urgência: {(viagem.get('justificativa_urgencia_viagem') or 'N/A')[:500]}",
            f"- Valor diárias: {self._fmt_brl(valor_diarias)}",
            f"- Valor passagens: {self._fmt_brl(valor_passagens)}",
            f"- Valor outros gastos: {self._fmt_brl(valor_outros)}",
            f"- Valor devolução: {self._fmt_brl(valor_devolucao)}",
            f"- Valor total viagem (diárias+passagens+outros): {self._fmt_brl(valor_total_viagem)}",
            "",
            "[AGREGADOS]",
            f"- Quantidade de trechos: {len(trechos)}",
            f"- Quantidade de pagamentos: {len(pagamentos)}",
            f"- Quantidade de passagens: {len(passagens)}",
            f"- Soma dos pagamentos: {self._fmt_brl(valor_total_pagamentos)}",
            f"- Soma de passagens emitidas: {self._fmt_brl(valor_total_passagens)}",
            "",
            "[TRECHOS - até 20 registros]",
        ]

        if trechos:
            for i, t in enumerate(trechos[:20], start=1):
                linhas.append(
                    f"- {i}. seq={t.get('sequencia_trecho', 'N/A')} | "
                    f"{t.get('origem_cidade', 'N/A')}/{t.get('origem_uf', 'N/A')} ({t.get('origem_data', 'N/A')}) -> "
                    f"{t.get('destino_cidade', 'N/A')}/{t.get('destino_uf', 'N/A')} ({t.get('destino_data', 'N/A')}) | "
                    f"transporte={t.get('meio_de_transporte', 'N/A')} | diarias={t.get('numero_diarias', 'N/A')}"
                )
        else:
            linhas.append("- Nenhum trecho encontrado.")

        linhas.extend(["", "[PAGAMENTOS - até 20 registros]"])
        if pagamentos:
            for i, p in enumerate(pagamentos[:20], start=1):
                linhas.append(
                    f"- {i}. tipo={p.get('tipo_de_pagamento', 'N/A')} | valor={self._fmt_brl(self._safe_float(p.get('valor')))} | "
                    f"orgao_pagador={p.get('nome_do_orgao_pagador', 'N/A')} | ug={p.get('nome_da_unidade_gestora_pagadora', 'N/A')}"
                )
        else:
            linhas.append("- Nenhum pagamento encontrado.")

        linhas.extend(["", "[PASSAGENS - até 20 registros]"])
        if passagens:
            for i, p in enumerate(passagens[:20], start=1):
                linhas.append(
                    f"- {i}. transporte={p.get('meio_de_transporte', 'N/A')} | "
                    f"ida={p.get('cidade_origem_ida', 'N/A')}/{p.get('uf_origem_ida', 'N/A')} -> "
                    f"{p.get('cidade_destino_ida', 'N/A')}/{p.get('uf_destino_ida', 'N/A')} | "
                    f"valor={self._fmt_brl(self._safe_float(p.get('valor_da_passagem')))} | "
                    f"taxa={self._fmt_brl(self._safe_float(p.get('taxa_de_servico')))} | "
                    f"emissao={p.get('data_da_emissao_compra', 'N/A')} {p.get('hora_da_emissao_compra', '')}"
                )
        else:
            linhas.append("- Nenhuma passagem encontrada.")

        return "\n".join(linhas)

    def _safe_float(self, value: Any) -> float:
        try:
            return float(value or 0)
        except Exception:
            return 0.0

    def _fmt_brl(self, value: float) -> str:
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    def _normalize_criticidade(self, value) -> str:
        if value is None:
            return "NORMAL"
        text = str(value).strip().upper()
        if text.startswith("CRIT"):
            return "CRÍTICO"
        if text.startswith("ALER"):
            return "ALERTA"
        if text.startswith("ALTO"):
            return "ALTO"
        if text.startswith("MED"):
            return "MÉDIO"
        if text.startswith("BAI"):
            return "BAIXO"
        return text

    def _normalize_viagem_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        def pick(*keys, default=None):
            for key in keys:
                if key in row and row[key] is not None:
                    return row[key]
            return default

        def normalize_urgente(value):
            if value is None:
                return False
            if isinstance(value, bool):
                return value
            text = str(value).strip().upper()
            if text in {"S", "SIM", "TRUE", "1"}:
                return True
            if text in {"N", "NAO", "NÃO", "FALSE", "0"}:
                return False
            try:
                return float(text) > 0
            except Exception:
                return False


        return {
            "id_viagem": str(pick("id_viagem", "id", "id_viagem_siorg", default="")),
            "nome_viajante": pick("nome_viajante", "nome", "passageiro", default=""),
            "orgao_superior": pick("orgao_superior", "nome_do_orgao_superior", "orgao", default=""),
            "destino_resumo": pick("destino_resumo", "destinos", "destino", default=""),
            "valor_total": float(pick("valor_total", "valor", "valor_total_risco", default=0) or 0),
            "score_risco": float(pick("score_risco", "score_final", "score", default=0) or 0),
            "criticidade": self._normalize_criticidade(pick("criticidade", "nivel_criticidade", default="NORMAL")),
            "urgente": normalize_urgente(pick("urgente", "viagem_urgente", "is_urgente", default=None)),
        }

    def _normalize_viagem_detalhe(self, viagem: Dict[str, Any]) -> Dict[str, Any]:
        def pick(*keys, default=None):
            for key in keys:
                if key in viagem and viagem[key] is not None:
                    return viagem[key]
            return default

        def normalize_urgente(value):
            if value is None:
                return "NAO"
            if isinstance(value, bool):
                return "SIM" if value else "NAO"
            text = str(value).strip().upper()
            if text in {"S", "SIM", "TRUE", "1"}:
                return "SIM"
            if text in {"N", "NAO", "NÃO", "FALSE", "0"}:
                return "NAO"
            return text

        normalized = dict(viagem)
        normalized["nome"] = pick("nome", "nome_viajante", default="")
        normalized["cargo"] = pick("cargo", "funcao", default="")
        normalized["destinos"] = pick("destinos", "destino_resumo", default="")
        normalized["situacao"] = pick("situacao", default="")
        normalized["periodo_data_de_inicio"] = pick("periodo_data_de_inicio", "data_inicio", default=None)
        normalized["periodo_data_de_fim"] = pick("periodo_data_de_fim", "data_fim", default=None)
        normalized["nome_do_orgao_superior"] = pick("nome_do_orgao_superior", "orgao_superior", default=None)
        normalized["nome_orgao_solicitante"] = pick("nome_orgao_solicitante", default=None)
        normalized["justificativa_urgencia_viagem"] = pick("justificativa_urgencia_viagem", "motivo", default=None)
        normalized["valor_diarias"] = float(pick("valor_diarias", default=0) or 0)
        normalized["valor_passagens"] = float(pick("valor_passagens", default=0) or 0)
        normalized["valor_outros_gastos"] = float(pick("valor_outros_gastos", default=0) or 0)
        normalized["valor_devolucao"] = float(pick("valor_devolucao", default=0) or 0)
        normalized["viagem_urgente"] = normalize_urgente(pick("viagem_urgente", "urgente", default=None))
        return normalized
