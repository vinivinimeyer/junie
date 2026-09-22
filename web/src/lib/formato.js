const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
const numero1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export const brl = (v) => moeda.format(Number(v) || 0)
export const num = (v) => numero.format(Number(v) || 0)
export const num1 = (v) => numero1.format(Number(v) || 0)

/** Menos casas decimais quanto maior o número: 645 g, 12,5 L, 1,25 kg. */
function compacto(v) {
  const a = Math.abs(v)
  return v.toLocaleString('pt-BR', { maximumFractionDigits: a >= 100 ? 0 : a >= 10 ? 1 : 2 })
}

/** 2500 g -> "2,5 kg"; 800 ml -> "800 ml". Só para exibição. */
export function qtd(valor, unidade) {
  const v = Number(valor) || 0
  if (unidade === 'g' && Math.abs(v) >= 1000) return `${compacto(v / 1000)} kg`
  if (unidade === 'ml' && Math.abs(v) >= 1000) return `${compacto(v / 1000)} L`
  if (unidade === 'l') return `${compacto(v)} L`
  return `${compacto(v)} ${unidade}`
}

export const UNIDADES = [
  { valor: 'un', rotulo: 'unidade' },
  { valor: 'g', rotulo: 'grama (g)' },
  { valor: 'kg', rotulo: 'quilo (kg)' },
  { valor: 'ml', rotulo: 'mililitro (ml)' },
  { valor: 'l', rotulo: 'litro (L)' },
]

export function hora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function dataCurta(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function haQuanto(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return h < 24 ? `${h} h ${min % 60 ? `${min % 60} min` : ''}`.trim() : `${Math.floor(h / 24)} d`
}

export const FORMAS = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'Pix' }

/** YYYY-MM-DD no fuso local. */
export function isoDia(data = new Date()) {
  const d = new Date(data)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
