import { Store } from '../store/state.js';
import { carregarCards } from './cards.controller.js';

export function initFilters() {
  document.getElementById('combo-risco')?.addEventListener('change', e => {
    Store.setFiltro('risco', e.target.value);
    carregarCards();
  });

  document.getElementById('combo-status')?.addEventListener('change', e => {
    Store.setFiltro('status', e.target.value);
    carregarCards();
  });

  let debounce;
  document.getElementById('search-text')?.addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      Store.setFiltro('texto', e.target.value);
      carregarCards();
    }, 400);
  });
}
