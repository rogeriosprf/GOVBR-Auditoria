import { api } from '../services/api.js';

/**
 * Carrega dados da API e renderiza no grid
 * @param {HTMLElement} container 
 * @param {Function} onCardClick 
 */
export async function carregarCards(container, onCardClick) {
  if (!container) return;

  // Loading inicial
  container.innerHTML = `
    <div class="col-span-1 text-center text-slate-400 italic py-10">
      Carregando cards...
    </div>
  `;

  try {
    // Chama a API via camada service
    const cardsData = await api.listarAuditorias();

    if (!Array.isArray(cardsData) || cardsData.length === 0) {
      container.innerHTML = `
        <div class="col-span-1 text-center text-slate-400 italic py-10">
          Nenhum card encontrado.
        </div>
      `;
      return;
    }

    // Limpa container
    container.innerHTML = '';

    // Renderiza cada card
    cardsData.forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all';
      cardEl.innerHTML = `
        <p class="text-[9px] font-black text-slate-400 uppercase mb-1">${card.criticidade || 'Auditoria'}</p>
        <h3 class="text-sm font-bold text-slate-700 mb-2">${card.nome_viajante || 'Sem nome'}</h3>
        <p class="text-[10px] text-slate-500">Órgão: <span class="font-medium">${card.orgao_superior || '-'}</span></p>
        <p class="text-[10px] text-slate-500">Destino: <span class="font-medium">${card.destino_resumo || '-'}</span></p>
        <p class="text-[10px] text-slate-500">Valor: <span class="font-medium">R$ ${card.valor_total?.toFixed(2) || '0,00'}</span></p>
      `;

      cardEl.addEventListener('click', () => {
        if (typeof onCardClick === 'function') onCardClick(card);
      });

      container.appendChild(cardEl);
    });

  } catch (err) {
    console.error('Erro ao carregar cards:', err);
    container.innerHTML = `
      <div class="col-span-1 text-center text-red-500 italic py-10">
        Erro ao carregar cards. Tente novamente.
      </div>
    `;
  }
}
