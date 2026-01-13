import { api } from '../services/api.js';

export async function initHome() {
  try {
    const data = await api.summary(); // Agora pegamos o objeto completo (summary + orgaos)
    
    const s = data.summary;
    const listaOrgaos = data.orgaos; // O array está aqui, pronto para uso

    // 1. Atualiza os KPIs (Mesma lógica anterior)
    const updateDisplay = (id, val, suffix = '') => {
      const el = document.getElementById(id);
      if (!el) return;
      const num = Number(val ?? 0);
      el.innerText = `${num.toLocaleString('pt-BR')}${suffix}`;
    };

    updateDisplay('kpi-total', s.total_viagens);
    updateDisplay('kpi-critico', s.total_critico);
    updateDisplay('kpi-valor', s.total_sigilo);
    updateDisplay('kpi-risco', s.taxa_risco_global, '%');

    // 2. Processa o Array de Órgãos (Exemplo: preencher uma tabela ou lista)
    renderizarListaOrgaos(listaOrgaos);

    console.log(`✅ Sucesso: ${listaOrgaos.length} órgãos processados.`);

  } catch (error) {
    console.error('Erro ao inicializar Home:', error);
  }
}

// Função para lidar com o Array
function renderizarListaOrgaos(orgaos) {
  const container = document.getElementById('lista-orgaos-container');
  if (!container) return;

  if (orgaos.length === 0) {
    container.innerHTML = '<p>Nenhum dado por órgão disponível.</p>';
    return;
  }

  // Normaliza campos com fallbacks entre convenções Python/JS e nomes históricos
  container.innerHTML = orgaos.map(o => {
    const nome = o.nome || o.nome_do_orgao_superior || o.nomeDoOrgaoSuperior || 'Órgão Desconhecido';
    const qtd = Number(o.total ?? o.qtd_viagens ?? o.qtdViagens ?? 0);
    const valor = Number(o.valor_total ?? o.valorTotal ?? 0);
    const score = Number(o.score_medio ?? o.scoreMedio ?? 0).toFixed(2);

    return `
      <div class="orgao-item">
        <span>${nome}</span>
        <strong>${qtd.toLocaleString('pt-BR')} viagens</strong>
        <div class="text-[10px] text-slate-400">Valor: R$ ${valor.toLocaleString('pt-BR')}, Score: ${score}</div>
      </div>
    `;
  }).join('');
}