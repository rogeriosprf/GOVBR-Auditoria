export function renderCards(grid, data = {}, onClickCard) {
  if (!grid) return;

  // IMPORTANTE: Agora 'data' é o objeto {total_encontrados, viagens, ...}
  const cards = data.viagens || [];
  const total = data.total_encontrados || 0;
  const termo = data.termo_busca || "";

  // 1. Atualiza a frase dinâmica (procurando o elemento no DOM)
  const statusEl = document.getElementById('txt-status-pesquisa');
  if (statusEl) {
    const nivel = cards.length > 0 ? cards[0].criticidade.toLowerCase() : 'auditáveis';
    const termoTxt = termo ? ` para "<strong>${termo}</strong>"` : "";
    statusEl.innerHTML = `Exibindo <strong>${total}</strong> viagens ${nivel}${termoTxt}`;
  }

  grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-4";

  if (cards.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 text-sm italic font-medium">Nenhuma auditoria encontrada</div>`;
    return;
  }

  // O SQL já traz ordenado por score, mas mantemos o sort por segurança
  const sortedCards = [...cards].sort((a, b) => (b.score_risco || 0) - (a.score_risco || 0));

  grid.innerHTML = sortedCards.map(card => {
    const scoreNum = card.score_risco || 0;
    
    // Mapeamento de Cores e Labels baseado no campo 'criticidade' do SQL
    let accentColor = '#10b981'; // Normal (Emerald)
    let lightBg = 'bg-emerald-50/30';
    
    if (card.criticidade === 'CRÍTICO') {
      accentColor = '#ef4444'; // Red
      lightBg = 'bg-red-50/30';
    } else if (card.criticidade === 'ALERTA') {
      accentColor = '#f59e0b'; // Amber
      lightBg = 'bg-amber-50/30';
    }

    const iconeUrgencia = card.urgente === 'SIM' ? '<span class="text-amber-500 animate-pulse" title="Urgente">⚡</span>' : '';

    return `
      <div class="group flex flex-col h-full cursor-pointer bg-white border border-slate-100 rounded-2xl hover:border-slate-300 transition-all duration-300 shadow-sm overflow-hidden"
           data-card-id="${card.id_viagem}"
           style="--card-accent: ${accentColor};">
        
        <div class="px-5 py-3 border-b border-slate-50 flex justify-between items-center ${lightBg}">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${accentColor}"></span>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${card.criticidade}</span>
          </div>
          <div class="flex items-center gap-2">
             ${iconeUrgencia}
             <span class="text-[10px] font-mono font-bold text-slate-300">#${card.id_viagem}</span>
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col">
          <h3 class="text-sm font-light text-slate-800 leading-snug mb-3 group-hover:text-slate-900 transition-colors line-clamp-2 h-10">
            ${card.nome_viajante}
          </h3>

          <div class="mb-4">
            <p class="text-[8px] font-black text-slate-300 uppercase tracking-tighter mb-1">Órgão Superior / Destino</p>
            <p class="text-[10px] text-slate-500 font-medium truncate">
              ${card.orgao_superior}
            </p>
            <p class="text-[10px] text-slate-400 italic">
              📍 ${card.destino_resumo}
            </p>
          </div>

          <div class="mt-auto pt-4 border-t border-slate-50 flex justify-between items-end">
            <div>
              <p class="text-[8px] font-black text-slate-300 uppercase mb-1">Montante</p>
              <p class="text-lg font-light text-slate-800 tracking-tighter">
                <span class="text-[10px] font-bold text-slate-300">R$</span> ${card.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div class="text-right">
               <div class="text-[9px] font-bold" style="color: ${accentColor}">${scoreNum.toFixed(3)} RISCO</div>
            </div>
          </div>
        </div>

        <div class="h-1 w-full bg-slate-50">
          <div class="h-full transition-all duration-500 group-hover:w-full" style="background-color: ${accentColor}; width: ${(scoreNum * 100)}%"></div>
        </div>
      </div>
    `;
  }).join('');

  // Lógica de clique
  grid.querySelectorAll('[data-card-id]').forEach(el => {
    el.onclick = () => {
      const id = el.getAttribute('data-card-id');
      const cardData = sortedCards.find(c => String(c.id_viagem) === String(id));
      if (onClickCard && cardData) onClickCard(cardData);
    };
  });
}

window.renderCards = renderCards;