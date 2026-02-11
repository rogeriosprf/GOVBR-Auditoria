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

// =========================
// UI pura (sem estado)
// =========================
import { setupTabs } from './ui/tabs.js';
import { setupChat } from './ui/chat.js';
import { initDashboard } from './ui/dashboard.js';
import { initHomeLanding, initInsights, initPaymentMonitor } from './ui/home_landing.js';

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
  setupChat();
  setupTabs({
    onHome: initHomeLanding,
    onInsights: initInsights,
    onDashboard: initDashboard,
    onPagamentos: initPaymentMonitor,
    onBeforeTabChange: () => Store.closeModal(),
  });

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
  try {
    // Ordem de carga definida: Home -> Cards -> BI -> Pagamentos -> Insights
    await initHomeLanding();

    if (gridElement) {
      await carregarCards(gridElement);
    } else {
      console.warn('⚠️ Container de cards não encontrado (id="cards-grid")');
    }

    await initDashboard();
    await initPaymentMonitor();
    await initInsights();
  } catch (err) {
    console.error('Erro na carga inicial:', err);
    if (gridElement) {
      gridElement.innerHTML = `
        <div class="col-span-1 text-center text-slate-400 italic py-10">
          Nenhum card disponível no momento.
        </div>
      `;
    }
  }
});
