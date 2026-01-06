export function renderCards(container, cards, onClick) {
  container.innerHTML = ''

  cards.forEach(c => {
    const div = document.createElement('div')
    div.className = 'card-compact-ui cursor-pointer relative'
    div.onclick = () => onClick(c)

    // Badge de auditado
    if (c.auditado) {
      const badge = document.createElement('div')
      badge.className = 'audit-badge'
      badge.innerText = '✓'
      div.appendChild(badge)
    }

    // Conteúdo do card: ID, órgão, criticidade (bolinha) e score formatado
    const safeLabel = String(c.risco_label).normalize('NFD').replace(/[00-\u036f]/g, '').replace(/\s+/g,'').toUpperCase();
    div.innerHTML += `
      <div class="flex justify-between items-start mb-2">
        <div class="flex items-center gap-2">
          <span class="font-bold text-xs">Caso ${c.id} (Registro: ${c.registro_id ?? '—'})</span>
          <span class="dot-status dot-${c.risco_label} inline-block" title="Risco: ${c.risco_label}"></span>
        </div>
        <div class="text-[10px] font-bold">Score: ${Number(c.score).toFixed(2)}</div>
      </div>
      <h4 class="font-semibold text-sm mb-1">${c.orgao} <span class="criticidade-badge ${safeLabel}" title="Risco: ${c.risco_label}">${c.risco_label}</span></h4>
      <div class="text-[10px] text-slate-400">ID: ${c.id} • Registro: ${c.registro_id ?? '—'}</div>
    `

    container.appendChild(div)
  })
}
