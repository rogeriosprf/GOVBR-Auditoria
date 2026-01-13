export function renderCards(grid, cards = [], onClickCard) {
  if (!grid) return;

  grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-4";

  if (cards.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 text-sm italic font-medium">Nenhuma auditoria encontrada</div>`;
    return;
  }

  const sortedCards = [...cards].sort((a, b) => (parseFloat(b.score_risco || b.score) || 0) - (parseFloat(a.score_risco || a.score) || 0));

  grid.innerHTML = sortedCards.map(card => {
    const scoreNum = parseFloat(card.score_risco || card.score) || 0;
    const scoreDisplay = scoreNum.toFixed(2);

    let accentColor, riskLabel, lightBg;
    
    // Cores discretas para alinhar com a Home
    if (scoreNum >= 0.80) { 
      accentColor = '#ef4444'; // Red-500
      lightBg = 'bg-red-50/30';
      riskLabel = 'CRÍTICO'; 
    }
    else if (scoreNum >= 0.60) { 
      accentColor = '#f59e0b'; // Amber-500
      lightBg = 'bg-amber-50/30';
      riskLabel = 'MÉDIO'; 
    }
    else { 
      accentColor = '#10b981'; // Emerald-500
      lightBg = 'bg-emerald-50/30';
      riskLabel = 'NORMAL'; 
    }

    const valorTotal = typeof card.valor_total === 'number' ? card.valor_total : parseFloat(card.valor_total || 0);
    const dataDisplay = card.data_inicio ? new Date(card.data_inicio).toLocaleDateString('pt-BR') : "--/--/--";

    return `
      <div class="group flex flex-col h-full cursor-pointer bg-white border border-slate-100 rounded-2xl hover:border-slate-300 transition-all duration-300 shadow-sm overflow-hidden"
           data-card-id="${card.id_viagem}"
           style="--card-accent: ${accentColor};">
        
        <div class="px-5 py-3 border-b border-slate-50 flex justify-between items-center ${lightBg}">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${accentColor}"></span>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${riskLabel}</span>
          </div>
          <span class="text-[10px] font-mono font-bold text-slate-300">#${card.id_viagem}</span>
        </div>

        <div class="p-5 flex-1 flex flex-col">
          <h3 class="text-sm font-light text-slate-800 leading-snug mb-3 group-hover:text-slate-900 transition-colors line-clamp-2 h-10">
            ${card.nome || 'NÃO INFORMADO'}
          </h3>

          <div class="mb-4">
            <p class="text-[8px] font-black text-slate-300 uppercase tracking-tighter mb-1">Órgão Solicitante</p>
            <p class="text-[10px] text-slate-500 font-medium truncate" title="${card.orgao}">
              ${card.orgao || 'ÓRGÃO NÃO IDENTIFICADO'}
            </p>
          </div>

          <div class="mt-auto pt-4 border-t border-slate-50 flex justify-between items-end">
            <div>
              <p class="text-[8px] font-black text-slate-300 uppercase mb-1">Montante</p>
              <p class="text-lg font-light text-slate-800 tracking-tighter">
                <span class="text-[10px] font-bold text-slate-300">R$</span> ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div class="text-right">
              <span class="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">${dataDisplay}</span>
            </div>
          </div>
        </div>

        <div class="h-1 w-full bg-slate-50">
          <div class="h-full transition-all duration-500 group-hover:w-full w-0" style="background-color: ${accentColor}"></div>
        </div>
      </div>
    `;
  }).join('');

  // Lógica de clique mantida...
  grid.querySelectorAll('[data-card-id]').forEach(el => {
    el.onclick = () => {
      const id = el.getAttribute('data-card-id');
      const cardData = sortedCards.find(c => String(c.id_viagem) === String(id));
      if (onClickCard && cardData) onClickCard(cardData);
    };
  });
}

window.renderCards = renderCards;