import { api } from './api'

/**
 * O cardápio e o estoque se escrevem como no quadro de giz do balcão:
 *
 *   CAFÉS               <- linha sem preço = categoria
 *   Espresso 7          <- nome + preço = produto
 *   Cappuccino 14,50
 *
 *   Leite integral 12 l        <- nome + quantidade + unidade = insumo
 *   Copo 300 ml 150 un mín 50  <- mínimo opcional
 */

const PRECO = /^(.+?)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*$/i
const INSUMO = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(un|und|unid|g|kg|ml|l)\.?(?:\s+m[ií]n\.?\s*(\d+(?:[.,]\d+)?))?\s*$/i

const numero = (t) => Number(String(t).replace(',', '.'))
const chave = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
const bonito = (t) => t.trim().replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase())

export function lerCardapio(texto) {
  const categorias = []
  let atual = null
  for (const bruta of texto.split('\n')) {
    const linha = bruta.trim()
    if (!linha) continue
    const m = linha.match(PRECO)
    if (m) {
      if (!atual) categorias.push((atual = { nome: 'Cardápio', produtos: [] }))
      atual.produtos.push({ nome: bonito(m[1]), preco: numero(m[2]) })
    } else {
      categorias.push((atual = { nome: bonito(linha), produtos: [] }))
    }
  }
  return categorias
}

export function cardapioComoTexto(categorias, produtos) {
  const reais = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ','))
  return categorias
    .map((c) => {
      const lista = produtos.filter((p) => p.categoriaId === c.id && p.ativo !== false)
      if (!lista.length) return null
      return [c.nome.toUpperCase(), ...lista.map((p) => `${p.nome} ${reais(p.preco)}`)].join('\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Aplica o quadro na API: cria o que é novo, atualiza preço/ordem/categoria
 * do que já existe (pelo nome) e arquiva o que foi apagado do quadro.
 */
export async function salvarCardapio(texto, { categorias, produtos }) {
  const lido = lerCardapio(texto)
  const cats = new Map(categorias.map((c) => [chave(c.nome), c]))
  const ativos = new Map(produtos.filter((p) => p.ativo !== false).map((p) => [chave(p.nome), p]))
  const mantidos = new Set()

  for (const [ordemCat, c] of lido.entries()) {
    let categoria = cats.get(chave(c.nome))
    if (!categoria) {
      categoria = await api.post('/categorias', { nome: c.nome, ordem: ordemCat })
      cats.set(chave(c.nome), categoria)
    } else if (categoria.ordem !== ordemCat) {
      await api.put(`/categorias/${categoria.id}`, { nome: categoria.nome, ordem: ordemCat, enviaCozinha: categoria.enviaCozinha })
    }
    for (const [ordem, p] of c.produtos.entries()) {
      const existente = ativos.get(chave(p.nome))
      if (existente) {
        mantidos.add(existente.id)
        if (existente.preco !== p.preco || existente.categoriaId !== categoria.id || existente.ordem !== ordem || existente.nome !== p.nome) {
          await api.put(`/produtos/${existente.id}`, { nome: p.nome, preco: p.preco, categoriaId: categoria.id, ordem })
        }
      } else {
        await api.post('/produtos', { nome: p.nome, preco: p.preco, categoriaId: categoria.id, ordem })
      }
    }
  }
  for (const p of ativos.values()) {
    if (!mantidos.has(p.id)) await api.del(`/produtos/${p.id}`)
  }
}

const UNIDADE = { und: 'un', unid: 'un' }

export function lerInsumos(texto) {
  const itens = []
  const ignoradas = []
  for (const bruta of texto.split('\n')) {
    const linha = bruta.trim()
    if (!linha) continue
    const m = linha.match(INSUMO)
    if (!m) {
      ignoradas.push(linha)
      continue
    }
    const quantidade = numero(m[2])
    itens.push({
      nome: bonito(m[1]),
      quantidade,
      unidade: UNIDADE[m[3].toLowerCase()] ?? m[3].toLowerCase(),
      // Sem mínimo escrito, assume um quarto do que tem hoje.
      estoqueMinimo: m[4] ? numero(m[4]) : Math.round(quantidade * 0.25 * 100) / 100,
    })
  }
  return { itens, ignoradas }
}

/** Liga produtos de revenda ao insumo de mesmo nome (Água -> Água, 1 para 1). */
export async function ligarRevenda(produtos, insumos) {
  const porNome = new Map(insumos.map((i) => [chave(i.nome), i]))
  let ligados = 0
  for (const p of produtos.filter((x) => !x.ficha?.length)) {
    const insumo = porNome.get(chave(p.nome))
    if (!insumo) continue
    await api.put(`/produtos/${p.id}`, { nome: p.nome, preco: p.preco, categoriaId: p.categoriaId, ficha: [{ insumoId: insumo.id, quantidade: 1 }] })
    ligados++
  }
  return ligados
}
