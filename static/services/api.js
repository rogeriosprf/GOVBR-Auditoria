// static/services/api.js
const API_BASE = '/api/auditoria';

export const api = {
  /**
   * Obtém o resumo estatístico para o Dashboard (KPIs)
   */
  async summary() {
    try {
      console.log(`[API] Solicitando summary em: ${API_BASE}/summary`);
      const response = await fetch(`${API_BASE}/summary`);
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[API] Dados brutos recebidos:', data);

      const rawSummary = data.summary ?? data;

      const summary = {
        total_viagens: rawSummary.total_viagens ?? rawSummary.totalViagens ?? 0,
        total_critico: rawSummary.total_critico ?? rawSummary.totalCritico ?? 0,
        total_sigilo: rawSummary.total_sigilo ?? rawSummary.totalSigilo ?? 0,
        taxa_risco_global: rawSummary.taxa_risco_global ?? rawSummary.taxaRiscoGlobal ?? 0.0
      };

      console.log('[API] Resumo normalizado:', summary);

      return {
        summary,
        orgaos: data.orgaos || []
      };
    } catch (error) {
      console.error('--- ERRO NO SUMMARY ---');
      console.error('Detalhes:', error.message);
      return {
        summary: { total_viagens: 0, total_critico: 0, total_sigilo: 0, taxa_risco_global: 0.0 },
        orgaos: []
      };
    }
  },

  /**
   * Busca a lista de viagens filtradas para os Cards
   * Sincronizado com: p_busca e p_score_min do backend
   */
  async listarAuditorias(p_busca = '', p_score = 0.0) {
    try {
      // Ajustado para os novos nomes de parâmetros do FastAPI
      const params = new URLSearchParams({ 
        busca: p_busca, 
        score_min: p_score 
      });
      
      // Mudamos de /cards para /viagens conforme o router.py
      const response = await fetch(`${API_BASE}/viagens?${params.toString()}`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();

      // Retorna o objeto AuditListResponse: { total_encontrados, viagens, ... }
      return {
        total_encontrados: data.total_encontrados ?? 0,
        viagens: data.viagens ?? [],
        termo_busca: data.termo_busca ?? p_busca
      };
    } catch (error) {
      console.error('[API] Erro ao listar auditorias:', error);
      return { total_encontrados: 0, viagens: [], termo_busca: p_busca };
    }
  },

  async getDetalhes(id_viagem) {
    try {
      const response = await fetch(`${API_BASE}/detalhes/${id_viagem}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error(`[API] Erro ao buscar detalhes (${id_viagem}):`, error);
      throw error;
    }
  },

  async perguntarIA(mensagem) {
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('[API] Erro no Chat IA:', error);
      return { 
        resposta: "Desculpe, tive um problema ao processar sua consulta na Engine Groq/Llama." 
      };
    }
  }
};