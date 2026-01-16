import { api } from '../services/api.js';
import { carregarCards } from './cards.controller.js';
import { renderHomeKPIs, renderListaOrgaos } from '../ui/home.js';

export async function initHome() {
  try {
    const data = await api.summary();

    // Renderiza KPIs e Lista via UI module
    renderHomeKPIs(data.summary);
    renderListaOrgaos(data.orgaos);

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