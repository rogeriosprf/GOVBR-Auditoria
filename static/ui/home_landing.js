// static/ui/home_landing.js
import { api } from '../services/api.js';
import { chatAnalyzeInsight, chatAsk, chatAddMessage } from './chat.js';

let homeLandingLoaded = false;
let homeLandingPromise = null;
export async function initHomeLanding() {
    if (homeLandingLoaded) return;
    if (homeLandingPromise) {
        await homeLandingPromise;
        return;
    }
    homeLandingPromise = (async () => {
        bindHomeActions();
        await loadKPIs();
        await loadControlAlerts();
        await loadControlPanels();
        updateSyncTime();
        homeLandingLoaded = true;
    })();
    try {
        await homeLandingPromise;
    } finally {
        homeLandingPromise = null;
    }
}

async function loadKPIs() {
    try {
        const data = await api.summary();
        const summary = data?.summary;
        if (!summary) return;
        homeSummaryCache = summary;

        document.getElementById('home-kpi-fila').textContent = summary.total_viagens ?? '0';
        document.getElementById('home-kpi-criticos').textContent = summary.total_critico ?? '0';
        document.getElementById('home-kpi-valor').textContent =
            parseFloat(summary.total_valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 });

        const rawRisco = parseFloat(summary.taxa_risco_global || 0);
        const riscoPct = rawRisco > 1 ? rawRisco : rawRisco * 100;
        document.getElementById('home-kpi-taxa').textContent = `${riscoPct.toFixed(2)}%`;
        updateHomeOperationalPanel();
    } catch (e) {
        console.error('Erro ao carregar KPIs:', e);
    }
}


function updateSyncTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const el = document.getElementById('home-last-sync');
    if (!el) return;
    el.textContent = timeStr;
}

let insightsCache = null;
let homeSummaryCache = null;
let homeAlertsCache = [];
let homeComplianceCache = {};
let homeActionsBound = false;
const MONTH_OPTIONS = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
];

export async function initInsights() {
    await loadInsights();
}


async function loadInsights() {
    try {
        const container = document.getElementById('home-insights');
        if (!container) return;

        if (insightsCache) {
            renderInsights(container, insightsCache);
            return;
        }

        const data = await api.listarInsights();

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-400 italic">Sem insights disponíveis</p>';
            return;
        }
        insightsCache = data.slice(0, 6);
        renderInsights(container, insightsCache);
    } catch (e) {
        console.error('Erro ao carregar insights:', e);
    }
}

function renderInsights(container, data) {
    container.innerHTML = data.map(item => {
        const valor = item.valor ?? '—';
        const detalhe = item.detalhe ?? '';
        const titulo = item.titulo || 'Insight';
        return `
            <button class="group bg-slate-50 border border-slate-100 rounded-xl p-4 text-left hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
                    data-insight-titulo="${titulo}"
                    data-insight-valor="${valor}"
                    data-insight-detalhe="${detalhe}"
                    data-insight-tipo="${item.tipo || 'geral'}">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">${titulo}</p>
                <p class="text-lg font-bold text-slate-800 truncate">${valor}</p>
                <p class="text-[10px] text-slate-500 mt-1">${detalhe}</p>
            </button>
        `;
    }).join('');

    container.querySelectorAll('[data-insight-titulo]').forEach(btn => {
        btn.addEventListener('click', () => {
            const titulo = btn.getAttribute('data-insight-titulo') || 'Insight';
            const valor = btn.getAttribute('data-insight-valor') || '—';
            const detalhe = btn.getAttribute('data-insight-detalhe') || '';
            const tipo = btn.getAttribute('data-insight-tipo') || 'geral';
            try {
                chatAnalyzeInsight({ titulo, valor, detalhe, tipo });
            } catch (err) {
                const prompt = `Analise este insight com base nos dados.\n` +
                    `Título: ${titulo}\nTipo: ${tipo}\nValor: ${valor}\nDetalhe: ${detalhe}`;
                if (chatAsk) chatAsk(prompt);
                else if (chatAddMessage) chatAddMessage(`Analise o insight: ${titulo}`, 'user');
            }
        });
    });
}

async function loadControlPanels() {
    await Promise.all([
        loadControlCompliance(),
    ]);
}

function renderControlCompliance(conf) {
    const confEl = document.getElementById('control-conformidade');
    if (!confEl) return;
    const crits = conf.criticidades || [];
    homeComplianceCache = conf || {};
    confEl.innerHTML = `
        ${crits.slice(0, 3).map(c => `
          <div class="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
            <span class="text-xs font-bold text-slate-700">${c.label}</span>
            <span class="text-[10px] font-mono text-slate-500">${c.total ?? 0} (${c.pct ?? 0}%)</span>
          </div>
        `).join('')}
    `;
    updateHomeOperationalPanel();
}

async function loadControlCompliance() {
    try {
        const conf = await api.controlConformidade();
        renderControlCompliance(conf || {});
    } catch (e) {
        console.error('Erro ao carregar conformidade:', e);
        renderControlCompliance({});
    }
}

function renderControlAlerts(alertas) {
    const alertasEl = document.getElementById('control-alertas');
    if (!alertasEl) return;
    homeAlertsCache = Array.isArray(alertas) ? alertas : [];
    if (!alertas.length) {
        alertasEl.innerHTML = '<p class="text-sm text-slate-400 italic">Sem alertas no momento</p>';
        updateHomeOperationalPanel();
        return;
    }
    alertasEl.innerHTML = alertas.slice(0, 3).map(a => `
        <div class="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
          <div>
            <p class="text-[11px] font-bold text-slate-700">${a.titulo}</p>
            <p class="text-[10px] text-slate-400">${a.detalhe || ''}</p>
          </div>
          <span class="text-xs font-black text-red-600">${a.total ?? 0}</span>
        </div>
    `).join('');
    updateHomeOperationalPanel();
}

async function loadControlAlerts() {
    try {
        const alertas = await api.controlAlertas();
        renderControlAlerts(Array.isArray(alertas) ? alertas : []);
    } catch (e) {
        console.error('Erro ao carregar alertas operacionais:', e);
        renderControlAlerts([]);
    }
}

function updateHomeOperationalPanel() {
    const totalAlertasEl = document.getElementById('home-total-alertas');
    const totalConformesEl = document.getElementById('home-total-conformes-op');

    if (totalAlertasEl) {
        const totalAlertas = homeAlertsCache.reduce((acc, a) => acc + Number(a?.total ?? 0), 0);
        totalAlertasEl.textContent = String(totalAlertas);
    }

    if (totalConformesEl) {
        const crits = homeComplianceCache?.criticidades || [];
        const total = Number(homeComplianceCache?.total_viagens ?? homeSummaryCache?.total_viagens ?? 0);
        const conformes = crits.reduce((acc, c) => {
            const label = String(c?.label || '').toUpperCase();
            const isConforme = label.includes('BAIXO') || label.includes('MÉDIO') || label.includes('MEDIO');
            return acc + (isConforme ? Number(c?.total ?? 0) : 0);
        }, 0);

        if (total > 0) {
            const pct = (conformes * 100) / total;
            totalConformesEl.textContent = `${conformes} (${pct.toFixed(1)}%)`;
        } else {
            totalConformesEl.textContent = String(conformes || '-');
        }
    }
}

function bindHomeActions() {
    if (homeActionsBound) return;

    const buttons = document.querySelectorAll('[data-home-action]');
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-home-action');

            if (action === 'cards-criticos') {
                const combo = document.getElementById('combo-risco');
                if (combo) {
                    combo.value = 'CRÍTICO';
                    combo.dispatchEvent(new Event('change', { bubbles: true }));
                }
                document.getElementById('btn-cards')?.click();
                return;
            }

            if (action === 'pagamentos') {
                document.getElementById('btn-pagamentos')?.click();
                return;
            }

            if (action === 'dashboard') {
                document.getElementById('btn-dashboard')?.click();
            }
        });
    });

    homeActionsBound = true;
}

function renderPaymentMonitor(monitor, extras = {}) {
    const pagamentosEl = document.getElementById('control-monitor-pagamentos');
    if (!pagamentosEl) return;

    const totalMes = Number(monitor.total_mes ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const pico = monitor.pico;
    const picoTxt = pico ? `${pico.dia} · R$ ${Number(pico.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
    const serieData = (monitor.serie || []);
    const maxSerie = Math.max(...serieData.map(s => Number(s.total ?? 0)), 1);
    const bars = serieData.map(s => {
        const val = Number(s.total ?? 0);
        const pct = Math.max(4, Math.round((val / maxSerie) * 100));
        const rawDay = String(s.dia ?? '');
        const dayLabel = rawDay.includes('-') ? rawDay.slice(8, 10) : rawDay.padStart(2, '0');
        return `
          <div class="flex flex-col items-center gap-1 min-w-[20px]">
            <div class="w-3 bg-violet-500/70 rounded-md hover:bg-violet-600 transition-colors"
                 style="height:${pct}px"
                 data-tooltip="R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"></div>
            <span class="text-[9px] text-slate-500">${dayLabel}</span>
          </div>
        `;
    }).join('');

    const outliers = Array.isArray(extras.outliers) ? extras.outliers : [];
    const tardias = Array.isArray(extras.tardias) ? extras.tardias : [];
    const casos = Array.isArray(extras.casos) ? extras.casos : [];

    const outliersHtml = outliers.length
        ? outliers.map((o, i) => `
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-slate-700 truncate pr-2">${i + 1}. ${o.numero_da_proposta_pcdp || o.id_viagem || '—'}</span>
              <span class="text-[10px] font-mono text-red-600">${(Number(o.percentual_taxa_servico || 0) * 100).toFixed(1)}%</span>
            </div>
          `).join('<div class="h-px bg-slate-100"></div>')
        : '<p class="text-sm text-slate-400 italic">Sem outliers no mês.</p>';

    const tardiasHtml = tardias.length
        ? tardias.map((t, i) => `
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-slate-700 truncate pr-2">${i + 1}. ${t.nome || t.numero_da_proposta_pcdp || '—'}</span>
              <span class="text-[10px] font-mono text-amber-600">+${Number(t.dias_apos_inicio || 0)}d</span>
            </div>
          `).join('<div class="h-px bg-slate-100"></div>')
        : '<p class="text-sm text-slate-400 italic">Sem compras tardias no mês.</p>';

    const casosHtml = casos.length
        ? casos.slice(0, 5).map((c, i) => `
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-slate-700 truncate pr-2">${i + 1}. ${c.nome || '—'}</span>
              <span class="text-[10px] font-mono text-slate-600">R$ ${Number(c.valor_viagem || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            </div>
          `).join('<div class="h-px bg-slate-100"></div>')
        : '<p class="text-sm text-slate-400 italic">Sem casos acionáveis.</p>';

    pagamentosEl.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          <span class="text-[11px] font-bold text-slate-700">Total do mês</span>
          <span class="text-[11px] font-mono text-slate-600">R$ ${totalMes}</span>
        </div>
        <div class="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          <span class="text-[11px] font-bold text-slate-700">Pico</span>
          <span class="text-[11px] font-mono text-slate-600">${picoTxt}</span>
        </div>
      </div>
      <div class="pt-3 border-t border-slate-100">
        <div class="flex gap-3">
          <div class="flex flex-col justify-between h-28 text-[9px] text-slate-400">
            <span>R$ ${Number(maxSerie).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            <span>R$ ${Number(maxSerie / 2).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            <span>R$ 0</span>
          </div>
          <div class="flex items-end gap-2 h-28 overflow-x-auto pb-2">${bars || '<p class="text-sm text-slate-400 italic">Sem série</p>'}</div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
        <div class="bg-slate-50 border border-slate-100 rounded-lg p-3">
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Outliers de Taxa</p>
          <div class="space-y-2">${outliersHtml}</div>
        </div>
        <div class="bg-slate-50 border border-slate-100 rounded-lg p-3">
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Compras Tardias</p>
          <div class="space-y-2">${tardiasHtml}</div>
        </div>
        <div class="bg-slate-50 border border-slate-100 rounded-lg p-3">
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Casos Acionáveis</p>
          <div class="space-y-2">${casosHtml}</div>
        </div>
      </div>
    `;

    initPaymentsTooltip();

    const selectMes = document.getElementById('pagamentos-mes');
    if (!selectMes) return;

    const mesAtual = String(monitor.mes_atual || '').slice(-2);
    const selectedMonth = currentPaymentsMonth || mesAtual || String(new Date().getMonth() + 1).padStart(2, '0');
    selectMes.innerHTML = ['<option value=\"\">Mês</option>']
      .concat(MONTH_OPTIONS.map(m => `<option value="${m.value}" ${m.value === selectedMonth ? 'selected' : ''}>${m.label}</option>`))
      .join('');

    if (!currentPaymentsMonth && selectedMonth) {
        currentPaymentsMonth = selectedMonth;
        selectMes.value = selectedMonth;
    }
}

async function loadPaymentMonitor() {
    try {
        const [monitor, outliers, tardias, casos] = await Promise.all([
            api.controlPagamentos(currentPaymentsMonth),
            api.controlPagamentosOutliers(currentPaymentsMonth),
            api.controlPagamentosTardias(currentPaymentsMonth),
            api.controlPagamentosCasos(),
        ]);
        renderPaymentMonitor(monitor || {}, {
            outliers: Array.isArray(outliers) ? outliers : [],
            tardias: Array.isArray(tardias) ? tardias : [],
            casos: Array.isArray(casos) ? casos : [],
        });
    } catch (e) {
        console.error('Erro ao carregar monitor de pagamentos:', e);
    }
}

export async function initPaymentMonitor() {
    await loadPaymentMonitor();
}

let currentPaymentsMonth = null;
document.addEventListener('change', (e) => {
    const target = e.target;
    if (target && target.id === 'pagamentos-mes') {
        currentPaymentsMonth = target.value || null;
        paymentsLoading();
        loadPaymentMonitor();
    }
});

function paymentsLoading() {
    const pagamentosEl = document.getElementById('control-monitor-pagamentos');
    if (!pagamentosEl) return;
    pagamentosEl.innerHTML = '<p class="text-sm text-slate-400 italic">Carregando pagamentos...</p>';
}

let paymentsTooltipEl = null;

function initPaymentsTooltip() {
    const container = document.getElementById('control-monitor-pagamentos');
    if (!container) return;
    const bars = container.querySelectorAll('[data-tooltip]');
    if (!bars.length) return;

    if (!paymentsTooltipEl) {
        paymentsTooltipEl = document.createElement('div');
        paymentsTooltipEl.style.position = 'fixed';
        paymentsTooltipEl.style.pointerEvents = 'none';
        paymentsTooltipEl.style.zIndex = '9999';
        paymentsTooltipEl.style.background = '#0f172a';
        paymentsTooltipEl.style.color = '#fff';
        paymentsTooltipEl.style.padding = '6px 8px';
        paymentsTooltipEl.style.borderRadius = '8px';
        paymentsTooltipEl.style.fontSize = '10px';
        paymentsTooltipEl.style.fontWeight = '700';
        paymentsTooltipEl.style.boxShadow = '0 6px 16px rgba(15,23,42,0.25)';
        paymentsTooltipEl.style.opacity = '0';
        paymentsTooltipEl.style.transition = 'opacity 120ms ease';
        document.body.appendChild(paymentsTooltipEl);
    }

    const show = (e) => {
        const text = e.currentTarget.getAttribute('data-tooltip') || '';
        paymentsTooltipEl.textContent = text;
        paymentsTooltipEl.style.opacity = '1';
        move(e);
    };
    const hide = () => {
        paymentsTooltipEl.style.opacity = '0';
    };
    const move = (e) => {
        const x = e.clientX + 12;
        const y = e.clientY - 28;
        paymentsTooltipEl.style.left = `${x}px`;
        paymentsTooltipEl.style.top = `${y}px`;
    };

    bars.forEach(bar => {
        bar.addEventListener('mouseenter', show);
        bar.addEventListener('mousemove', move);
        bar.addEventListener('mouseleave', hide);
    });
}
