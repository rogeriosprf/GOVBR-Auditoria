// =========================
// STORE / ESTADO
// =========================
import { Store } from './store/store.js';

// =========================
// CONTROLLERS (fluxo / regras)
// =========================
import { initFilters } from './controllers/filters.controller.js';
import { carregarCards } from './controllers/cards.controller.js';
import { initModalController } from './controllers/modal.controller.js';
import { initKeyboardController } from './controllers/keyboard.controller.js';
import { initTimelineController } from './controllers/timeline.controller.js';
import { initReplayController } from './controllers/replay.controller.js';
import { initHome } from './controllers/home.controller.js'; // ✅ import do home
import { api } from './services/api.js';

// =========================
// UI pura (sem estado)
// =========================
import { setupTabs } from './ui/tabs.js';
import { setupChat } from './ui/chat.js';
import { initDashboard } from './ui/dashboard.js';
import { initHomeLanding } from './ui/home_landing.js';

// =========================
// DEBUG / DEVTOOLS
// =========================
if (import.meta.env?.DEV || true) {
  window.Store = Store;
  console.info('🧠 Store exposta em window.Store');
}

// =========================
// BOOTSTRAP
// =========================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 [SIAV] Engine iniciada');

  // =========================
  // CONTROLLERS (FLUXO)
  // =========================
  initModalController();
  initFilters();
  initKeyboardController();
  initTimelineController();
  initReplayController();

  // =========================
  // UI (RENDER PURO)
  // =========================
  setupTabs();
  setupChat();

  // =========================
  // INICIALIZA HOME
  // =========================
  try {
    await initHome();
    console.log('✅ Home inicializada com sucesso');
  } catch (err) {
    console.error('Erro ao inicializar home:', err);
  }

  // =========================
  // OBSERVADOR GLOBAL
  // =========================
  Store.on('state:change', (state) => {
    console.debug('[STATE]', state);
  });

  // =========================
  // CARGA INICIAL DE CARDS
  // =========================
  const gridElement = document.getElementById('cards-grid');
  if (gridElement) {
    try {
      await carregarCards(gridElement, async (cardData) => {
        console.log('Card clicado:', cardData);
        // Abre o modal imediatamente com os dados disponíveis
        Store.openModal(cardData);

        // Carrega os detalhes em background e atualiza o modal quando disponíveis
        try {
          const detalhe = await api.getDetalhes(cardData.id_viagem);
          Store.openModal({ ...cardData, detalhe });
        } catch (err) {
          console.error('Erro ao carregar detalhes do card:', err);
          // Opcional: atualiza modal com um flag de erro (não obrigatório)
          Store.openModal({ ...cardData, detalhe: { error: true } });
        }
      });
    } catch (err) {
      console.error('Erro ao carregar cards:', err);

      // Render fallback vazio
      gridElement.innerHTML = `
        <div class="col-span-1 text-center text-slate-400 italic py-10">
          Nenhum card disponível no momento.
        </div>
      `;
    }
  } else {
    console.warn('⚠️ Container de cards não encontrado (id="cards-grid")');
  }
});
