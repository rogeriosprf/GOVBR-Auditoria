# app/services/auditor_service.py
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

    def get_audit_list(self, busca=None, score_min=0.0):
        rows = self.data_engine.fetch_auditorias_filtradas(busca, score_min) or []
        normalized = []
        for r in rows:
            id_viagem = r.get('id_viagem') or r.get('pcdp_id') or r.get('id') or r.get('identificador_id')
            nome = r.get('nome_viajante') or r.get('nome') or r.get('nome_completo') or 'Sem nome'
            orgao = r.get('orgao_superior') or r.get('orgao') or r.get('orgao_nome') or '-'
            destino = r.get('destino_resumo') or r.get('destino') or ''
            valor_total = float(r.get('valor_total') or r.get('valor') or 0)
            score = float(r.get('score') or r.get('score_risco') or r.get('score_medio') or 0)
            # Se score vier como percentagem (ex.: 73), converte para 0.73
            if score > 1:
                score = score / 100.0

            normalized.append({
                **r,
                'id_viagem': id_viagem,
                'nome': nome,
                'orgao': orgao,
                'destino_resumo': destino,
                'valor_total': valor_total,
                'score_risco': score
            })

        # Log para depuração
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info('get_audit_list -> rows: %d', len(normalized))
        except Exception:
            pass

        return normalized

    def get_audit_dossie(self, id_viagem):
        res = self.data_engine.fetch_detalhe_pcdp(id_viagem) or {}
        viagem = res.get('viagem') or {}
        trechos = res.get('trechos') or []

        viagem_norm = {
            'id_viagem': viagem.get('id_viagem') or viagem.get('pcdp_id') or viagem.get('id'),
            'nome': viagem.get('nome') or viagem.get('nome_viajante') or viagem.get('nome_completo') or '',
            'data_inicio': viagem.get('data_inicio') or viagem.get('inicio') or '',
            'valor_total': float(viagem.get('valor_total') or viagem.get('valor') or 0),
            'motivo': viagem.get('motivo') or viagem.get('justificativa') or ''
        }

        return {
            'viagem': viagem_norm,
            'trechos': trechos
        }

    async def perguntar_ia(self, pergunta):
        if not self.groq_client or not self.embedding_model:
            return "IA não configurada"
        vetor = self.embedding_model.encode(pergunta)
        contexto = self.data_engine.fetch_contexto_rag(vetor)
        return self.groq_client.perguntar(pergunta, contexto)
