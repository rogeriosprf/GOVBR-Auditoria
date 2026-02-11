// 1. Verifique se o caminho da importação está correto (store.js ou state.js)
import { Store } from '../store/state.js';
import { carregarCards } from './cards.controller.js';
import { api } from '../services/api.js';

export function initFilters() {
  hydrateCriticidades();

  // Filtro de Risco
  document.getElementById('combo-risco')?.addEventListener('change', e => {
    const valor = (e.target.value || '').trim();
    Store.setFiltro({ criticidade: valor });

    // Opcional: Remova o carregarCards daqui se você já tiver 
    // um listener de 'state:change' na Store que faz isso.
    carregarCards();
  });

  // Filtro de Urgência
  document.getElementById('combo-urgente')?.addEventListener('change', e => {
    const valor = (e.target.value || '').trim();
    let urgente = null;
    if (valor === 'true') urgente = true;
    if (valor === 'false') urgente = false;
    Store.setFiltro({ urgente });
    carregarCards();
  });

  // Filtro de Status
  document.getElementById('combo-status')?.addEventListener('change', e => {
    Store.setFiltro({ status: e.target.value });
    carregarCards();
  });

  // Filtro de Busca Textual (com Debounce)
  let debounceTimer;
  document.getElementById('search-text')?.addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log('[Filters] Aplicando busca:', e.target.value);
      Store.setFiltro({ texto: e.target.value });
      carregarCards();
    }, 400);
  });
}

async function hydrateCriticidades() {
  const select = document.getElementById('combo-risco');
  if (!select) return;

  const current = select.value;
  const rows = await api.listarCriticidades();
  const criticidades = rows
    .map(r => (r.criticidade || r.nivel_criticidade || '').toString().trim())
    .filter(Boolean);

  if (!criticidades.length) {
    console.warn('[Filters] Nenhuma criticidade retornada pela API.');
    return;
  }

  const labels = new Map([
    ['CRÍTICO', '🚨 Crítico'],
    ['CRITICO', '🚨 Crítico'],
    ['ALTO', 'Alto'],
    ['MÉDIO', 'Médio'],
    ['MEDIO', 'Médio'],
    ['BAIXO', 'Baixo'],
  ]);

  const options = [''].concat(criticidades);
  select.innerHTML = options.map((c, idx) => {
    if (idx === 0) {
      return '<option value="">Todos os níveis</option>';
    }
    const key = c.toUpperCase();
    const label = labels.get(key) || c;
    return `<option value="${c}">${label}</option>`;
  }).join('');

  if (current) select.value = current;
}
