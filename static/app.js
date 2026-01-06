import { State } from '/static/store/state.js';
import { api } from '/static/services/api.js';
import { calcularRisco } from '/static/domain/risco.js';
import { filtrarCards } from '/static/domain/auditoria.js';
import { renderCards } from '/static/ui/cards.js';
import { setupFiltros } from '/static/ui/filtros.js';
import { setupTabs } from '/static/ui/tabs.js';
import { setupChat } from '/static/ui/chat.js';

console.log('APP INICIALIZADO');

document.addEventListener('DOMContentLoaded', async () => {
  let cardAtual = null;

  const grid = document.getElementById('cards-grid');
  const cardPanel = document.getElementById('card-panel');
  // Accessibility: initial state is hidden
  if (cardPanel) cardPanel.setAttribute('aria-hidden', 'true');
  const cardTitle = document.getElementById('card-title');
  const cardScore = document.getElementById('card-score');
  const cardStatus = document.getElementById('card-status');
  const cardOrgao = document.getElementById('card-orgao');
  const cardResumo = document.getElementById('card-resumo');
  const cardJustificativa = document.getElementById('card-justificativa');
  const cardCloseBtn = document.getElementById('card-close');
  const cardNormalBtn = document.getElementById('card-normal');
  const cardFraudeBtn = document.getElementById('card-fraude');
  const cardAnexoBtn = document.getElementById('card-anexo');
  const main = document.querySelector('main');
  const overlay = document.getElementById('overlay');

  if (overlay) overlay.addEventListener('click', fecharCard);

  // Close panel on ESC so keyboard users can exit
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cardPanel.classList.contains('show')) {
      fecharCard();
    }
  });

  // --- Inicialização ---
  const raw = await api.listarAuditorias();
  State.cards = raw.map(c => ({
    ...c,
    score: Number(c.score),
    auditado: false,
    risco_label: calcularRisco(Number(c.score)),
    justificativa: '',
    status: 'pendente'
  }));
  document.getElementById('h-total').innerText = State.cards.length;

  setupFiltros(run);
  setupTabs();
  setupChat();
  run();
  // fetch and display system status (version, DB, Groq)
  fetchSystemStatus();
  setInterval(fetchSystemStatus, 60 * 1000);

  // Dashboard loader
  window.loadDashboard = fetchDashboardStats;

  async function fetchDashboardStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('stats fetch failed');
      const data = await res.json();

      const rankingEl = document.getElementById('dashboard-ranking');
      if (rankingEl) {
        if (!data.ranking || data.ranking.length === 0) {
          rankingEl.innerHTML = '<p class="text-sm text-slate-500">Nenhum dado de ranking disponível.</p>'
        } else {
          rankingEl.innerHTML = `<table class="w-full text-sm">
            <thead class="text-left text-xs text-slate-400"><tr><th>Órgão</th><th class="text-right">Valor sob risco</th><th class="text-right">% Anomalias</th></tr></thead>
            <tbody>${data.ranking.slice(0,10).map(r => `
              <tr class="border-t"><td class="py-2">${r.nome_do_orgao_superior}</td><td class="py-2 text-right">${(r.valor_sob_risco*100).toFixed(1)}%</td><td class="py-2 text-right">${(r.percentual_anomalias).toFixed(1)}%</td></tr>
            `).join('')}</tbody></table>`
        }
      }

      const gestaoEl = document.getElementById('dashboard-gestao');
      if (gestaoEl) {
        if (!data.gestao || data.gestao.length === 0) {
          gestaoEl.innerHTML = '<p class="text-sm text-slate-500">Sem dados de gestão.</p>'
        } else {
          gestaoEl.innerHTML = data.gestao.slice(0,4).map(g => `
            <div class="p-3 bg-slate-50 rounded">
              <div class="text-xs text-slate-500">${g.gestao_presidencial} — ${g.nome_do_orgao_superior}</div>
              <div class="font-bold">Viagens: ${g.total_viagens.toLocaleString()}</div>
              <div class="text-xs text-slate-400">Anomalias: ${g.qtd_anomalias} (${(g.pct_anomalias).toFixed(2)}%)</div>
            </div>
          `).join('')
        }
      }

    } catch (e) {
      console.error('Error fetching dashboard stats', e);
      const rankingEl = document.getElementById('dashboard-ranking');
      if (rankingEl) rankingEl.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar dados.</p>'
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch('/status');
      if (!res.ok) throw new Error('status fetch failed');
      const data = await res.json();
      const sVer = document.getElementById('settings-version'); if (sVer) sVer.innerText = `v${data.version ?? '—'}`;
      const sDb = document.getElementById('settings-db'); if (sDb) sDb.innerText = data.services?.db ?? '—';
      const sGroq = document.getElementById('settings-groq'); if (sGroq) sGroq.innerText = data.services?.groq ?? '—';
    } catch (e) {
      console.error('Error loading settings', e);
    }
  }

  // bind settings refresh button
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'settings-refresh') loadSettings();
  });
  


  function run() {
    State.filtros.texto = document.getElementById('search-text').value.toLowerCase();
    State.filtros.risco = document.getElementById('combo-risco').value;
    State.filtros.status = document.getElementById('combo-status').value;

    const filtrados = filtrarCards(State.cards, State.filtros);
    renderCards(grid, filtrados, abrirCard);
    atualizarHome();
  }

  // Ensure the modal is centered over the main area (not the whole viewport)
  function adjustPanelPosition() {
    if (!cardPanel || !main) return;
    if (window.innerWidth <= 900) {
      cardPanel.style.left = '50%';
      return;
    }
    const rect = main.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    cardPanel.style.left = `${centerX}px`;
  }

  // Recompute on resize when panel is open
  window.addEventListener('resize', () => {
    if (cardPanel && cardPanel.classList.contains('show')) {
      adjustPanelPosition();
    }
  });

  function atualizarHome() {
    const total = State.cards.length;
    const audited = State.cards.filter(c => c.auditado).length;
    const pending = State.cards.filter(c => c.status === 'pendente').length;
    const fraudeCount = State.cards.filter(c => c.status === 'fraude').length;
    const fraudePercent = audited ? (fraudeCount / audited) * 100 : 0;

    document.getElementById('h-total').innerText = total;
    document.getElementById('h-audit').innerText = audited;
    const elPending = document.getElementById('h-pending');
    if (elPending) elPending.innerText = pending;
    const elFraude = document.getElementById('h-fraude-percent');
    if (elFraude) elFraude.innerText = `${fraudePercent.toFixed(1)}%`;
  }

  async function fetchSystemStatus() {
    try {
      const res = await fetch('/status');
      if (!res.ok) throw new Error('status fetch failed');
      const data = await res.json();
      const verEl = document.getElementById('system-version');
      if (verEl) verEl.innerText = `v${data.version ?? '—'}`;
      const sysEl = document.getElementById('system-status-value');
      if (sysEl) {
        sysEl.innerText = data.message === 'ok' ? 'ok' : 'down';
        sysEl.className = data.message === 'ok' ? 'text-green-600' : 'text-red-600';
      }
      if (data.services) {
        const dbEl = document.getElementById('api-db');
        const groqEl = document.getElementById('api-groq');
        if (dbEl) {
          dbEl.innerText = data.services.db ?? '—';
          dbEl.className = data.services.db === 'ok' ? 'text-green-600' : 'text-red-600';
        }
        if (groqEl) {
          groqEl.innerText = data.services.groq ?? '—';
          groqEl.className = (data.services.groq === 'ok' || data.services.groq === 'disabled') ? 'text-green-600' : 'text-red-600';
        }
      }
    } catch (e) {
      console.error('Error fetching status', e);
      const sysEl = document.getElementById('system-status-value');
      if (sysEl) { sysEl.innerText = 'down'; sysEl.className = 'text-red-600'; }
    }
  }

  function abrirCard(card) {
    cardAtual = card;
    cardTitle.innerText = `Caso ID: ${card.id} • Registro: ${card.registro_id ?? '—'}`;
    cardScore.innerText = card.score;
    cardStatus.innerText = card.auditado ? 'Auditado' : 'Pendente';
    cardOrgao.innerText = card.orgao;
    cardResumo.innerText = card.resumo;
    cardJustificativa.value = card.justificativa || '';

    // Position panel in the center of the main area to avoid overlapping chat
    adjustPanelPosition();

    cardPanel.classList.add('show');
    if (overlay) overlay.classList.add('show');
    if (cardPanel) cardPanel.setAttribute('aria-hidden','false');
  }

  function fecharCard() {
    cardPanel.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
    if (cardPanel) cardPanel.setAttribute('aria-hidden','true');
    // Clear the inline left when closing so CSS fallback remains
    if (cardPanel) cardPanel.style.left = '';
    cardAtual = null;
  }

  // --- Eventos ---
  cardCloseBtn.onclick = fecharCard;
  cardNormalBtn.onclick = () => salvarAnalise('normal');
  cardFraudeBtn.onclick = () => salvarAnalise('fraude');
  cardAnexoBtn.onclick = () => alert('Funcionalidade de anexos ainda não implementada');

  function salvarAnalise(status) {
    if (!cardAtual) return;
    cardAtual.status = status;
    cardAtual.auditado = true;
    cardAtual.justificativa = cardJustificativa.value;

    // Salva no backend
    fetch(`/api/auditorias/${cardAtual.id}/analise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status, justificativa: cardJustificativa.value })
    }).then(r => {
      if (!r.ok) console.error('Erro ao salvar análise');
    }).catch(e => console.error('Erro ao salvar análise', e));

    fecharCard();
    run();
  }
});
