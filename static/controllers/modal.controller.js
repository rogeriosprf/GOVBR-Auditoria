import { Store } from '../store/state.js';
import { renderModal } from '../ui/modal.js';

export function initModalController() {
  const panel = document.getElementById('card-panel');
  const closeBtn = document.getElementById('card-close');

  if (!panel) return;

  // =========================
  // OPEN
  // =========================
  Store.on('modal:open', card => {
    const viagemId = card?.id_viagem || card?.identificador_id || card?.id;
    console.log('Abrindo modal para:', viagemId);

    // Atualiza contexto do chat
    if (window.chatSetViagemContext) {
      window.chatSetViagemContext(viagemId);
    }

    renderModal(card);
    // Se o painel já está visível, apenas atualiza o conteúdo sem re-animar
    if (!panel.classList.contains('show')) {
      panel.classList.remove('hidden');
      requestAnimationFrame(() => panel.classList.add('show'));
    }
  });

  // =========================
  // CLOSE
  // =========================
  Store.on('modal:close', () => {
    panel.classList.remove('show');
    setTimeout(() => panel.classList.add('hidden'), 300);
  });

  closeBtn?.addEventListener('click', () => {
    Store.closeModal();
  });

  // Função global moderna para fechar o modal e alias para compatibilidade
  // Expõe no window por simplicidade (tiny legacy bridge)
  window.fecharModal = function () {
    console.log('fecharModal() chamado - fechando modal');
    Store.closeModal();
  };

  // Mantém o nome antigo como alias por compatibilidade (pode ser removido depois)
  window.fecharCard = window.fecharModal;
}

// =========================
// RENDER
// =========================
