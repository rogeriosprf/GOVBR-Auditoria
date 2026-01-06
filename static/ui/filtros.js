export function setupFiltros(callback) {
  document.getElementById('search-text').addEventListener('input', callback)
  document.getElementById('combo-risco').addEventListener('change', callback)
  document.getElementById('combo-status').addEventListener('change', callback)
}
