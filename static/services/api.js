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
        total_viagens: rawSummary.total_viagens ?? 0,
        total_critico: rawSummary.total_critico ?? 0,
        total_valor: rawSummary.total_valor ?? 0,
        taxa_risco_global: rawSummary.taxa_risco_global ?? 0.0
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
        summary: { total_viagens: 0, total_critico: 0, total_valor: 0, taxa_risco_global: 0.0 },
        orgaos: []
      };
    }
  },

  /**
   * Busca a lista de viagens filtradas para os Cards
   * Sincronizado com: p_busca e p_score_min do backend
   */
  async listarAuditorias(p_busca = '', criticidade = '', urgente = null) {
    try {
      // Ajustado para os novos nomes de parâmetros do FastAPI
      const params = new URLSearchParams({
        busca: p_busca
      });
      if (criticidade) params.set('criticidade', criticidade);
      if (urgente !== null && urgente !== undefined) params.set('urgente', String(urgente));
      
      // Mudamos de /cards para /viagens conforme o router.py
      const response = await fetch(`${API_BASE}/viagens?${params.toString()}`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();

      // Retorna o objeto AuditListResponse: { total_encontrados, viagens, ... }
      return {
        total_encontrados: data.total_encontrados ?? 0,
        viagens: data.viagens ?? [],
        termo_busca: data.termo_busca ?? p_busca,
        nivel_risco: data.nivel_risco ?? null
      };
    } catch (error) {
      console.error('[API] Erro ao listar auditorias:', error);
      return { total_encontrados: 0, viagens: [], termo_busca: p_busca };
    }
  },

  async listarCriticidades() {
    try {
      const response = await fetch(`${API_BASE}/criticidades`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao listar criticidades:', error);
      return [];
    }
  },

  async listarInsights() {
    try {
      const response = await fetch(`${API_BASE}/insights`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao listar insights:', error);
      return [];
    }
  },

  async controlConformidade() {
    try {
      const response = await fetch(`${API_BASE}/control-conformidade`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[API] Erro ao carregar conformidade:', error);
      return {};
    }
  },

  async controlAlertas() {
    try {
      const response = await fetch(`${API_BASE}/control-alertas`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao carregar alertas operacionais:', error);
      return [];
    }
  },

  async controlPagamentos(mes = null) {
    try {
      const suffix = mes ? `?mes=${encodeURIComponent(mes)}` : '';
      const response = await fetch(`${API_BASE}/control-pagamentos${suffix}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[API] Erro ao carregar monitor de pagamentos:', error);
      return {};
    }
  },

  async controlPagamentosOutliers(mes = null) {
    try {
      const suffix = mes ? `?mes=${encodeURIComponent(mes)}` : '';
      const response = await fetch(`${API_BASE}/control-pagamentos-outliers${suffix}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao carregar outliers de pagamentos:', error);
      return [];
    }
  },

  async controlPagamentosTardias(mes = null) {
    try {
      const suffix = mes ? `?mes=${encodeURIComponent(mes)}` : '';
      const response = await fetch(`${API_BASE}/control-pagamentos-tardias${suffix}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao carregar compras tardias:', error);
      return [];
    }
  },

  async controlPagamentosCasos() {
    try {
      const response = await fetch(`${API_BASE}/control-pagamentos-casos`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao carregar casos de pagamentos:', error);
      return [];
    }
  },

  async dashboardKPIs() {
    try {
      const response = await fetch('/api/dashboard/kpis');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao carregar KPIs do dashboard:', error);
      return [];
    }
  },

  async dashboardAnaliseTemporal() {
    try {
      const response = await fetch('/api/dashboard/analise-temporal');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao carregar análise temporal:', error);
      return [];
    }
  },

  async dashboardRankingDestinos() {
    try {
      const response = await fetch('/api/dashboard/ranking-destinos');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao carregar ranking destinos:', error);
      return [];
    }
  },

  async dashboardRankingOrgaos() {
    try {
      const response = await fetch('/api/dashboard/ranking-orgaos');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao carregar ranking órgãos:', error);
      return [];
    }
  },

  async dashboardTopAlvos() {
    try {
      const response = await fetch('/api/dashboard/top-alvos');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Erro ao carregar top alvos:', error);
      return [];
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

  async perguntarIA(mensagem, id_viagem = null) {
    
    if (!mensagem || !mensagem.trim()) {
    return { resposta: "Digite uma pergunta válida." };
  }
      
    try {
      const payload = { mensagem };
      if (id_viagem) payload.id_viagem = id_viagem;

      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('[API] Erro no Chat IA:', error);
      return { 
        resposta: "Desculpe, tive um problema ao processar sua consulta na Engine Groq/Llama." 
      };
    }
  },

  async analisarCasoIA(id_viagem) {
    if (!id_viagem) {
      return { resposta: "ID da viagem não informado." };
    }

    try {
      const response = await fetch(`${API_BASE}/chat/analise-caso/${encodeURIComponent(id_viagem)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`[API] Erro na análise automática do caso (${id_viagem}):`, error);
      return {
        id_viagem,
        resposta: "Desculpe, tive um problema ao analisar este caso."
      };
    }
  },

  async analisarInsightIA(insight = {}) {
    const titulo = (insight.titulo || '').trim();
    if (!titulo) {
      return { resposta: "Insight inválido: título não informado." };
    }

    try {
      const response = await fetch(`${API_BASE}/chat/analise-insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          valor: insight.valor ?? null,
          detalhe: insight.detalhe ?? null,
          tipo: insight.tipo ?? null,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[API] Erro na análise de insight:', error);
      return {
        insight,
        resposta: "Desculpe, tive um problema ao analisar este insight."
      };
    }
  }
};
