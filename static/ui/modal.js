// static/ui/modal.js

export function renderModal(card) {
  if (!card) return;

  const detalheRaw = card.detalhe || null;
  const viagem = detalheRaw?.viagem || {};
  const trechos = detalheRaw?.trechos || [];
  const pagamentos = detalheRaw?.pagamentos || [];
  const passagens = detalheRaw?.passagens || [];
  const loading = !detalheRaw || detalheRaw?.error;

  // IDs do processo (no seu HTML chama "Protocolo")
  const idProcesso =
    viagem.identificador_do_processo_de_viagem ||
    card.id_viagem ||
    '—';

  const nome = loading
    ? 'Carregando...'
    : (viagem.nome || card.nome_viajante || 'Sem nome');

  const ministerio = loading
    ? 'Carregando...'
    : (viagem.nome_do_orgao_superior || card.orgao_superior || '—');

  const orgaoSolicitante = loading
    ? 'Carregando...'
    : (viagem.nome_orgao_solicitante || '—');

  const dataInicio = loading
    ? 'Carregando...'
    : formatarDataBR(viagem.periodo_data_de_inicio);

  const dataFim = loading
    ? 'Carregando...'
    : formatarDataBR(viagem.periodo_data_de_fim);

  const motivo = loading
    ? 'Carregando...'
    : (viagem.motivo || 'Sem motivo informado');

  const inicioFmt = loading ? 'Carregando...' : formatarDataBR(viagem.periodo_data_de_inicio);
  const fimFmt = loading ? 'Carregando...' : formatarDataBR(viagem.periodo_data_de_fim);

  // Valores (JSON real)
  const valorDiarias = Number(viagem.valor_diarias ?? 0);
  const valorPassagens = Number(viagem.valor_passagens ?? 0);
  const valorOutros = Number(viagem.valor_outros_gastos ?? 0);
  const valorDevolucao = Number(viagem.valor_devolucao ?? 0);

  const valorTotal = loading
    ? null
    : Math.max(0, valorDiarias + valorPassagens + valorOutros - valorDevolucao);

  // ---- Preenche DOM (IDs existentes no seu index) ----
  setText('card-title', `IDENTIFICADOR: ${card.id_viagem || idProcesso}`); // Força o ID da viagem

  setText('card-nome-viajante', nome);
  setText('card-cargo-val', viagem.cargo || 'Cargo não informado');

  if (viagem.situacao) {
    setText('card-situacao', viagem.situacao);
    // Estilização simples baseada na situação
    const elSituacao = document.getElementById('card-situacao');
    if (viagem.situacao.toUpperCase() === 'REALIZADA') {
      elSituacao.className = 'text-[9px] font-black px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider';
    } else {
      elSituacao.className = 'text-[9px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider';
    }
  } else {
    setText('card-situacao', '—');
  }

  setText('card-ministerio-val', ministerio);
  setText('card-orgao-val', orgaoSolicitante);

  setText('card-data-inicio', `${inicioFmt} → ${fimFmt}`);
  setText('card-motivo-val', motivo);

  // Trecho: mostra todos os trechos (ou destinos)
  const trechoTxt = loading
    ? 'Carregando...'
    : formatarTrechos(trechos, viagem.destinos, card.destino_resumo);
  setText('card-trecho-val', trechoTxt);

  // Dias em trânsito
  if (loading) {
    setText('card-dias-transito', '—');
  } else {
    const dias = calcularDias(viagem.periodo_data_de_inicio, viagem.periodo_data_de_fim);
    setText('card-dias-transito', dias !== null ? `${dias} dias` : '—');
  }

  // Preenche novos cards de valores
  if (loading) {
    setText('card-valor-passagem', '—');
    setText('card-valor-diarias', '—');
    setText('card-valor-outros', '—');
    setText('card-valor-devolucao', '—');
  } else {
    setText('card-valor-passagem', `R$ ${valorPassagens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    setText('card-valor-diarias', `R$ ${valorDiarias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    setText('card-valor-outros', `R$ ${valorOutros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    setText('card-valor-devolucao', `R$ ${valorDevolucao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }

  // Custo total
  if (valorTotal === null) {
    setText('card-valor', 'Carregando...');
  } else {
    setText('card-valor', `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }

  // Badge de risco (usa score do card)
  const score = loading ? null : (card.score_risco ?? null);
  renderBadge(score);

  // Checklist (coluna direita) — útil e 100% baseado na API
  renderChecklist({
    loading,
    viagem,
    trechos,
    valores: { valorTotal, valorDiarias, valorPassagens, valorOutros, valorDevolucao },
  });

  // “Análise do Mecanismo” (sem IA ainda): status coerente por regras
  renderAnalise({
    loading,
    viagem,
    valores: { valorTotal, valorDevolucao },
  });

  setupModalTabs();
  renderTimeline({ loading, trechos, viagem, card });
  renderPagamentos({ loading, pagamentos });
  renderPassagens({ loading, passagens });
}

// ----------------------
// Helpers DOM
// ----------------------
function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = value ?? '';
}

function setAnaliseStatus(texto, variant) {
  const el = document.getElementById('card-analise-status');
  if (!el) return;

  el.innerText = texto;

  // Mantém o layout, só muda cor por “variant”
  const base = 'text-[10px] font-mono font-black';
  if (variant === 'ok') el.className = `${base} text-emerald-600`;
  else if (variant === 'warn') el.className = `${base} text-amber-600`;
  else if (variant === 'bad') el.className = `${base} text-red-600`;
  else el.className = `${base} text-slate-400`;
}

export function renderBadge(score) {
  const badge = document.getElementById('card-badge-risco');
  if (!badge) return;

  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    badge.innerText = 'Risco: —';
    badge.className =
      'w-fit px-2 py-0.5 rounded text-[9px] font-black border uppercase mb-1 bg-slate-50 text-slate-400 border-slate-100';
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

// ----------------------
// Regras/formatadores
// ----------------------
function formatarTrechos(trechos, destinosFallback, destinoResumoFallback) {
  const roteiros = (trechos || [])
    .map(t => (t?.roteiro_completo || '').trim())
    .filter(Boolean);

  if (roteiros.length === 1) return roteiros[0];
  if (roteiros.length > 1) return roteiros.join(' | ');

  return destinosFallback || destinoResumoFallback || '—';
}

function normalizeUrgente(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  const num = Number(value);
  if (!Number.isNaN(num)) return num > 0;
  const text = String(value).trim().toUpperCase();
  return text === 'S' || text === 'SIM' || text === 'TRUE';
}

function calcularDias(dataInicioISO, dataFimISO) {
  const ini = parseISODateLocal(dataInicioISO);
  const fim = parseISODateLocal(dataFimISO);
  if (!ini || !fim) return null;

  const diffMs = fim.getTime() - ini.getTime();
  const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // inclusivo: 20->23 vira 4 dias
  return dias >= 0 ? (dias + 1) : null;
}

function parseISODateLocal(iso) {
  if (!iso) return null;
  const parts = String(iso).split('-');
  if (parts.length !== 3) return null;

  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;

  // cria data no fuso local, meio-dia (evita bug de DST)
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatarDataBR(iso) {
  const dt = parseISODateLocal(iso);
  if (!dt) return '—';
  return dt.toLocaleDateString('pt-BR');
}

function setupModalTabs() {
  const btnTimeline = document.getElementById('modal-tab-timeline');
  const btnFinanceiro = document.getElementById('modal-tab-financeiro');
  const panelTimeline = document.getElementById('modal-panel-timeline');
  const panelFinanceiro = document.getElementById('modal-panel-financeiro');

  if (!btnTimeline || !btnFinanceiro || !panelTimeline || !panelFinanceiro) return;
  if (btnTimeline.dataset.bound === '1') return;

  const activate = (key) => {
    const isTimeline = key === 'timeline';
    panelTimeline.classList.toggle('hidden', !isTimeline);
    panelFinanceiro.classList.toggle('hidden', isTimeline);

    btnTimeline.className = isTimeline
      ? 'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white'
      : 'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white text-slate-500 border border-slate-200';

    btnFinanceiro.className = !isTimeline
      ? 'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white'
      : 'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white text-slate-500 border border-slate-200';
  };

  btnTimeline.addEventListener('click', () => activate('timeline'));
  btnFinanceiro.addEventListener('click', () => activate('financeiro'));
  btnTimeline.dataset.bound = '1';
  btnFinanceiro.dataset.bound = '1';
  activate('timeline');
}

function renderTimeline({ loading, trechos, viagem, card }) {
  const container = document.getElementById('card-timeline');
  if (!container) return;

  if (loading) {
    container.innerHTML = '<p class="text-slate-400 italic text-sm">Carregando...</p>';
    return;
  }

  if (!trechos || trechos.length === 0) {
    const fallback = viagem?.destinos || card?.destino_resumo || '—';
    container.innerHTML = `<p class="text-slate-500 text-sm">Sem trechos. Destino: <strong>${fallback}</strong></p>`;
    return;
  }

  const sorted = [...trechos].sort((a, b) => {
    const sa = Number(a.sequencia_trecho ?? 0);
    const sb = Number(b.sequencia_trecho ?? 0);
    if (sa !== sb) return sa - sb;
    const da = String(a.origem_data || '');
    const db = String(b.origem_data || '');
    return da.localeCompare(db);
  });

  container.innerHTML = sorted.map((t, idx) => {
    const origem = formatLocal(t.origem_cidade, t.origem_uf, t.origem_pais);
    const destino = formatLocal(t.destino_cidade, t.destino_uf, t.destino_pais);
    const dataOrigem = formatarDataBR(t.origem_data);
    const dataDestino = formatarDataBR(t.destino_data);
    const meio = (t.meio_de_transporte || '—').toString();
    const missao = t.missao ? 'Missão' : 'Sem missão';
    const diarias = t.numero_diarias ? `${t.numero_diarias} diárias` : '—';

    return `
      <div class="flex items-start gap-4">
        <div class="flex flex-col items-center">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          ${idx < sorted.length - 1 ? '<span class="w-px h-10 bg-emerald-200 mt-1"></span>' : ''}
        </div>
        <div class="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
          <div class="flex justify-between items-start gap-4">
            <div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${dataOrigem} → ${dataDestino}</p>
              <p class="text-sm font-bold text-slate-700">${origem} <span class="text-slate-300">→</span> ${destino}</p>
            </div>
            <div class="text-right">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${meio}</p>
              <p class="text-xs text-slate-500">${diarias}</p>
              <p class="text-[10px] font-bold text-emerald-600">${missao}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderPagamentos({ loading, pagamentos }) {
  const container = document.getElementById('card-pagamentos');
  if (!container) return;
  if (loading) {
    container.innerHTML = '<p class="text-slate-400 italic text-sm">Carregando...</p>';
    return;
  }
  if (!pagamentos || pagamentos.length === 0) {
    container.innerHTML = '<p class="text-slate-400 italic text-sm">Sem dados de pagamentos.</p>';
    return;
  }

  container.innerHTML = pagamentos.map(p => {
    const valor = Number(p.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const tipo = p.tipo_de_pagamento || '—';
    const orgao = p.nome_do_orgao_pagador || p.nome_do_orgao_superior || '—';
    const ug = p.nome_da_unidade_gestora_pagadora || '—';
    return `
      <div class="flex justify-between items-center bg-white border border-slate-100 rounded-xl px-4 py-2">
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${tipo}</p>
          <p class="text-xs font-medium text-slate-700">${orgao}</p>
          <p class="text-[10px] text-slate-400">${ug}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold text-slate-800">R$ ${valor}</p>
        </div>
      </div>
    `;
  }).join('');
}

function renderPassagens({ loading, passagens }) {
  const container = document.getElementById('card-passagens');
  if (!container) return;
  if (loading) {
    container.innerHTML = '<p class="text-slate-400 italic text-sm">Carregando...</p>';
    return;
  }
  if (!passagens || passagens.length === 0) {
    container.innerHTML = '<p class="text-slate-400 italic text-sm">Sem dados de passagens.</p>';
    return;
  }

  container.innerHTML = passagens.map(p => {
    const origem = formatLocal(p.cidade_origem_ida, p.uf_origem_ida, p.pais_origem_ida);
    const destino = formatLocal(p.cidade_destino_ida, p.uf_destino_ida, p.pais_destino_ida);
    const valor = Number(p.valor_da_passagem ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const taxa = Number(p.taxa_de_servico ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const meio = p.meio_de_transporte || '—';
    const dataCompra = formatarDataBR(p.data_da_emissao_compra);
    const horaCompra = p.hora_da_emissao_compra || '';
    return `
      <div class="flex justify-between items-center bg-white border border-slate-100 rounded-xl px-4 py-2">
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${meio}</p>
          <p class="text-xs font-medium text-slate-700">${origem} <span class="text-slate-300">→</span> ${destino}</p>
          <p class="text-[10px] text-slate-400">Compra: ${dataCompra} ${horaCompra}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold text-slate-800">R$ ${valor}</p>
          <p class="text-[10px] text-slate-400">Taxa R$ ${taxa}</p>
        </div>
      </div>
    `;
  }).join('');
}

function formatLocal(cidade, uf, pais) {
  const parts = [cidade, uf, pais].filter(v => v && String(v).trim());
  return parts.length ? parts.join('/') : '—';
}


// ----------------------
// Checklist (coluna direita)
// ----------------------
function renderChecklist({ loading, viagem, trechos, valores }) {
  const container = document.getElementById('checklist-auditoria');
  if (!container) return;

  container.innerHTML = '';

  if (loading) {
    container.appendChild(itemChecklist('Carregando verificações...', 'neutral', ''));
    return;
  }

  const urgente = (viagem.viagem_urgente || '').toUpperCase() === 'SIM';
  const justificativa = (viagem.justificativa_urgencia_viagem || '').trim();

  const { valorTotal, valorPassagens, valorDiarias, valorOutros, valorDevolucao } = valores;

  const checks = [];

  checks.push({
    label: 'Identificador do processo',
    ok: Boolean(viagem.identificador_do_processo_de_viagem),
    hint: viagem.identificador_do_processo_de_viagem ? 'OK' : 'Ausente',
  });

  checks.push({
    label: 'Período informado (início e fim)',
    ok: Boolean(viagem.periodo_data_de_inicio && viagem.periodo_data_de_fim),
    hint: viagem.periodo_data_de_inicio && viagem.periodo_data_de_fim ? 'OK' : 'Datas incompletas',
  });

  checks.push({
    label: 'Trechos disponíveis',
    ok: (trechos || []).length > 0,
    hint: (trechos || []).length > 0 ? `${trechos.length} trecho(s)` : 'Sem trechos',
  });

  checks.push({
    label: 'Urgência justificada (se marcado urgente)',
    ok: !urgente || justificativa.length >= 40,
    hint: !urgente ? 'Não urgente' : (justificativa.length >= 40 ? 'Justificada' : 'Justificativa curta'),
  });

  checks.push({
    label: 'Devolução registrada',
    ok: Number(valorDevolucao ?? 0) <= 0,
    hint: Number(valorDevolucao ?? 0) > 0 ? `R$ ${Number(valorDevolucao).toLocaleString('pt-BR')}` : 'Sem devolução',
  });

  checks.push({
    label: 'Composição de custos',
    ok: (Number(valorPassagens) + Number(valorDiarias) + Number(valorOutros)) > 0,
    hint: `P:${fmt(valorPassagens)} D:${fmt(valorDiarias)} O:${fmt(valorOutros)}`,
  });

  const alto = (Number(valorTotal ?? 0) >= 10000);
  checks.push({
    label: 'Montante elevado',
    ok: !alto,
    hint: alto ? `Alto (${fmt(valorTotal)})` : `OK (${fmt(valorTotal)})`,
  });

  // ---------- Resumo ----------
  const total = checks.length;
  const okCount = checks.filter(c => c.ok).length;
  const warnCount = total - okCount;
  const pctOk = total ? Math.round((okCount / total) * 100) : 0;

  container.appendChild(renderResumoChecklist({ okCount, warnCount, total, pctOk }));

  // ---------- Lista ----------
  const list = document.createElement('div');
  list.className = 'space-y-2';

  for (const c of checks) {
    list.appendChild(itemChecklist(c.label, c.ok ? 'ok' : 'warn', c.hint));
  }

  container.appendChild(list);
}

function renderResumoChecklist({ okCount, warnCount, total, pctOk }) {
  const wrap = document.createElement('div');
  wrap.className = 'mb-4 p-3 rounded-2xl bg-slate-50/60 border border-slate-100';

  wrap.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-[8px] font-black uppercase tracking-widest text-slate-400">Resumo</span>
        <span class="text-[10px] font-mono font-black text-slate-500">${pctOk}% OK</span>
      </div>
      <div class="flex items-center gap-2 text-[10px] font-mono">
        <span class="font-black text-emerald-600">${okCount}</span>
        <span class="text-slate-300">/</span>
        <span class="font-black text-slate-600">${total}</span>
        <span class="text-slate-300">|</span>
        <span class="font-black text-amber-700">${warnCount} atenção</span>
      </div>
    </div>

    <div class="mt-2 h-1.5 w-full bg-white rounded-full overflow-hidden border border-slate-100">
      <div class="h-full bg-emerald-500" style="width:${pctOk}%;"></div>
    </div>

    <p class="mt-2 text-[9px] text-slate-400 italic">
      Itens em “atenção” não significam fraude — apenas pontos para verificação.
    </p>
  `;

  return wrap;
}

function itemChecklist(titulo, variant = 'neutral', hint = '') {
  const row = document.createElement('div');
  row.className =
    'group flex items-start justify-between gap-3 px-3 py-2.5 rounded-2xl border text-[11px] transition-all';

  const left = document.createElement('div');
  left.className = 'flex items-start gap-2 min-w-0';

  const icon = document.createElement('span');
  icon.className = 'mt-0.5 w-5 h-5 rounded-xl flex items-center justify-center text-[10px] flex-shrink-0';

  const textBox = document.createElement('div');
  textBox.className = 'min-w-0';

  const titleEl = document.createElement('div');
  titleEl.className = 'text-slate-700 font-semibold leading-snug truncate';
  titleEl.textContent = titulo;

  const hintEl = document.createElement('div');
  hintEl.className = 'text-[9px] text-slate-400 font-mono truncate';
  hintEl.textContent = hint || '—';

  const right = document.createElement('span');
  right.className = 'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-xl flex-shrink-0';

  if (variant === 'ok') {
    row.classList.add('bg-emerald-50/30', 'border-emerald-100', 'hover:border-emerald-200');
    icon.classList.add('bg-emerald-100', 'text-emerald-700');
    icon.textContent = '✓';
    right.classList.add('bg-emerald-100', 'text-emerald-700');
    right.textContent = 'OK';
  } else if (variant === 'warn') {
    row.classList.add('bg-amber-50/30', 'border-amber-100', 'hover:border-amber-200');
    icon.classList.add('bg-amber-100', 'text-amber-800');
    icon.textContent = '!';
    right.classList.add('bg-amber-100', 'text-amber-800');
    right.textContent = 'ATENÇÃO';
  } else if (variant === 'bad') {
    row.classList.add('bg-red-50/30', 'border-red-100', 'hover:border-red-200');
    icon.classList.add('bg-red-100', 'text-red-700');
    icon.textContent = '×';
    right.classList.add('bg-red-100', 'text-red-700');
    right.textContent = 'RISCO';
  } else {
    row.classList.add('bg-slate-50/30', 'border-slate-100', 'hover:border-slate-200');
    icon.classList.add('bg-slate-100', 'text-slate-500');
    icon.textContent = '•';
    right.classList.add('bg-slate-100', 'text-slate-500');
    right.textContent = '—';
  }

  textBox.appendChild(titleEl);
  textBox.appendChild(hintEl);

  left.appendChild(icon);
  left.appendChild(textBox);

  row.appendChild(left);
  row.appendChild(right);

  return row;
}

function fmt(v) {
  const n = Number(v ?? 0);
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// ----------------------
// Análise (sem IA, só regra)
// ----------------------
function renderAnalise({ loading, viagem, valores }) {
  if (loading) {
    setAnaliseStatus('—', 'neutral');
    setText('card-analise-in03', '—');
    setText('card-analise-historico', '—');
    return;
  }

  const urgente = (viagem.viagem_urgente || '').toUpperCase() === 'SIM';
  const justificativa = (viagem.justificativa_urgencia_viagem || '').trim();
  const justCurta = urgente && justificativa.length < 40;

  const devolucao = Number(valores.valorDevolucao ?? 0);
  const alto = Number(valores.valorTotal ?? 0) >= 10000;

  // Status simples:
  if (justCurta || devolucao > 0) {
    setAnaliseStatus('ALERTA', 'warn');
  } else if (alto) {
    setAnaliseStatus('ATENÇÃO', 'warn');
  } else {
    setAnaliseStatus('CONFORME', 'ok');
  }

  // Mensagens objetivas (sem inventar histórico)
  setText('card-analise-in03', urgente ? (justCurta ? 'Urgência com justificativa curta' : 'Urgência justificada') : 'Sem urgência');
  setText('card-analise-historico', 'Não avaliado (pendente de base histórica)');
}
