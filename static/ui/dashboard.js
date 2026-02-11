// static/ui/dashboard.js
import { api } from '../services/api.js';

let chartTemporalInstance = null;

export async function initDashboard() {
    await loadKPIs();
    await loadAnaliseTemporal();
    await loadRankingDestinos();
    await loadRankingOrgaos();
    await loadTopAlvos();
}

async function loadKPIs() {
    try {
        const data = await api.dashboardKPIs();

        if (data && data.length > 0) {
            const kpi = data[0];
            document.getElementById('dash-kpi-total-alvos').textContent = kpi.total_alvos || '-';
            document.getElementById('dash-kpi-valor-risco').textContent =
                parseFloat(kpi.valor_total_risco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('dash-kpi-risco-medio').textContent =
                `${(parseFloat(kpi.risco_medio_global || 0) * 100).toFixed(1)}%`;
            document.getElementById('dash-kpi-criticos').textContent = kpi.casos_criticos_extremos || '0';
        }
    } catch (e) {
        console.error('Erro ao carregar KPIs:', e);
    }
}

async function loadAnaliseTemporal() {
    try {
        const data = await api.dashboardAnaliseTemporal();

        if (!data || data.length === 0) return;

        const labels = data.map(d => {
            const date = new Date(d.mes);
            return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        });

        const valores = data.map(d => parseFloat(d.valor_total || 0));
        const qtds = data.map(d => parseInt(d.qtd_viagens || 0));

        const ctx = document.getElementById('chart-temporal').getContext('2d');

        if (chartTemporalInstance) {
            chartTemporalInstance.destroy();
        }

        chartTemporalInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Valor Total (R$)',
                        data: valores,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        yAxisID: 'y',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Qtd Viagens',
                        data: qtds,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 10 },
                            color: '#64748b'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 11 },
                        bodyFont: { size: 10 },
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            callback: (value) => `R$ ${(value / 1000).toFixed(0)}k`,
                            color: '#64748b',
                            font: { size: 9 }
                        },
                        grid: { color: '#f1f5f9' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: {
                            color: '#64748b',
                            font: { size: 9 }
                        },
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        ticks: {
                            color: '#64748b',
                            font: { size: 9 }
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch (e) {
        console.error('Erro ao carregar análise temporal:', e);
    }
}

async function loadRankingDestinos() {
    try {
        const data = await api.dashboardRankingDestinos();

        const container = document.getElementById('lista-destinos');
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-slate-400 italic">Sem dados</p>';
            return;
        }

        const maxContagem = Math.max(...data.map(d => Number(d.contagem ?? 0)), 1);
        container.innerHTML = data.slice(0, 10).map((d, i) => {
            const riscoRaw = parseFloat(d.risco_medio || 0);
            const risco = riscoRaw > 1 ? riscoRaw / 100 : riscoRaw;
            const color = risco >= 0.8 ? 'text-red-500' : (risco >= 0.5 ? 'text-amber-500' : 'text-blue-500');
            const pct = Math.max(6, Math.round((Number(d.contagem ?? 0) / maxContagem) * 100));

            return `
                <div class="flex flex-col py-2 border-b border-slate-50 last:border-0">
                    <div class="flex justify-between items-center mb-1.5">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="text-[9px] font-mono font-black text-slate-300">${i + 1}</span>
                            <span class="text-[10px] font-medium text-slate-700 whitespace-normal break-words" title="${d.destinos}">${d.destinos}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[9px] font-bold ${color}">${(risco * 100).toFixed(0)}%</span>
                            <span class="text-[9px] font-mono text-slate-400">${d.contagem}</span>
                        </div>
                    </div>
                    <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500/70" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar ranking destinos:', e);
    }
}

async function loadRankingOrgaos() {
    try {
        const data = await api.dashboardRankingOrgaos();

        const container = document.getElementById('lista-orgaos-dash');
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-slate-400 italic">Sem dados</p>';
            return;
        }

        const maxQtd = Math.max(...data.map(d => Number(d.qtd_viagens ?? 0)), 1);
        container.innerHTML = data.slice(0, 10).map((d, i) => {
            const score = parseFloat(d.score_medio || 0);
            const color = score >= 0.8 ? 'text-red-500' : (score >= 0.5 ? 'text-amber-500' : 'text-blue-500');
            const pct = Math.max(6, Math.round((Number(d.qtd_viagens ?? 0) / maxQtd) * 100));

            return `
                <div class="flex flex-col py-2 border-b border-slate-50 last:border-0">
                    <div class="flex justify-between items-center mb-1.5">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="text-[9px] font-mono font-black text-slate-300">${i + 1}</span>
                            <span class="text-[10px] font-medium text-slate-700 whitespace-normal break-words" title="${d.nome_do_orgao_superior}">${d.nome_do_orgao_superior}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[9px] font-bold ${color}">${(score * 100).toFixed(0)}%</span>
                            <span class="text-[9px] font-mono text-slate-400">${d.qtd_viagens}</span>
                        </div>
                    </div>
                    <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-500/70" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar ranking órgãos:', e);
    }
}

async function loadTopAlvos() {
    try {
        const container = document.getElementById('lista-alvos');
        if (!container) return;

        const data = await api.dashboardTopAlvos();

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-slate-400 italic">Sem dados</p>';
            return;
        }

        container.innerHTML = data.slice(0, 10).map((d, i) => {
            const score = parseFloat(d.score_final || 0);
            const color = score >= 0.8 ? 'text-red-500' : 'text-amber-500';
            const total = parseFloat(d.valor_viagem || 0);
            const destinos = d.roteiro_completo || d.destinos || '-';

            return `
                <div class="flex flex-col py-2 border-b border-slate-50 last:border-0">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[10px] font-bold text-slate-700 truncate pr-2 max-w-[180px]" title="${d.nome}">${d.nome}</span>
                        <span class="text-[9px] font-bold ${color}">${(score * 100).toFixed(0)}%</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] text-slate-400 truncate max-w-[150px]" title="${destinos}">${destinos}</span>
                        <span class="text-[9px] font-mono font-bold text-slate-500">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar top alvos:', e);
    }
}
