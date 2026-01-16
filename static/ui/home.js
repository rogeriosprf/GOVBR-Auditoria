let chartInstance = null;

export function renderHomeKPIs(summary) {
  if (!summary) return;

  const update = (id, val, suffix = '', isCurrency = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    const num = Number(val ?? 0);
    el.innerText = isCurrency
      ? num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : `${num.toLocaleString('pt-BR')}${suffix}`;
  };

  update('kpi-total', summary.total_viagens);
  update('kpi-critico', summary.total_critico);
  update('kpi-valor', summary.total_sigilo, '', true);
  update('kpi-risco', summary.taxa_risco_global, '%');
}

export function renderListaOrgaos(orgaos) {
  const container = document.getElementById('lista-orgaos-container');
  if (!container) return;

  // Se estiver vazio
  if (!orgaos || orgaos.length === 0) {
    container.innerHTML = '<div class="text-slate-400 text-xs italic p-4">Sem dados para exibir</div>';
    try { container.removeAttribute('style'); container.className = 'grid grid-cols-1 gap-4'; } catch (e) { }
    return;
  }

  // Limpa estilos antigos do Chart.js
  container.removeAttribute('style');
  container.className = "flex flex-col gap-4 w-full pr-2";

  // Normalização para o gráfico
  const maxTotal = Math.max(...orgaos.map(o => Number(o.total || 0))) || 1;

  container.innerHTML = orgaos.map(o => {
    const nome = o.nome || o.nome_do_orgao_superior || 'Órgão Desconhecido';
    const qtd = Number(o.total ?? 0);
    const score = Number(o.score_medio ?? 0);

    // Cores
    let barColor = 'bg-emerald-500';
    let barBg = 'bg-emerald-100/30';
    let percentageText = 'text-emerald-600';

    if (score >= 0.8) {
      barColor = 'bg-red-500';
      barBg = 'bg-red-100/30';
      percentageText = 'text-red-500';
    } else if (score >= 0.5) {
      barColor = 'bg-amber-500';
      barBg = 'bg-amber-100/30';
      percentageText = 'text-amber-600';
    } else {
      barColor = 'bg-blue-500';
      barBg = 'bg-blue-100/30';
      percentageText = 'text-blue-600';
    }

    const pct = Math.max((qtd / maxTotal) * 100, 1);

    return `
        <div class="flex flex-col group cursor-default">
            <div class="flex justify-between items-end mb-1.5">
                <span class="text-[10px] font-bold text-slate-700 truncate pr-4 leading-none tracking-tight" title="${nome}">
                    ${nome}
                </span>
                <div class="flex items-center gap-2">
                     <span class="text-[9px] font-bold ${percentageText}">${(score * 100).toFixed(0)}% Risco</span>
                     <span class="text-[9px] font-mono font-black text-slate-300 leading-none bg-slate-50 px-1 py-0.5 rounded">
                        ${qtd}
                    </span>
                </div>
            </div>
            
            <div class="w-full h-2.5 ${barBg} rounded-full overflow-hidden relative">
                <div class="${barColor} h-full rounded-full relative transition-[width] duration-1000 ease-out" 
                     style="width: ${pct}%">
                </div>
            </div>
        </div>`;
  }).join('');
}
