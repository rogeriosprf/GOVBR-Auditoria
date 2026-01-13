// 1. Verifique se o caminho da importação está correto (store.js ou state.js)
import { Store } from '../store/store.js'; 
import { carregarCards } from './cards.controller.js';

export function initFilters() {
  
  // Filtro de Risco
  document.getElementById('combo-risco')?.addEventListener('change', e => {
    // CORREÇÃO: Passar como objeto para bater com o Reducer
    const valor = parseFloat(e.target.value) || 0;
    Store.setFiltro({ risco: valor });
    
    // Opcional: Remova o carregarCards daqui se você já tiver 
    // um listener de 'state:change' na Store que faz isso.
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