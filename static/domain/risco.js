export function calcularRisco(score) {
  if (score >= 70) return 'ALTO'
  if (score >= 40) return 'MÉDIO'
  return 'BAIXO'
}
