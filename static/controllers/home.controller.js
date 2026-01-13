import { api } from '../services/api.js';
import { carregarCards } from './cards.controller.js';

export async function initHome() {
  try {
    const data = await api.summary();
    const s = data.summary;
    const listaOrgaos = data.orgaos;

    const updateDisplay = (id, val, suffix = '', isCurrency = false) => {
      const el = document.getElementById(id);
      if (!el) return;
      const num = Number(val ?? 0);
      el.innerText = isCurrency 
        ? num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : `${num.toLocaleString('pt-BR')}${suffix}`;
    };

    updateDisplay('kpi-total', s.total_viagens);
    updateDisplay('kpi-critico', s.total_critico);
    updateDisplay('kpi-valor', s.total_sigilo, '', true); 
    updateDisplay('kpi-risco', s.taxa_risco_global, '%');

    renderizarListaOrgaos(listaOrgaos);

    // --- CORREÇÃO AQUI ---
    // Buscamos o container e passamos para o controlador de cards
    const gridElement = document.getElementById('cards-grid');
    if (gridElement) {
      console.log('[Home] Inicializando grid de cards...');
      await carregarCards(gridElement); 
    }

  } catch (error) {
    console.error('Erro ao inicializar Home:', error);
  }
}

function renderizarListaOrgaos(orgaos) {
  const container = document.getElementById('lista-orgaos-container');
  if (!container) return;
  if (!orgaos || orgaos.length === 0) {
    container.innerHTML = '<div class="text-slate-400 text-xs italic p-4">Sem dados</div>';
    return;
  }
  container.innerHTML = orgaos.map(o => {
    const nome = o.nome || o.nome_do_orgao_superior || 'Órgão Desconhecido';
    const qtd = Number(o.total ?? 0);
    const score = Number(o.score_medio ?? 0);
    const color = score >= 0.8 ? 'text-red-500' : (score >= 0.5 ? 'text-amber-500' : 'text-emerald-500');
    return `
      <div class="flex flex-col py-3 border-b border-slate-50 last:border-0">
        <div class="flex justify-between items-start mb-1">
          <span class="text-[11px] font-medium text-slate-700 truncate pr-2 w-40" title="${nome}">${nome}</span>
          <span class="text-[10px] font-bold ${color}">${(score * 100).toFixed(0)}%</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-[9px] text-slate-400 uppercase font-black">${qtd} viagens</span>
          <div class="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-slate-300" style="width: ${Math.min(qtd, 100)}%"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}