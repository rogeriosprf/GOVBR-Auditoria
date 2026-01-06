export function filtrarCards(cards, filtros) {
  return cards.filter(c => {
    const textoOk = c.orgao.toLowerCase().includes(filtros.texto) ||
                    c.resumo.toLowerCase().includes(filtros.texto)
    const riscoOk = filtros.risco === 'all' || c.risco_label === filtros.risco
    const statusOk = filtros.status === 'all' ||
                     (filtros.status === 'pendente' && !c.auditado) ||
                     (filtros.status === 'auditado' && c.auditado)
    return textoOk && riscoOk && statusOk
  })
}
