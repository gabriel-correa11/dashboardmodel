import type { Serie } from './contrato'

const nomesMeses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function mesAno(anoMes: string): string {
  const [ano, mes] = anoMes.split('-').map(Number)
  return `${nomesMeses[mes - 1]}/${ano}`
}

export function numero(valor: number, casasDecimais = 1): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casasDecimais, maximumFractionDigits: casasDecimais })
}

export function comSinal(valor: number, casasDecimais = 1): string {
  const valorFormatado = numero(Math.abs(valor), casasDecimais)
  return valor > 0 ? `+${valorFormatado}` : valor < 0 ? `−${valorFormatado}` : valorFormatado
}

/** Variação pico-vale já com a unidade certa para o método da série. */
export function variacao(valor: number | null | undefined, serie: Serie | undefined): string {
  if (valor == null || !serie) return '—'
  return serie.metodo.tipo === 'indice' ? `${comSinal(valor)}%` : `${comSinal(valor)} p.p.`
}

/** Valor no eixo do painel: índice (100 = pico) ou p.p. desde o pico. */
export function valorPainel(valor: number, serie: Serie | undefined): string {
  if (!serie) return numero(valor)
  return serie.metodo.tipo === 'indice' ? numero(valor) : `${comSinal(valor, 2)} p.p.`
}

export function meses(quantidade: number | null | undefined): string {
  if (quantidade == null) return '—'
  return quantidade === 1 ? '1 mês' : `${quantidade} meses`
}

export function mesRelativo(mes: number): string {
  if (mes === 0) return 'pico'
  return mes > 0 ? `+${mes}` : `−${Math.abs(mes)}`
}

export function dataHora(dataIso: string): string {
  const data = new Date(dataIso)
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
