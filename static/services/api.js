// static/services/api.js
const API_BASE = '/api/auditoria';

export const api = {
  async summary() {
    try {
      console.log(`[API] Solicitando summary em: ${API_BASE}/summary`);
      const response = await fetch(`${API_BASE}/summary`);
      
      if (!response.ok) {
        // Se cair aqui e o status for 404, o prefixo no main.py ainda está errado
        throw new Error(`Erro na API: ${response.status} - ${response.statusText}`);
      }

        const data = await response.json();
      console.log('[API] Dados brutos recebidos:', data);

      // A API backend pode retornar os KPIs aninhados em `data.summary` ou em top-level.
      // Normaliza verificando primeiro `data.summary` e, em seguida, top-level.
      const rawSummary = data.summary ?? data;

      // Normaliza os campos tratando snake_case (Python) e camelCase (JS)
      // O uso de ?? garante que 0 seja aceito, mas undefined/null use o padrão
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
      // Retorna estrutura padrão para não quebrar o controller
      return {
        summary: { total_viagens: 0, total_critico: 0, total_sigilo: 0, taxa_risco_global: 0.0 },
        orgaos: []
      };
    }
  },

  async listarAuditorias(filtros = {}) {
    try {
      const params = new URLSearchParams({ 
        q: filtros.q || '', 
        risk: filtros.risk || 0 
      });
      
      const response = await fetch(`${API_BASE}/cards?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('[API] Erro ao listar auditorias:', error);
      return [];
    }
  },

  async getDetalhes(pcdpId) {
    try {
      const response = await fetch(`${API_BASE}/detalhes/${pcdpId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error(`[API] Erro ao buscar detalhes (${pcdpId}):`, error);
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
        resposta: "Desculpe, tive um problema ao processar sua consulta na Engine Llama." 
      };
    }
  }
};