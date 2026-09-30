import { computed, reactive, ref } from 'vue'
import { lerCardapio } from './quadro'

/**
 * O café de mentira da home. Não fala com a API: é um estado só, e cada passo
 * da página mexe nele como o app mexeria. O quadro vira cardápio, a ficha dá
 * o custo, a venda baixa o estoque, manda para a cozinha e soma no caixa.
 */

const chave = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
/** No quadro a categoria vem em caixa alta; na tela, como frase. */
export const categoria = (t) => t.charAt(0) + t.slice(1).toLowerCase()
const reais = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ','))

const TEXTO = `BEBIDAS QUENTES
Espresso 7
Cappuccino 14

BEBIDAS FRIAS
Latte gelado 16

SALGADOS
Pão de queijo 8`

/** O dia já começou: números de antes de a pessoa chegar na página. */
const BASE = {
  faturamento: 1218,
  lucro: 742,
  vendas: 32,
  porForma: { cartao: 690, pix: 410, dinheiro: 118 },
  hoje: { espresso: 52, cappuccino: 38, 'pao de queijo': 41, 'latte gelado': 19 },
}

export const vitrine = reactive({
  texto: TEXTO,
  fichas: {
    espresso: [{ insumo: 'cafe', quantidade: 9 }],
    cappuccino: [
      { insumo: 'cafe', quantidade: 18 },
      { insumo: 'leite', quantidade: 120 },
      { insumo: 'copo', quantidade: 1 },
    ],
    'latte gelado': [
      { insumo: 'cafe', quantidade: 18 },
      { insumo: 'leite', quantidade: 200 },
      { insumo: 'copo', quantidade: 1 },
    ],
    'pao de queijo': [{ insumo: 'massa', quantidade: 1 }],
  },
  insumos: [
    { id: 'cafe', nome: 'Café', unidade: 'g', quantidade: 640, minimo: 300, escala: 1000, custo: 0.09, fornecedor: 'Torrefação Serra' },
    { id: 'leite', nome: 'Leite', unidade: 'ml', quantidade: 2500, minimo: 2000, escala: 8000, custo: 0.006, fornecedor: 'Laticínios Vale' },
    { id: 'copo', nome: 'Copo', unidade: 'un', quantidade: 44, minimo: 40, escala: 200, custo: 0.35, fornecedor: 'Embalagens Sul' },
    { id: 'massa', nome: 'Pão de queijo', unidade: 'un', quantidade: 10, minimo: 12, escala: 60, custo: 1.4, fornecedor: 'Padaria Mineira' },
  ],
  carrinho: {},
  vendas: [],
  cozinha: [
    { id: 1, texto: '2 latte gelado', status: 'novo' },
    { id: 2, texto: '1 cappuccino', status: 'preparando' },
    { id: 3, texto: '3 espresso', status: 'pronto' },
  ],
  /** Insumos que entraram em alerta na última venda. */
  alerta: [],
})

let seq = 10

/** Pedido de outro pedaço da página para mostrar um recurso (ex.: 'estoque'). */
export const foco = ref(null)
export const mostrar = (id) => (foco.value = id)

// ---------- cardápio ----------

export const cardapio = computed(() => lerCardapio(vitrine.texto))

export const produtos = computed(() =>
  cardapio.value.flatMap((c) =>
    c.produtos.map((p) => ({ ...p, id: chave(p.nome), categoria: categoria(c.nome), ficha: vitrine.fichas[chave(p.nome)] ?? [] }))
  )
)

const insumo = (id) => vitrine.insumos.find((i) => i.id === id)

export function custoDe(produto) {
  return produto.ficha.reduce((s, f) => s + (Number(f.quantidade) || 0) * (insumo(f.insumo)?.custo ?? 0), 0)
}

/** Troca o preço reescrevendo a linha do quadro, que é a fonte do cardápio. */
export function mudarPreco(produto, preco) {
  const valor = Number(preco)
  if (preco === '' || !(valor >= 0)) return
  vitrine.texto = vitrine.texto
    .split('\n')
    .map((l) => {
      const lido = lerCardapio(l)[0]?.produtos[0]
      return lido && chave(lido.nome) === produto.id ? `${lido.nome} ${reais(valor)}` : l
    })
    .join('\n')
}

// ---------- estoque ----------

export function statusDe(i) {
  if (i.quantidade <= 0) return 'zerado'
  if (i.quantidade <= i.minimo * 0.5) return 'critico'
  if (i.quantidade <= i.minimo) return 'baixo'
  return 'ok'
}

/** Pedido sugerido por fornecedor: completa até o topo do pote. */
export const compras = computed(() => {
  const mapa = new Map()
  for (const i of vitrine.insumos.filter((x) => statusDe(x) !== 'ok')) {
    const passo = i.unidade === 'un' ? 10 : 100
    const sugestao = Math.ceil((i.escala - i.quantidade) / passo) * passo
    const g = mapa.get(i.fornecedor) ?? { fornecedor: i.fornecedor, itens: [], total: 0 }
    g.itens.push({ insumo: i, sugestao })
    g.total += sugestao * i.custo
    mapa.set(i.fornecedor, g)
  }
  return [...mapa.values()]
})

export function chegou(item) {
  item.insumo.quantidade += item.sugestao
}

// ---------- venda ----------

export const itens = computed(() =>
  produtos.value.filter((p) => vitrine.carrinho[p.id]).map((p) => ({ produto: p, quantidade: vitrine.carrinho[p.id] }))
)
export const total = computed(() => itens.value.reduce((s, i) => s + i.produto.preco * i.quantidade, 0))

export function mudar(produto, delta) {
  const q = (vitrine.carrinho[produto.id] ?? 0) + delta
  if (q > 0) vitrine.carrinho[produto.id] = q
  else delete vitrine.carrinho[produto.id]
}

function baixar(ficha, quantidade, sinal) {
  for (const f of ficha) {
    const i = insumo(f.insumo)
    if (i) i.quantidade = Math.max(0, i.quantidade - sinal * f.quantidade * quantidade)
  }
}

export function vender(forma) {
  if (!itens.value.length) return
  const antes = new Set(vitrine.insumos.filter((i) => statusDe(i) !== 'ok').map((i) => i.id))
  const linhas = itens.value.map(({ produto, quantidade }) => ({
    id: produto.id,
    nome: produto.nome,
    quantidade,
    ficha: produto.ficha.map((f) => ({ ...f })),
  }))
  for (const l of linhas) {
    baixar(l.ficha, l.quantidade, 1)
    vitrine.cozinha.push({ id: seq++, texto: `${l.quantidade} ${l.nome.toLowerCase()}`, status: 'novo' })
  }
  vitrine.vendas.unshift({
    id: seq++,
    forma,
    linhas,
    total: total.value,
    custo: itens.value.reduce((s, i) => s + custoDe(i.produto) * i.quantidade, 0),
    hora: new Date(),
  })
  vitrine.carrinho = {}
  vitrine.alerta = vitrine.insumos.filter((i) => statusDe(i) !== 'ok' && !antes.has(i.id)).map((i) => i.nome)
}

export function cancelar(venda) {
  for (const l of venda.linhas) baixar(l.ficha, l.quantidade, -1)
  vitrine.vendas = vitrine.vendas.filter((v) => v.id !== venda.id)
}

export function avancar(item) {
  const proximo = { novo: 'preparando', preparando: 'pronto' }[item.status]
  if (proximo) item.status = proximo
  else vitrine.cozinha = vitrine.cozinha.filter((i) => i.id !== item.id)
}

// ---------- caixa ----------

export const resumo = computed(() => {
  const porForma = { ...BASE.porForma }
  const hoje = { ...BASE.hoje }
  let faturamento = BASE.faturamento
  let lucro = BASE.lucro
  for (const v of vitrine.vendas) {
    faturamento += v.total
    lucro += v.total - v.custo
    porForma[v.forma] = (porForma[v.forma] ?? 0) + v.total
    for (const l of v.linhas) hoje[l.id] = (hoje[l.id] ?? 0) + l.quantidade
  }
  return { faturamento, lucro, vendas: BASE.vendas + vitrine.vendas.length, porForma, hoje }
})
