import { Store } from '../store/state.js';
import { renderModal } from '../ui/modal.js';
import { chatAnalyzeCase, chatSetViagemContext } from '../ui/chat.js';

export function initModalController() {
  let lastChatCaseId = null;
  const panel = document.getElementById('card-panel');
  const closeBtn = document.getElementById('card-close');
  const approveBtn = document.getElementById('card-normal');
  const authBox = document.getElementById('approval-auth-box');
  const authInput = document.getElementById('approval-auth-password');
  const authConfirmBtn = document.getElementById('approval-auth-confirm');
  const authCancelBtn = document.getElementById('approval-auth-cancel');
  const authFeedback = document.getElementById('approval-auth-feedback');

  if (!panel) return;

  // =========================
  // OPEN
  // =========================
  Store.on('modal:open', card => {
    const viagemId = card?.id_viagem || card?.identificador_id || card?.id;
    console.log('Abrindo modal para:', viagemId);

    // Evita duplicar análise automática quando o mesmo card é reaberto para enriquecer detalhes.
    if (viagemId && viagemId !== lastChatCaseId) {
      chatSetViagemContext(viagemId);
      chatAnalyzeCase(viagemId);
      lastChatCaseId = viagemId;
    }

    renderModal(card);
    // Se o painel já está visível, apenas atualiza o conteúdo sem re-animar
    if (!panel.classList.contains('show')) {
      panel.classList.remove('hidden');
      requestAnimationFrame(() => panel.classList.add('show'));
    }

    resetApprovalAuth();
  });

  // =========================
  // CLOSE
  // =========================
  Store.on('modal:close', () => {
    panel.classList.remove('show');
    setTimeout(() => panel.classList.add('hidden'), 300);
    lastChatCaseId = null;
  });

  closeBtn?.addEventListener('click', () => {
    Store.closeModal();
  });

  approveBtn?.addEventListener('click', () => {
    if (!authBox) return;
    authBox.classList.remove('hidden');
    if (authInput) {
      authInput.value = '';
      authInput.focus();
    }
    setApprovalFeedback('');
  });

  authCancelBtn?.addEventListener('click', () => {
    resetApprovalAuth();
  });

  authConfirmBtn?.addEventListener('click', () => {
    handleApprovalAuth();
  });

  authInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApprovalAuth();
    }
  });

  function setApprovalFeedback(message, tone = 'neutral') {
    if (!authFeedback) return;
    authFeedback.textContent = message;
    if (tone === 'error') authFeedback.className = 'text-[10px] font-semibold text-red-600';
    else if (tone === 'success') authFeedback.className = 'text-[10px] font-semibold text-emerald-600';
    else authFeedback.className = 'text-[10px] font-semibold text-slate-500';
  }

  function resetApprovalAuth() {
    if (authBox) authBox.classList.add('hidden');
    if (authInput) authInput.value = '';
    setApprovalFeedback('');
  }

  function handleApprovalAuth() {
    const fakePassword = 'AUDIT123';
    const value = (authInput?.value || '').trim();

    if (!value) {
      setApprovalFeedback('Informe a senha para confirmar a aprovação.', 'error');
      return;
    }

    if (value !== fakePassword) {
      setApprovalFeedback('Senha inválida. Tente novamente.', 'error');
      return;
    }

    setApprovalFeedback('Aprovação registrada (simulação).', 'success');
    setTimeout(() => {
      resetApprovalAuth();
      Store.closeModal();
    }, 600);
  }
}

// =========================
// RENDER
// =========================
