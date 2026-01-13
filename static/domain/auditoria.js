// Versão aprimorada de filtrarCards
export function filtrarCards(cards, filtros = {}) {
  const busca = (filtros.texto || "").trim().toLowerCase();

  return cards.filter(c => {
    // Normaliza campos para busca segura
    const camposTexto = [
      (c.orgao || ""),
      (c.viajante || ""),
      (c.resumo || ""),
      (c.motivo || "")
    ].map(s => s.toLowerCase());

    const textoOk = !busca || camposTexto.some(campo => campo.includes(busca));

    const riscoOk = filtros.risco === 'all' || c.risco_label === filtros.risco;
    const orgaoOk = filtros.orgao === 'all' || c.orgao === filtros.orgao;
    const statusOk = filtros.status === 'all' || c.status === filtros.status;

    return textoOk && riscoOk && orgaoOk && statusOk;
  });
}