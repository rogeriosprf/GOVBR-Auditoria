const API_BASE = '/api';

export const api = {
  async listarAuditorias() {
    const r = await fetch(`${API_BASE}/auditorias`);
    return r.json();
  },

  async estatisticas() {
    const r = await fetch(`${API_BASE}/stats`);
    return r.json();
  }
};
