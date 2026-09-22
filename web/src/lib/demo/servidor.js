/**
 * API simulada para demonstração: mesmas rotas, regras e formato de resposta
 * da junie-api (camelCase), com os dados no localStorage deste navegador.
 * Se mudar uma regra aqui, mude também em api/app/Services.
 */
import { ApiError } from '../api'

const CHAVE = 'junie-demo-db'
const JANELA_CONSUMO_DIAS = 14
const DIAS_DE_SEGURANCA = 7

const arred = (n, casas = 3) => Math.round(n * 10 ** casas) / 10 ** casas
const agora = () => new Date().toISOString()

/** Igual a arredondarCompra da API: sugestão em lotes práticos (29.132 ml -> 30 L). */
function arredondarCompra(quantidade, unidade) {
  if (quantidade <= 0) return 0
  const passo =
    unidade === 'g' || unidade === 'ml'
      ? quantidade >= 5000 ? 1000 : quantidade >= 1000 ? 500 : 100
      : unidade === 'kg' || unidade === 'l'
        ? quantidade >= 10 ? 1 : 0.5
        : quantidade >= 100 ? 10 : 1
  return Math.ceil(quantidade / passo) * passo
}
// randomUUID só existe em contexto seguro (https/localhost); a demo pode rodar pelo IP da rede.
const novoToken = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
const clonar = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

// ---------------------------------------------------------------- banco

function bancoVazio() {
  return {
    seq: {},
    tenants: [],
    users: [],
    tokens: {},
    categorias: [],
    fornecedores: [],
    insumos: [],
    produtos: [],
    ficha: [],
    mesas: [],
    pedidoItens: [],
    vendas: [],
    vendaItens: [],
    movimentacoes: [],
  }
}

let db = carregar()

function carregar() {
  try {
    return { ...bancoVazio(), ...JSON.parse(localStorage.getItem(CHAVE)) }
  } catch {
    return bancoVazio()
  }
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(db))
  } catch {
    // cota do localStorage estourada ou modo privado: a demo segue em memória
  }
}

function inserir(tabela, registro, quando = agora()) {
  db.seq[tabela] = (db.seq[tabela] ?? 0) + 1
  const linha = { id: db.seq[tabela], createdAt: quando, updatedAt: quando, ...registro }
  db[tabela].push(linha)
  return linha
}

const erro = (status, mensagem) => new ApiError(status, mensagem)
const exigir = (valor, mensagem) => {
  if (valor === undefined || valor === null || valor === '') throw erro(422, mensagem)
}

function doTenant(tabela, tenantId, id) {
  const linha = db[tabela].find((l) => l.tenantId === tenantId && l.id === Number(id))
  if (!linha) throw erro(404, 'Registro não encontrado')
  return linha
}

// ---------------------------------------------------------------- apresentação

const semSenha = ({ senha, ...user }) => user

function custoDoProduto(produto) {
  const linhas = db.ficha.filter((f) => f.produtoId === produto.id)
  if (!linhas.length) return produto.custoManual ?? 0
  return arred(
    linhas.reduce((s, f) => s + f.quantidade * (db.insumos.find((i) => i.id === f.insumoId)?.custoUnitario ?? 0), 0),
    4
  )
}

function apresentarProduto(produto) {
  const custo = custoDoProduto(produto)
  return {
    ...produto,
    custo,
    margem: produto.preco ? Math.round(((produto.preco - custo) / produto.preco) * 1000) / 10 : null,
    ficha: db.ficha
      .filter((f) => f.produtoId === produto.id)
      .map((f) => {
        const insumo = db.insumos.find((i) => i.id === f.insumoId)
        return { insumoId: f.insumoId, nome: insumo?.nome, unidade: insumo?.unidade, quantidade: f.quantidade, custoUnitario: insumo?.custoUnitario ?? 0 }
      }),
  }
}

function itensAbertos(mesaId) {
  return db.pedidoItens
    .filter((i) => i.mesaId === mesaId && !i.vendaId)
    .map((i) => ({ ...i, produto: { id: i.produtoId, nome: db.produtos.find((p) => p.id === i.produtoId)?.nome } }))
}

function apresentarMesa(mesa) {
  const itens = itensAbertos(mesa.id)
  return { ...mesa, itens, total: arred(itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0), 2), ocupada: itens.length > 0 }
}

const apresentarVenda = (venda) => ({
  ...venda,
  lucro: arred(venda.total - venda.custo, 2),
  itens: db.vendaItens.filter((i) => i.vendaId === venda.id),
})

const apresentarInsumo = (insumo) => ({
  ...insumo,
  fornecedor: db.fornecedores.find((f) => f.id === insumo.fornecedorId) ?? null,
})

// ---------------------------------------------------------------- regras de estoque

function movimentar({ tenantId, insumoId, tipo, quantidade, custoUnitario, motivo = null, userId = null, vendaId = null, quando }) {
  const insumo = doTenant('insumos', tenantId, insumoId)
  let custo = insumo.custoUnitario
  if (tipo === 'entrada' && custoUnitario !== undefined && quantidade > 0) {
    const saldoAtual = Math.max(insumo.quantidade, 0)
    custo = (saldoAtual * insumo.custoUnitario + quantidade * custoUnitario) / (saldoAtual + quantidade)
    insumo.custoUnitario = arred(custo, 4)
  }
  insumo.quantidade = arred(insumo.quantidade + quantidade)
  insumo.updatedAt = quando ?? agora()
  return inserir(
    'movimentacoes',
    {
      tenantId,
      insumoId: insumo.id,
      userId,
      vendaId,
      tipo,
      quantidade: arred(quantidade),
      custoUnitario: arred(tipo === 'entrada' ? custoUnitario ?? custo : custo, 4),
      saldoApos: insumo.quantidade,
      motivo,
    },
    quando
  )
}

function consumoPorInsumo(itens) {
  const consumo = new Map()
  for (const item of itens) {
    for (const f of db.ficha.filter((l) => l.produtoId === item.produtoId)) {
      consumo.set(f.insumoId, (consumo.get(f.insumoId) ?? 0) + item.quantidade * f.quantidade)
    }
  }
  return consumo
}

function registrarVenda({ tenantId, userId, mesaId = null, rotulo = null, formaPagamento, itens, quando }) {
  itens = itens.filter((i) => i.quantidade > 0)
  if (!itens.length) throw erro(422, 'A venda precisa de pelo menos um item')
  exigir(formaPagamento, 'Escolha a forma de pagamento')

  let total = 0
  let custo = 0
  const linhas = itens.map((item) => {
    const produto = doTenant('produtos', tenantId, item.produtoId)
    const preco = item.precoUnitario ?? produto.preco
    const custoUnit = custoDoProduto(produto)
    total += preco * item.quantidade
    custo += custoUnit * item.quantidade
    return { produtoId: produto.id, nome: produto.nome, quantidade: item.quantidade, precoUnitario: preco, custoUnitario: custoUnit }
  })

  const venda = inserir('vendas', { tenantId, userId, mesaId, rotulo, formaPagamento, total: arred(total, 2), custo: arred(custo, 4), status: 'concluida' }, quando)
  for (const l of linhas) {
    db.seq.vendaItens = (db.seq.vendaItens ?? 0) + 1
    db.vendaItens.push({ id: db.seq.vendaItens, vendaId: venda.id, ...l })
  }
  for (const [insumoId, quantidade] of consumoPorInsumo(itens)) {
    movimentar({ tenantId, insumoId, tipo: 'venda', quantidade: -quantidade, vendaId: venda.id, userId, quando })
  }
  return venda
}

function visaoEstoque(tenantId) {
  const desde = Date.now() - JANELA_CONSUMO_DIAS * 864e5
  const desde30 = Date.now() - 30 * 864e5
  const movs = db.movimentacoes.filter((m) => m.tenantId === tenantId)

  const consumo = new Map()
  let perdas30d = 0
  for (const m of movs) {
    const t = new Date(m.createdAt).getTime()
    if ((m.tipo === 'venda' || m.tipo === 'estorno') && t >= desde) consumo.set(m.insumoId, (consumo.get(m.insumoId) ?? 0) - m.quantidade)
    if (m.tipo === 'perda' && t >= desde30) perdas30d += Math.abs(m.quantidade) * m.custoUnitario
  }

  const itens = db.insumos
    .filter((i) => i.tenantId === tenantId && i.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((insumo) => {
      const fornecedor = db.fornecedores.find((f) => f.id === insumo.fornecedorId) ?? null
      const consumoDiario = Math.max(consumo.get(insumo.id) ?? 0, 0) / JANELA_CONSUMO_DIAS
      const prazo = fornecedor?.prazoEntregaDias ?? 2
      const cobertura = consumoDiario > 0 ? insumo.quantidade / consumoDiario : null
      const pontoDePedido = Math.max(insumo.estoqueMinimo, consumoDiario * prazo)
      const alvo = Math.max(insumo.estoqueMinimo * 2, consumoDiario * (prazo + DIAS_DE_SEGURANCA))

      let status = 'ok'
      if (insumo.quantidade <= 0) status = 'zerado'
      else if (insumo.quantidade < insumo.estoqueMinimo / 2 || (cobertura !== null && cobertura < prazo)) status = 'critico'
      else if (insumo.quantidade <= pontoDePedido) status = 'baixo'

      const sugestao = status === 'ok' ? 0 : arredondarCompra(alvo - insumo.quantidade, insumo.unidade)
      return {
        ...insumo,
        fornecedor,
        valorEmEstoque: arred(Math.max(insumo.quantidade, 0) * insumo.custoUnitario, 2),
        consumoDiario: arred(consumoDiario),
        coberturaDias: cobertura === null ? null : arred(cobertura, 1),
        pontoDePedido: arred(pontoDePedido),
        status,
        sugestaoCompra: sugestao,
        custoSugestao: arred(sugestao * insumo.custoUnitario, 2),
      }
    })

  return {
    resumo: {
      valorTotal: arred(itens.reduce((s, i) => s + i.valorEmEstoque, 0), 2),
      itens: itens.length,
      emAlerta: itens.filter((i) => i.status !== 'ok').length,
      zerados: itens.filter((i) => i.status === 'zerado').length,
      perdas30d: arred(perdas30d, 2),
      custoReposicao: arred(itens.reduce((s, i) => s + i.custoSugestao, 0), 2),
    },
    itens,
  }
}

function periodo(de, ate) {
  const inicio = de ? new Date(`${de}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0))
  const fim = ate ? new Date(`${ate}T23:59:59.999`) : new Date(new Date(inicio).setHours(23, 59, 59, 999))
  return { inicio, fim }
}

const noPeriodo = (iso, { inicio, fim }) => {
  const t = new Date(iso).getTime()
  return t >= inicio.getTime() && t <= fim.getTime()
}

const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function slugify(texto) {
  return (
    texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) ||
    'minha-marca'
  )
}

const CAMPOS_MARCA = ['nome', 'segmento', 'logo', 'logoEscala', 'logoX', 'logoY', 'corPrimaria', 'corDestaque', 'tema', 'fonte', 'cantos', 'chavePix', 'cidadePix', 'mensagemRecibo']
const escolher = (obj, campos) => Object.fromEntries(campos.filter((c) => obj?.[c] !== undefined).map((c) => [c, obj[c]]))

function importar(tenantId, userId, dados) {
  const fornecedores = new Map()
  for (const f of dados.fornecedores ?? []) {
    fornecedores.set(f.nome, inserir('fornecedores', { tenantId, nome: f.nome, contato: null, telefone: f.telefone ?? null, prazoEntregaDias: f.prazoEntregaDias ?? 2 }).id)
  }
  const insumos = new Map()
  for (const { quantidade, fornecedor, ...i } of dados.insumos ?? []) {
    const insumo = inserir('insumos', {
      tenantId,
      fornecedorId: fornecedor ? fornecedores.get(fornecedor) ?? null : null,
      nome: i.nome,
      unidade: i.unidade,
      quantidade: 0,
      estoqueMinimo: i.estoqueMinimo ?? 0,
      custoUnitario: i.custoUnitario ?? 0,
      ativo: true,
    })
    insumos.set(i.nome, insumo.id)
    if (quantidade) movimentar({ tenantId, insumoId: insumo.id, tipo: 'entrada', quantidade, custoUnitario: i.custoUnitario ?? 0, motivo: 'Estoque inicial', userId })
  }
  const ordemBase = Math.max(-1, ...db.categorias.filter((c) => c.tenantId === tenantId).map((c) => c.ordem)) + 1
  ;(dados.categorias ?? []).forEach((c, ci) => {
    const categoria = inserir('categorias', { tenantId, nome: c.nome, enviaCozinha: c.enviaCozinha ?? true, ordem: ordemBase + ci })
    ;(c.produtos ?? []).forEach(({ ficha, ...p }, pi) => {
      const produto = inserir('produtos', { tenantId, categoriaId: categoria.id, nome: p.nome, descricao: p.descricao ?? null, preco: p.preco, custoManual: p.custoManual ?? null, ordem: pi, ativo: true })
      for (const f of ficha ?? []) {
        if (insumos.has(f.insumo)) inserirFicha(produto.id, insumos.get(f.insumo), f.quantidade)
      }
    })
  })
  if (dados.mesas) criarMesas(tenantId, dados.mesas)
}

function inserirFicha(produtoId, insumoId, quantidade) {
  db.seq.ficha = (db.seq.ficha ?? 0) + 1
  db.ficha.push({ id: db.seq.ficha, produtoId, insumoId, quantidade: Number(quantidade) })
}

function criarMesas(tenantId, quantidade, prefixo) {
  const inicio = Math.max(0, ...db.mesas.filter((m) => m.tenantId === tenantId).map((m) => m.numero)) + 1
  return Array.from({ length: quantidade }, (_, i) =>
    inserir('mesas', { tenantId, numero: inicio + i, rotulo: prefixo ? `${prefixo} ${inicio + i}` : null, nomeCliente: null, abertaEm: null })
  )
}

/**
 * Só existe na demo: gera 14 dias de vendas, perdas e pedidos em andamento
 * para os painéis terem histórico. O estoque final continua igual ao do
 * template (as compras do período cobrem o que foi vendido).
 */
function popularHistorico(tenantId, userId) {
  const produtos = db.produtos.filter((p) => p.tenantId === tenantId && p.ativo)
  if (!produtos.length) return
  const peso = produtos.map((_, i) => 1 / (1 + i * 0.35))
  const somaPeso = peso.reduce((a, b) => a + b, 0)
  const sortear = () => {
    let r = Math.random() * somaPeso
    for (let i = 0; i < produtos.length; i++) if ((r -= peso[i]) <= 0) return produtos[i]
    return produtos[0]
  }
  const formas = ['cartao', 'cartao', 'cartao', 'pix', 'pix', 'dinheiro']

  const planejadas = []
  for (let dia = 14; dia >= 0; dia--) {
    const base = new Date()
    base.setDate(base.getDate() - dia)
    const fimDeSemana = [0, 6].includes(base.getDay())
    const vendasNoDia = dia === 0 ? Math.min(18, Math.max(4, new Date().getHours() - 7) * 2) : 24 + Math.floor(Math.random() * 14) + (fimDeSemana ? 12 : 0)
    for (let v = 0; v < vendasNoDia; v++) {
      const quando = new Date(base)
      // Picos de manhã e no almoço.
      const hora = [8, 8, 9, 9, 10, 11, 12, 12, 13, 13, 14, 15, 16, 16, 17, 18][Math.floor(Math.random() * 16)]
      quando.setHours(hora, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0)
      if (quando > new Date()) continue
      const itens = new Map()
      for (let n = 0; n < 1 + Math.floor(Math.random() * 3); n++) {
        const p = sortear()
        itens.set(p.id, (itens.get(p.id) ?? 0) + 1)
      }
      planejadas.push({ quando: quando.toISOString(), itens: [...itens].map(([produtoId, quantidade]) => ({ produtoId, quantidade })) })
    }
  }
  planejadas.sort((a, b) => a.quando.localeCompare(b.quando))

  // Compras que abasteceram o período, lançadas antes da primeira venda.
  const consumo = consumoPorInsumo(planejadas.flatMap((p) => p.itens))
  const inicio = new Date(Date.now() - 15 * 864e5).toISOString()
  for (const [insumoId, quantidade] of consumo) {
    const insumo = db.insumos.find((i) => i.id === insumoId)
    movimentar({ tenantId, insumoId, tipo: 'entrada', quantidade: Math.ceil(quantidade), custoUnitario: insumo.custoUnitario, motivo: 'Compra do fornecedor', userId, quando: inicio })
  }

  for (const p of planejadas) {
    registrarVenda({ tenantId, userId, formaPagamento: formas[Math.floor(Math.random() * formas.length)], itens: p.itens, quando: p.quando })
  }

  // Algumas perdas para o relatório.
  const insumos = db.insumos.filter((i) => i.tenantId === tenantId)
  const motivos = ['Venceu', 'Derramou no preparo', 'Quebra no recebimento']
  for (const [n, insumo] of insumos.slice(0, 3).entries()) {
    const quantidade = insumo.unidade === 'un' ? 2 : Math.round(insumo.estoqueMinimo * 0.06)
    if (quantidade > 0 && insumo.quantidade > quantidade) {
      movimentar({ tenantId, insumoId: insumo.id, tipo: 'perda', quantidade: -quantidade, motivo: motivos[n], userId, quando: new Date(Date.now() - (n + 2) * 864e5).toISOString() })
    }
  }

  // Duas mesas ocupadas com pedidos em andamento na cozinha.
  const mesas = db.mesas.filter((m) => m.tenantId === tenantId)
  const clientes = ['Marina', 'Carlos']
  const status = [['preparando', 'novo'], ['pronto', 'novo']]
  mesas.slice(1, 3).forEach((mesa, n) => {
    mesa.nomeCliente = clientes[n]
    mesa.abertaEm = new Date(Date.now() - (n + 1) * 11 * 60000).toISOString()
    produtos.slice(n, n + 2).forEach((produto, k) => {
      const categoria = db.categorias.find((c) => c.id === produto.categoriaId)
      inserir(
        'pedidoItens',
        {
          tenantId,
          mesaId: mesa.id,
          produtoId: produto.id,
          vendaId: null,
          quantidade: 1 + k,
          precoUnitario: produto.preco,
          observacao: k === 0 && n === 0 ? 'Sem açúcar' : null,
          status: categoria?.enviaCozinha ? status[n][k] : 'entregue',
        },
        new Date(Date.now() - (n + 1) * (9 - k * 4) * 60000).toISOString()
      )
    })
  })
}

// ---------------------------------------------------------------- rotas

const rotas = []
const rota = (metodo, padrao, handler, publica = false) => {
  const nomes = []
  const regex = new RegExp('^' + padrao.replace(/:(\w+)/g, (_, n) => (nomes.push(n), '([^/]+)')) + '$')
  rotas.push({ metodo, regex, nomes, handler, publica })
}

rota('POST', '/auth/cadastro', ({ body }) => {
  exigir(body.nome, 'Informe seu nome')
  exigir(body.email, 'Informe o e-mail')
  if (!body.senha || body.senha.length < 6) throw erro(422, 'A senha precisa de pelo menos 6 caracteres')
  exigir(body.marca?.nome, 'Informe o nome da marca')
  const email = body.email.trim().toLowerCase()
  if (db.users.some((u) => u.email === email)) throw erro(422, 'Este e-mail já tem uma conta')

  const base = slugify(body.marca.nome)
  let slug = base
  for (let n = 2; db.tenants.some((t) => t.slug === slug); n++) slug = `${base}-${n}`

  const tenant = inserir('tenants', {
    slug,
    segmento: 'cafeteria',
    logo: null,
    logoEscala: 1,
    logoX: 0,
    logoY: 0,
    corPrimaria: '#0000FF',
    corDestaque: '#FF4F1F',
    tema: 'escuro',
    fonte: 'DIN 2014',
    cantos: 'reto',
    chavePix: null,
    cidadePix: null,
    mensagemRecibo: null,
    ...escolher(body.marca, CAMPOS_MARCA),
    onboarding: { marca: true },
  })
  const user = inserir('users', { tenantId: tenant.id, nome: body.nome, email, senha: body.senha, papel: 'dono' })
  const token = novoToken()
  db.tokens[token] = user.id
  return { token, user: semSenha(user), tenant }
}, true)

rota('POST', '/auth/login', ({ body }) => {
  const user = db.users.find((u) => u.email === body.email?.trim().toLowerCase() && u.senha === body.senha)
  if (!user) throw erro(401, 'E-mail ou senha inválidos')
  const token = novoToken()
  db.tokens[token] = user.id
  return { token, user: semSenha(user), tenant: db.tenants.find((t) => t.id === user.tenantId) }
}, true)

rota('GET', '/public/marca/:slug', ({ params }) => {
  const t = db.tenants.find((x) => x.slug === params.slug)
  if (!t) throw erro(404, 'Marca não encontrada')
  return escolher(t, ['slug', 'nome', 'logo', 'logoEscala', 'logoX', 'logoY', 'corPrimaria', 'corDestaque', 'tema', 'fonte', 'cantos'])
}, true)

rota('GET', '/auth/eu', ({ user }) => ({ user: semSenha(user), tenant: db.tenants.find((t) => t.id === user.tenantId) }))
rota('POST', '/auth/logout', ({ token }) => (delete db.tokens[token], { ok: true }))

rota('GET', '/marca', ({ tenantId }) => db.tenants.find((t) => t.id === tenantId))
rota('PUT', '/marca', ({ tenantId, body }) => Object.assign(db.tenants.find((t) => t.id === tenantId), escolher(body, CAMPOS_MARCA), { updatedAt: agora() }))
rota('PUT', '/marca/onboarding', ({ tenantId, body }) => {
  const t = db.tenants.find((x) => x.id === tenantId)
  t.onboarding = { ...t.onboarding, ...escolher(body, ['marca', 'cardapio', 'mesas', 'estoque']) }
  return t
})
rota('POST', '/setup/importar', ({ tenantId, user, body }) => (importar(tenantId, user.id, body), db.tenants.find((t) => t.id === tenantId)))
rota('POST', '/demo/popular', ({ tenantId, user }) => (popularHistorico(tenantId, user.id), { ok: true }))

// categorias
rota('GET', '/categorias', ({ tenantId }) => db.categorias.filter((c) => c.tenantId === tenantId).sort((a, b) => a.ordem - b.ordem || a.id - b.id))
rota('POST', '/categorias', ({ tenantId, body }) => {
  exigir(body.nome?.trim(), 'Informe o nome da categoria')
  const ordem = body.ordem ?? Math.max(-1, ...db.categorias.filter((c) => c.tenantId === tenantId).map((c) => c.ordem)) + 1
  return inserir('categorias', { tenantId, nome: body.nome.trim(), enviaCozinha: body.enviaCozinha ?? true, ordem })
})
rota('PUT', '/categorias/:id', ({ tenantId, params, body }) => Object.assign(doTenant('categorias', tenantId, params.id), escolher(body, ['nome', 'ordem', 'enviaCozinha'])))
rota('DELETE', '/categorias/:id', ({ tenantId, params }) => {
  const c = doTenant('categorias', tenantId, params.id)
  db.categorias = db.categorias.filter((x) => x !== c)
  const ids = new Set(db.produtos.filter((p) => p.categoriaId === c.id).map((p) => p.id))
  db.produtos = db.produtos.filter((p) => !ids.has(p.id))
  db.ficha = db.ficha.filter((f) => !ids.has(f.produtoId))
  return { ok: true }
})

// produtos
function salvarProduto(tenantId, produto, body) {
  exigir(body.nome?.trim(), 'Informe o nome do produto')
  exigir(body.categoriaId, 'Escolha a categoria')
  if (!(Number(body.preco) >= 0)) throw erro(422, 'Preço inválido')
  doTenant('categorias', tenantId, body.categoriaId)
  Object.assign(produto, escolher(body, ['categoriaId', 'nome', 'descricao', 'preco', 'custoManual', 'ordem', 'ativo']), {
    nome: body.nome.trim(),
    preco: Number(body.preco),
    updatedAt: agora(),
  })
  if (body.ficha) {
    db.ficha = db.ficha.filter((f) => f.produtoId !== produto.id)
    for (const f of body.ficha) {
      if (db.insumos.some((i) => i.id === f.insumoId && i.tenantId === tenantId) && f.quantidade > 0) inserirFicha(produto.id, f.insumoId, f.quantidade)
    }
  }
  return apresentarProduto(produto)
}
rota('GET', '/produtos', ({ tenantId, query }) =>
  db.produtos
    .filter((p) => p.tenantId === tenantId && (query.ativos === undefined || p.ativo))
    .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
    .map(apresentarProduto)
)
rota('GET', '/produtos/:id', ({ tenantId, params }) => apresentarProduto(doTenant('produtos', tenantId, params.id)))
rota('POST', '/produtos', ({ tenantId, body }) => {
  const produto = inserir('produtos', { tenantId, categoriaId: null, nome: '', descricao: null, preco: 0, custoManual: null, ordem: body.ordem ?? 0, ativo: true })
  try {
    return salvarProduto(tenantId, produto, body)
  } catch (e) {
    db.produtos = db.produtos.filter((p) => p !== produto)
    throw e
  }
})
rota('PUT', '/produtos/:id', ({ tenantId, params, body }) => salvarProduto(tenantId, doTenant('produtos', tenantId, params.id), body))
rota('DELETE', '/produtos/:id', ({ tenantId, params }) => ((doTenant('produtos', tenantId, params.id).ativo = false), { ok: true }))

// fornecedores
rota('GET', '/fornecedores', ({ tenantId }) => db.fornecedores.filter((f) => f.tenantId === tenantId).sort((a, b) => a.nome.localeCompare(b.nome)))
rota('POST', '/fornecedores', ({ tenantId, body }) => {
  exigir(body.nome?.trim(), 'Informe o nome do fornecedor')
  return inserir('fornecedores', { tenantId, nome: body.nome.trim(), contato: body.contato ?? null, telefone: body.telefone ?? null, prazoEntregaDias: Number(body.prazoEntregaDias ?? 2) })
})
rota('PUT', '/fornecedores/:id', ({ tenantId, params, body }) => Object.assign(doTenant('fornecedores', tenantId, params.id), escolher(body, ['nome', 'contato', 'telefone', 'prazoEntregaDias'])))
rota('DELETE', '/fornecedores/:id', ({ tenantId, params }) => {
  const f = doTenant('fornecedores', tenantId, params.id)
  db.fornecedores = db.fornecedores.filter((x) => x !== f)
  db.insumos.filter((i) => i.fornecedorId === f.id).forEach((i) => (i.fornecedorId = null))
  return { ok: true }
})

// insumos e estoque
rota('GET', '/insumos', ({ tenantId }) => db.insumos.filter((i) => i.tenantId === tenantId && i.ativo).sort((a, b) => a.nome.localeCompare(b.nome)).map(apresentarInsumo))
rota('GET', '/insumos/:id', ({ tenantId, params }) => apresentarInsumo(doTenant('insumos', tenantId, params.id)))
rota('POST', '/insumos', ({ tenantId, user, body }) => {
  exigir(body.nome?.trim(), 'Informe o nome do insumo')
  exigir(body.unidade, 'Escolha a unidade')
  const insumo = inserir('insumos', {
    tenantId,
    fornecedorId: body.fornecedorId ?? null,
    nome: body.nome.trim(),
    unidade: body.unidade,
    quantidade: 0,
    estoqueMinimo: Number(body.estoqueMinimo ?? 0),
    custoUnitario: Number(body.custoUnitario ?? 0),
    ativo: true,
  })
  if (Number(body.quantidadeInicial) > 0) {
    movimentar({ tenantId, insumoId: insumo.id, tipo: 'entrada', quantidade: Number(body.quantidadeInicial), custoUnitario: insumo.custoUnitario, motivo: 'Estoque inicial', userId: user.id })
  }
  return apresentarInsumo(insumo)
})
rota('PUT', '/insumos/:id', ({ tenantId, params, body }) => {
  const insumo = doTenant('insumos', tenantId, params.id)
  Object.assign(insumo, escolher(body, ['nome', 'unidade', 'fornecedorId', 'estoqueMinimo', 'custoUnitario', 'ativo']), { updatedAt: agora() })
  return apresentarInsumo(insumo)
})
rota('DELETE', '/insumos/:id', ({ tenantId, params }) => ((doTenant('insumos', tenantId, params.id).ativo = false), { ok: true }))
rota('POST', '/insumos/:id/movimentar', ({ tenantId, user, params, body }) => {
  const insumo = doTenant('insumos', tenantId, params.id)
  const quantidade = Number(body.quantidade)
  if (!['entrada', 'perda', 'ajuste'].includes(body.tipo)) throw erro(422, 'Tipo de movimentação inválido')
  if (!(quantidade >= 0)) throw erro(422, 'Quantidade inválida')
  if (body.tipo === 'perda' && !body.motivo?.trim()) throw erro(422, 'Informe o motivo da perda')
  const delta = body.tipo === 'entrada' ? quantidade : body.tipo === 'perda' ? -quantidade : quantidade - insumo.quantidade
  const movimentacao = movimentar({
    tenantId,
    insumoId: insumo.id,
    tipo: body.tipo,
    quantidade: delta,
    custoUnitario: body.custoUnitario === undefined || body.custoUnitario === '' ? undefined : Number(body.custoUnitario),
    motivo: body.motivo?.trim() || (body.tipo === 'ajuste' ? 'Ajuste manual' : null),
    userId: user.id,
  })
  return { insumo: apresentarInsumo(insumo), movimentacao }
})
rota('GET', '/estoque/visao', ({ tenantId }) => visaoEstoque(tenantId))
rota('GET', '/estoque/movimentacoes', ({ tenantId, query }) =>
  db.movimentacoes
    .filter((m) => m.tenantId === tenantId && (!query.insumo_id || m.insumoId === Number(query.insumo_id)) && (!query.tipo || m.tipo === query.tipo))
    .sort((a, b) => b.id - a.id)
    .slice(0, Math.min(Number(query.limite ?? 100), 500))
    .map((m) => {
      const i = db.insumos.find((x) => x.id === m.insumoId)
      return { ...m, insumo: { id: i.id, nome: i.nome, unidade: i.unidade } }
    })
)
rota('POST', '/estoque/inventario', ({ tenantId, user, body }) => {
  const divergencias = []
  for (const c of body.contagens ?? []) {
    const insumo = db.insumos.find((i) => i.id === c.insumoId && i.tenantId === tenantId)
    if (!insumo) continue
    const diferenca = arred(Number(c.quantidade) - insumo.quantidade)
    if (diferenca === 0) continue
    const sistema = insumo.quantidade
    movimentar({ tenantId, insumoId: insumo.id, tipo: 'ajuste', quantidade: diferenca, motivo: 'Inventário', userId: user.id })
    divergencias.push({ insumoId: insumo.id, nome: insumo.nome, unidade: insumo.unidade, sistema, contado: Number(c.quantidade), diferenca, valor: arred(diferenca * insumo.custoUnitario, 2) })
  }
  return { divergencias }
})

// mesas
rota('GET', '/mesas', ({ tenantId }) => db.mesas.filter((m) => m.tenantId === tenantId).sort((a, b) => a.numero - b.numero).map(apresentarMesa))
rota('POST', '/mesas/lote', ({ tenantId, body }) => {
  const quantidade = Number(body.quantidade)
  if (!(quantidade >= 1 && quantidade <= 200)) throw erro(422, 'Informe entre 1 e 200 mesas')
  return criarMesas(tenantId, quantidade, body.prefixo?.trim())
})
rota('GET', '/mesas/:id', ({ tenantId, params }) => apresentarMesa(doTenant('mesas', tenantId, params.id)))
rota('PUT', '/mesas/:id', ({ tenantId, params, body }) => Object.assign(doTenant('mesas', tenantId, params.id), escolher(body, ['rotulo', 'nomeCliente'])))
rota('DELETE', '/mesas/:id', ({ tenantId, params }) => {
  const mesa = doTenant('mesas', tenantId, params.id)
  if (itensAbertos(mesa.id).length) throw erro(409, 'Feche a conta antes de remover a mesa')
  db.mesas = db.mesas.filter((m) => m !== mesa)
  return { ok: true }
})
rota('POST', '/mesas/:id/itens', ({ tenantId, params, body }) => {
  const mesa = doTenant('mesas', tenantId, params.id)
  if (!body.itens?.length) throw erro(422, 'Adicione pelo menos um item')
  const produtos = body.itens.map((i) => doTenant('produtos', tenantId, i.produtoId))
  if (body.nomeCliente !== undefined) mesa.nomeCliente = body.nomeCliente || null
  if (!mesa.abertaEm) mesa.abertaEm = agora()
  body.itens.forEach((item, n) => {
    const produto = produtos[n]
    const categoria = db.categorias.find((c) => c.id === produto.categoriaId)
    inserir('pedidoItens', {
      tenantId,
      mesaId: mesa.id,
      produtoId: produto.id,
      vendaId: null,
      quantidade: Number(item.quantidade),
      precoUnitario: produto.preco,
      observacao: item.observacao || null,
      status: categoria?.enviaCozinha ? 'novo' : 'entregue',
    })
  })
  return apresentarMesa(mesa)
})
rota('DELETE', '/mesas/:id/itens/:itemId', ({ tenantId, params }) => {
  const mesa = doTenant('mesas', tenantId, params.id)
  db.pedidoItens = db.pedidoItens.filter((i) => !(i.id === Number(params.itemId) && i.mesaId === mesa.id && !i.vendaId))
  return apresentarMesa(mesa)
})
rota('POST', '/mesas/:id/fechar', ({ tenantId, user, params, body }) => {
  const mesa = doTenant('mesas', tenantId, params.id)
  const itens = db.pedidoItens.filter((i) => i.mesaId === mesa.id && !i.vendaId)
  if (!itens.length) throw erro(422, 'Mesa sem itens em aberto')
  const venda = registrarVenda({
    tenantId,
    userId: user.id,
    mesaId: mesa.id,
    rotulo: mesa.nomeCliente || mesa.rotulo || `Mesa ${mesa.numero}`,
    formaPagamento: body.formaPagamento,
    itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, precoUnitario: i.precoUnitario })),
  })
  itens.forEach((i) => (i.vendaId = venda.id))
  mesa.nomeCliente = null
  mesa.abertaEm = null
  return apresentarVenda(venda)
})

// cozinha
rota('GET', '/cozinha', ({ tenantId }) => {
  const desde = Date.now() - 24 * 3600e3
  return db.pedidoItens
    .filter((i) => i.tenantId === tenantId && i.status !== 'entregue' && new Date(i.createdAt).getTime() >= desde)
    .sort((a, b) => a.id - b.id)
    .map((i) => {
      const mesa = db.mesas.find((m) => m.id === i.mesaId)
      return {
        ...i,
        produto: { id: i.produtoId, nome: db.produtos.find((p) => p.id === i.produtoId)?.nome },
        mesa: mesa ? { id: mesa.id, numero: mesa.numero, rotulo: mesa.rotulo, nomeCliente: mesa.nomeCliente } : null,
      }
    })
})
rota('PUT', '/cozinha/:id', ({ tenantId, params, body }) => {
  if (!['novo', 'preparando', 'pronto', 'entregue'].includes(body.status)) throw erro(422, 'Status inválido')
  return Object.assign(doTenant('pedidoItens', tenantId, params.id), { status: body.status, updatedAt: agora() })
})

// vendas e relatórios
rota('GET', '/vendas', ({ tenantId, query }) => {
  const p = periodo(query.de, query.ate)
  return db.vendas.filter((v) => v.tenantId === tenantId && noPeriodo(v.createdAt, p)).sort((a, b) => b.id - a.id).map(apresentarVenda)
})
rota('POST', '/vendas', ({ tenantId, user, body }) =>
  apresentarVenda(registrarVenda({ tenantId, userId: user.id, rotulo: body.rotulo ?? null, formaPagamento: body.formaPagamento, itens: body.itens ?? [] }))
)
rota('POST', '/vendas/:id/cancelar', ({ tenantId, user, params }) => {
  const venda = doTenant('vendas', tenantId, params.id)
  if (venda.status === 'cancelada') throw erro(409, 'Venda já cancelada')
  venda.status = 'cancelada'
  for (const baixa of db.movimentacoes.filter((m) => m.vendaId === venda.id && m.tipo === 'venda')) {
    movimentar({ tenantId, insumoId: baixa.insumoId, tipo: 'estorno', quantidade: -baixa.quantidade, vendaId: venda.id, userId: user.id, motivo: `Cancelamento da venda #${venda.id}` })
  }
  return apresentarVenda(venda)
})
rota('GET', '/relatorios/resumo', ({ tenantId, query }) => {
  const p = periodo(query.de, query.ate)
  const vendas = db.vendas.filter((v) => v.tenantId === tenantId && v.status === 'concluida' && noPeriodo(v.createdAt, p)).map(apresentarVenda)
  const faturamento = vendas.reduce((s, v) => s + v.total, 0)
  const custo = vendas.reduce((s, v) => s + v.custo, 0)
  const porForma = { dinheiro: 0, cartao: 0, pix: 0 }
  const porDia = new Map()
  const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, faturamento: 0 }))
  const porProduto = new Map()
  for (const v of vendas) {
    porForma[v.formaPagamento] += v.total
    const d = new Date(v.createdAt)
    const data = isoLocal(d)
    const dia = porDia.get(data) ?? { data, faturamento: 0, lucro: 0, vendas: 0 }
    dia.faturamento += v.total
    dia.lucro += v.lucro
    dia.vendas++
    porDia.set(data, dia)
    porHora[d.getHours()].faturamento += v.total
    for (const i of v.itens) {
      const pr = porProduto.get(i.nome) ?? { nome: i.nome, quantidade: 0, faturamento: 0, lucro: 0 }
      pr.quantidade += i.quantidade
      pr.faturamento += i.precoUnitario * i.quantidade
      pr.lucro += (i.precoUnitario - i.custoUnitario) * i.quantidade
      porProduto.set(i.nome, pr)
    }
  }
  const r2 = (n) => arred(n, 2)
  return {
    de: isoLocal(p.inicio),
    ate: isoLocal(p.fim),
    faturamento: r2(faturamento),
    custo: r2(custo),
    lucro: r2(faturamento - custo),
    margem: faturamento ? Math.round(((faturamento - custo) / faturamento) * 1000) / 10 : null,
    vendas: vendas.length,
    ticketMedio: vendas.length ? r2(faturamento / vendas.length) : 0,
    porForma: Object.fromEntries(Object.entries(porForma).map(([k, v]) => [k, r2(v)])),
    porDia: [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data)).map((d) => ({ ...d, faturamento: r2(d.faturamento), lucro: r2(d.lucro) })),
    porHora: porHora.map((h) => ({ ...h, faturamento: r2(h.faturamento) })),
    topProdutos: [...porProduto.values()].sort((a, b) => b.faturamento - a.faturamento).slice(0, 10).map((x) => ({ ...x, faturamento: r2(x.faturamento), lucro: r2(x.lucro) })),
  }
})

// ---------------------------------------------------------------- entrada

export async function atender(metodo, caminho, corpo, token) {
  await new Promise((r) => setTimeout(r, 90 + Math.random() * 120))
  db = carregar() // outra aba pode ter mudado os dados (ex.: tela da cozinha)

  const [path, qs] = caminho.split('?')
  const query = Object.fromEntries(new URLSearchParams(qs ?? ''))
  for (const r of rotas) {
    if (r.metodo !== metodo) continue
    const m = path.match(r.regex)
    if (!m) continue
    const params = Object.fromEntries(r.nomes.map((n, i) => [n, decodeURIComponent(m[i + 1])]))

    let user = null
    if (!r.publica) {
      user = db.users.find((u) => u.id === db.tokens[token])
      if (!user) throw erro(401, 'Sessão expirada, entre novamente')
    }
    const resultado = r.handler({ params, query, body: clonar(corpo) ?? {}, user, tenantId: user?.tenantId, token })
    salvar()
    return clonar(resultado)
  }
  throw erro(404, `Rota não encontrada: ${metodo} ${path}`)
}

/** Apaga todos os dados da demonstração deste navegador. */
export function resetarDemo() {
  db = bancoVazio()
  salvar()
}
