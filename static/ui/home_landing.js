// static/ui/home_landing.js

export async function initHomeLanding() {
    await loadKPIs();
    await loadFilaTrabalho();
    updateSyncTime();
}

async function loadKPIs() {
    try {
        const res = await fetch('/api/dashboard/kpis');
        const data = await res.json();

        if (data && data.length > 0) {
            const kpi = data[0];

            document.getElementById('home-kpi-fila').textContent = kpi.total_alvos || '0';
            document.getElementById('home-kpi-criticos').textContent = kpi.casos_criticos_extremos || '0';
            document.getElementById('home-kpi-valor').textContent =
                parseFloat(kpi.valor_total_risco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 });
            document.getElementById('home-kpi-taxa').textContent =
                `${(parseFloat(kpi.risco_medio_global || 0) * 100).toFixed(1)}%`;
        }
    } catch (e) {
        console.error('Erro ao carregar KPIs:', e);
    }
}

async function loadFilaTrabalho() {
    try {
        const res = await fetch('/api/dashboard/top-alvos');
        const data = await res.json();

        const container = document.getElementById('home-fila-trabalho');
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-400 italic">Nenhum caso pendente</p>';
            return;
        }

        container.innerHTML = data.slice(0, 5).map((caso, i) => {
            const score = parseFloat(caso.score_final || 0);
            const prioridade = score >= 0.9 ? 'URGENTE' : (score >= 0.8 ? 'ALTA' : 'MÉDIA');
            const prioridadeColor = score >= 0.9 ? 'bg-red-100 text-red-700 border-red-300' :
                (score >= 0.8 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-blue-100 text-blue-700 border-blue-300');

            return `
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="flex flex-col items-center justify-center w-8 h-8 bg-white rounded-lg border border-slate-200">
                            <span class="text-xs font-black text-slate-400">${i + 1}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-bold text-slate-800 truncate">${caso.nome}</p>
                            <p class="text-xs text-slate-500 truncate">${caso.destinos}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded border ${prioridadeColor}">
                            ${prioridade}
                        </span>
                        <span class="text-xs font-mono font-bold text-slate-600">
                            ${(score * 100).toFixed(0)}%
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar fila de trabalho:', e);
    }
}

function updateSyncTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('home-last-sync').textContent = timeStr;
}

window.initHomeLanding = initHomeLanding;
