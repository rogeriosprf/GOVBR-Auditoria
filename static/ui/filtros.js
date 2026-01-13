export function setupFiltros(onFilterChange) {
  // Lista de IDs que o script de filtros precisa encontrar no index.html
  const ids = ['combo-orgao', 'combo-risco', 'combo-status', 'search-text'];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      // Se for input de texto, usa 'input', se for select, usa 'change'
      const eventType = el.tagName === 'INPUT' ? 'input' : 'change';
      el.addEventListener(eventType, onFilterChange);
    } else {
      console.warn(`⚠️ Filtro não configurado: Elemento #${id} não encontrado no HTML.`);
    }
  });
}