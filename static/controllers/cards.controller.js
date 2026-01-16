import { api } from '../services/api.js';
import { renderCards } from '../ui/cards.js';
import { Store } from '../store/state.js';

let currentDetailRequestId = 0;

/**
 * Orquestra a busca de dados e chama a UI para renderizar
 * @param {HTMLElement} targetContainer - Opcional: container passado pela Home
 */
export async function carregarCards(targetContainer = null) {
  // 1. Sincronização de IDs: Busca 'cards-grid' (conforme seu bootstrap) ou o passado
  const container = targetContainer || document.getElementById('cards-grid');
  
  if (!container) {
    console.warn('[CardsController] Container não encontrado. Verifique se o ID no HTML é "cards-grid".');
    return;
  }

  // 2. Feedback de Loading (Skeleton)
  container.innerHTML = `
    <div class="col-span-full text-center py-20">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mb-2 border-t-transparent"></div>
      <p class="text-slate-400 italic text-sm font-medium">Sincronizando com a base de auditoria...</p>
    </div>
  `;

  try {
    // 3. Pega os filtros atuais da Store
    const filtros = Store.getFiltros ? Store.getFiltros() : { texto: '', risco: 0 }; 
    const p_busca = filtros.texto || "";
    const p_score = filtros.risco || 0.0;

    // 4. Busca na API
    const responseData = await api.listarAuditorias(p_busca, p_score);

    // 5. Renderização e Comportamento
    renderCards(container, responseData, async (cardData) => {
      const requestId = ++currentDetailRequestId;

      console.log('🚀 [Cards] Iniciando fluxo de detalhamento:', cardData.id_viagem);

      Store.openModal?.(cardData);

      try {
        const detalhesEnriquecidos = await api.getDetalhes(cardData.id_viagem);
      
        // Se o usuário clicou em outro card depois, ignora esta resposta
        if (requestId !== currentDetailRequestId) return;
      
        Store.openModal?.({ ...cardData, detalhe: detalhesEnriquecidos });
      } catch (err) {
        console.error('[Cards] Erro ao enriquecer modal:', err);
      }
    });

  } catch (err) {
    console.error('[CardsController] Erro fatal:', err);
    container.innerHTML = `
      <div class="col-span-full text-center text-red-400 py-20 border border-red-100 rounded-3xl bg-red-50/20">
        <p class="font-bold">Servidor Indisponível</p>
        <p class="text-xs mt-1 italic">Verifique a conexão com o backend em :8000</p>
      </div>
    `;
  }
}