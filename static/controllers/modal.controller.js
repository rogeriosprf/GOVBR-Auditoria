import { Store } from '../store/state.js';

export function initModalController() {
  const panel = document.getElementById('card-panel');
  const closeBtn = document.getElementById('card-close');

  if (!panel) return;

  // =========================
  // OPEN
  // =========================
  Store.on('modal:open', card => {
    console.log('Abrindo modal para:', card?.id_viagem || card?.identificador_id || card?.id);
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
  window.fecharModal = function() {
    console.log('fecharModal() chamado - fechando modal');
    Store.closeModal();
  };

  // Mantém o nome antigo como alias por compatibilidade (pode ser removido depois)
  window.fecharCard = window.fecharModal;
}

// =========================
// RENDER
// =========================
function renderModal(card) {
  if (!card) return;

  // Prioriza dados do detalhe carregado (quando disponível)
  const detalhe = card.detalhe?.viagem || {};
  const loading = !card.detalhe || card.detalhe?.error;

  const id_viagem = detalhe.id_viagem || card.id_viagem || card.id || detalhe.pcdp_id || card.identificador_id || '';
  const nome = loading ? 'Carregando...' : (detalhe.nome || card.nome || detalhe.nome_viajante || 'Sem nome');
  const data_inicio = loading ? 'Carregando...' : (detalhe.data_inicio || card.data_inicio || '');
  const orgao = loading ? 'Carregando...' : (detalhe.orgao || card.orgao || detalhe.orgao_superior || '');
  const motivo = loading ? 'Carregando...' : (detalhe.motivo || card.motivo || detalhe.justificativa || '');
  const valor = loading ? null : Number(detalhe.valor_total || card.valor_total || 0);
  const score = loading ? null : Number(detalhe.score_risco || card.score_risco || detalhe.score_medio || 0);

  document.getElementById('card-title').innerText = `PCDP: ${id_viagem}`;
  document.getElementById('card-id-label').innerText = id_viagem;
  document.getElementById('card-nome-viajante').innerText = nome;
  document.getElementById('card-data-inicio').innerText = data_inicio;
  document.getElementById('card-orgao-val').innerText = orgao;
  document.getElementById('card-motivo-val').innerText = `"${motivo}"`;

  if (valor === null) {
    document.getElementById('card-valor').innerText = 'Carregando...';
  } else {
    document.getElementById('card-valor').innerText = `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }

  renderBadge(score);
}

function renderBadge(score) {
  const badge = document.getElementById('card-badge-risco');

  if (score === null || score === undefined) {
    badge.innerText = 'Risco: —';
    badge.className = 'w-fit px-2 py-0.5 rounded text-[9px] font-black border uppercase mb-1 bg-slate-50 text-slate-400 border-slate-100';
    return;
  }

  const risco = Number(score);
  const pct = Math.round(risco * 100);

  badge.innerText = `Risco: ${pct}%`;
  badge.className =
    risco >= 0.7
      ? 'w-fit px-2 py-0.5 rounded text-[9px] font-black border uppercase mb-1 bg-red-50 text-red-600 border-red-200'
      : 'w-fit px-2 py-0.5 rounded text-[9px] font-black border uppercase mb-1 bg-amber-50 text-amber-600 border-amber-200';
}
