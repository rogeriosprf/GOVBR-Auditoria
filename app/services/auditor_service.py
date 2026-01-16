class AuditorService:
    def __init__(self, data_engine, embedding_model=None, groq_client=None):
        self.data_engine = data_engine
        self.embedding_model = embedding_model
        self.groq_client = groq_client
    def get_home_stats(self):
        # 1️⃣ Obter dados brutos do DataEngine
        summary = self.data_engine.fetch_dashboard_summary() or {}
        raw_orgaos = self.data_engine.fetch_lista_orgaos() or []

        # 2️⃣ Normaliza e garante campos amigáveis ao frontend
        orgaos = []
        for o in raw_orgaos:
            nome = o.get("nome") or o.get("nome_do_orgao_superior") or o.get("nomeDoOrgaoSuperior") or "Sem informação"
            qtd = int(o.get("total") or o.get("qtd_viagens") or o.get("qtdViagens") or 0)
            valor = float(o.get("valor_total") or o.get("valorTotal") or 0)
            score = float(o.get("score_medio") or o.get("scoreMedio") or 0)

            orgaos.append({
                # Mantém campos originais e adiciona nomes amigáveis
                "nome_do_orgao_superior": o.get("nome_do_orgao_superior", nome),
                "nome": nome,
                "qtd_viagens": qtd,
                "total": qtd,
                "valor_total": valor,
                "score_medio": score
            })

        # 3️⃣ Normaliza KPIs do summary com fallbacks
        total_viagens = int(summary.get("total_viagens") or summary.get("totalViagens") or 0)
        total_critico = int(summary.get("casos_criticos_extremos") or summary.get("total_critico") or summary.get("totalCritico") or 0)
        total_sigilo = float(summary.get("valor_total_risco") or summary.get("total_sigilo") or summary.get("valorTotalRisco") or 0)

        # Corrige múltipla escala: o banco pode retornar taxa já em percentagem (ex.: 76.21) ou como fracção (0.76)
        raw_risco = summary.get("risco_medio_global") or summary.get("taxa_risco_global") or 0.0
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
                "total_sigilo": total_sigilo,
                "taxa_risco_global": taxa_risco_global,
            },
            "orgaos": orgaos
        }

        # 4️⃣ Log útil para depuração em ambiente de desenvolvimento
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info("get_home_stats -> summary: %s", result["summary"])
            logger.info("get_home_stats -> orgaos count: %d", len(orgaos))
        except Exception:
            pass

        return result

    from typing import List, Dict, Any

    def get_viagens_auditaveis(self, busca: str, score_min: float) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_viagens_filtradas(busca, score_min)

    def get_analise_temporal(self) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_analise_temporal()

    def get_ranking_destinos(self) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_ranking_destinos()

    def get_ranking_servidores(self) -> List[Dict[str, Any]]:
        return self.data_engine.fetch_ranking_servidores()

    def get_audit_dossie(self, id_viagem):
        res = self.data_engine.fetch_detalhe_viagem(id_viagem) or {}
        viagem = res.get('viagem') or {}
        trechos = res.get('trechos') or []

        return {
            'viagem': viagem,
            'trechos': trechos
        }

    def perguntar_ia(self, pergunta: str, id_viagem: str = None) -> str:
        if not self.groq_client or not self.embedding_model:
            return "IA não configurada"
        
        # Se id_viagem fornecido, buscar contexto específico da viagem
        if id_viagem:
            try:
                dossie = self.get_audit_dossie(id_viagem)
                viagem = dossie.get('viagem', {})
                trechos = dossie.get('trechos', [])
                
                # Monta contexto estruturado da viagem como string
                # Calcula valor total
                valor_total = float(viagem.get('valor_diarias', 0) or 0) + float(viagem.get('valor_passagens', 0) or 0) + float(viagem.get('valor_outros_gastos', 0) or 0)
                
                contexto_viagem = f"""
CONTEXTO DA VIAGEM (ID: {id_viagem}):
- Viajante: {viagem.get('nome', 'N/A')}
- Cargo: {viagem.get('cargo', 'N/A')}
- Órgão: {viagem.get('nome_do_orgao_superior', 'N/A')}
- Destino: {viagem.get('destinos', 'N/A')}
- Período: {viagem.get('periodo_data_de_inicio', 'N/A')} até {viagem.get('periodo_data_de_fim', 'N/A')}
- Situação: {viagem.get('situacao', 'N/A')}
- Valor Total: R$ {valor_total:,.2f}
- Valor Diárias: R$ {float(viagem.get('valor_diarias', 0) or 0):,.2f}
- Valor Passagens: R$ {float(viagem.get('valor_passagens', 0) or 0):,.2f}
- Valor Outros Gastos: R$ {float(viagem.get('valor_outros_gastos', 0) or 0):,.2f}
- Valor Devolução: R$ {float(viagem.get('valor_devolucao', 0) or 0):,.2f}
- Viagem Urgente: {viagem.get('viagem_urgente', 'N/A')}
- Justificativa Urgência: {viagem.get('justificativa_urgencia_viagem', 'N/A')[:200] if viagem.get('justificativa_urgencia_viagem') else 'N/A'}...
- Trechos: {len(trechos)} trecho(s)
"""
                # Para viagem específica, usar contexto customizado sem RAG
                # (ou adaptar groq_client para aceitar string também)
                return self._perguntar_com_contexto_texto(pergunta, contexto_viagem)
                
            except Exception as e:
                return f"Erro ao processar viagem {id_viagem}: {str(e)}"
        
        # Sem viagem, usar RAG normal
        vetor = self.embedding_model.encode(pergunta)
        contexto_rag = self.data_engine.fetch_contexto_rag(vetor)
        return self.groq_client.perguntar(pergunta, contexto_rag)
    
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
                    "Resposta direta (bullet points, máximo 6 linhas):"
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
