<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { api } from '../../lib/api'
import { sessao } from '../../lib/sessao'
import { brl, qtd, FORMAS } from '../../lib/formato'
import { payloadPix } from '../../lib/pix'
import { atualizarAlertas } from '../../lib/alertas'
import { avisar, avisarErro } from '../../lib/avisos'
import Palavras from '../../components/Palavras.vue'
import Tela from '../../components/Tela.vue'

/**
 * O caixa. Mesma lógica do Home.vue do Logico: toca no produto, soma,
 * e a barra de total oferece as formas de pagamento como palavras.
 */
const route = useRoute()
const router = useRouter()

const produtos = ref([])
const categorias = ref([])
const mesas = ref([])
const aba = ref(null)
const carrinho = reactive(new Map())
const carregando = ref(true)
const enviando = ref(false)

onMounted(async () => {
  try {
    ;[produtos.value, categorias.value, mesas.value] = await Promise.all([api.get('/produtos?ativos=1'), api.get('/categorias'), api.get('/mesas')])
    aba.value = abas.value[0]?.id ?? null
    atualizarAlertas()
  } catch (e) {
    avisarErro(e)
  } finally {
    carregando.value = false
  }
})

const abas = computed(() =>
  categorias.value
    .filter((c) => produtos.value.some((p) => p.categoriaId === c.id))
    .map((c) => ({ id: c.id, rotulo: c.nome, conta: contaCategoria(c.id) || undefined }))
)
const contaCategoria = (id) => produtos.value.filter((p) => p.categoriaId === id).reduce((s, p) => s + (carrinho.get(p.id) ?? 0), 0)
const visiveis = computed(() => produtos.value.filter((p) => p.categoriaId === aba.value))
const itens = computed(() => [...carrinho].map(([id, quantidade]) => ({ produto: produtos.value.find((p) => p.id === id), quantidade })).filter((i) => i.produto))
const total = computed(() => itens.value.reduce((s, i) => s + i.produto.preco * i.quantidade, 0))
const mesaAlvo = computed(() => mesas.value.find((m) => m.id === Number(route.query.mesa)))
const nomeMesa = (m) => m.nomeCliente || m.rotulo || `Mesa ${m.numero}`

function mudar(p, delta) {
  const n = (carrinho.get(p.id) ?? 0) + delta
  if (n <= 0) carrinho.delete(p.id)
  else carrinho.set(p.id, n)
}

async function avisarAlertas() {
  const novos = await atualizarAlertas()
  for (const i of novos.slice(0, 2)) {
    avisar(`${i.nome} ${i.status === 'zerado' ? 'acabou' : `· restam ${qtd(i.quantidade, i.unidade)}`}`, 'alerta', 6000)
  }
}

async function vender(forma) {
  enviando.value = true
  try {
    const venda = await api.post('/vendas', {
      formaPagamento: forma,
      itens: itens.value.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
    })
    avisar(`${brl(venda.total)} · ${FORMAS[forma]}`)
    carrinho.clear()
    tela.value = null
    avisarAlertas()
  } catch (e) {
    avisarErro(e)
  } finally {
    enviando.value = false
  }
}

// ---------- telas cheias ----------
const tela = ref(null) // 'pix' | 'dinheiro' | 'mesa'
const recebido = ref('')
const pix = ref('')
const escolhida = ref(null)
const cliente = ref('')
const troco = computed(() => (Number(recebido.value) || 0) - total.value)

watch(tela, async (t) => {
  recebido.value = ''
  escolhida.value = null
  cliente.value = ''
  if (t === 'pix' && sessao.tenant.chavePix) {
    const codigo = payloadPix({ chave: sessao.tenant.chavePix, nome: sessao.tenant.nome, cidade: sessao.tenant.cidadePix, valor: total.value })
    pix.value = await QRCode.toDataURL(codigo, { margin: 1, width: 360 })
  }
})

async function lancar(mesa, nome) {
  enviando.value = true
  try {
    await api.post(`/mesas/${mesa.id}/itens`, {
      ...(nome ? { nomeCliente: nome } : {}),
      itens: itens.value.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
    })
    avisar(`Lançado em ${nome || nomeMesa(mesa)}`)
    carrinho.clear()
    tela.value = null
    if (mesaAlvo.value) router.push('/app/mesas')
    else mesas.value = await api.get('/mesas')
  } catch (e) {
    avisarErro(e)
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col px-5 md:px-8 pt-6" :class="itens.length ? 'pb-56 md:pb-40' : 'pb-16'">
    <p v-if="mesaAlvo" class="pilula h-12 px-5 mb-5 flex items-center justify-between">
      <span>Para {{ nomeMesa(mesaAlvo) }}</span>
      <RouterLink to="/app" class="palavra fraco">Cancelar</RouterLink>
    </p>

    <div v-if="carregando" class="space-y-2 pt-4" aria-busy="true">
      <div v-for="n in 5" :key="n" class="brilho rounded-full h-[4.5rem]" :style="{ '--i': n, opacity: 1 - n * 0.14 }" />
    </div>
    <p v-else-if="!produtos.length" class="text-xl pt-10">
      Nada no cardápio ainda. <RouterLink to="/app/cardapio" class="palavra underline underline-offset-4">Escrever cardápio</RouterLink>
    </p>

    <template v-else>
      <Palavras v-model="aba" :itens="abas" />
      <ul class="mt-4 flex flex-col gap-2">
        <li v-for="p in visiveis" :key="p.id" class="flex items-center gap-2">
          <button
            class="pilula flex-1 flex items-center gap-4 h-[4.5rem] px-6 min-w-0 text-left"
            :class="carrinho.get(p.id) && 'pilula-ativa'"
            @click="mudar(p, 1)"
          >
            <span class="w-6 shrink-0 numero text-lg" :class="!carrinho.get(p.id) && 'apagado'">{{ carrinho.get(p.id) ?? '+' }}</span>
            <span class="text-[17px] truncate">{{ p.nome }}</span>
            <span class="ml-auto flex flex-col items-end leading-tight shrink-0">
              <span class="numero text-[17px]">{{ brl(p.preco).replace('R$', '').trim() }}</span>
              <span class="apagado text-xs">Preço</span>
            </span>
          </button>
          <button
            class="pilula w-[4.5rem] h-[4.5rem] rounded-full text-2xl leading-none shrink-0"
            :class="!carrinho.get(p.id) && 'invisible'"
            :aria-label="`Tirar um ${p.nome}`"
            @click="mudar(p, -1)"
          >−</button>
        </li>
      </ul>
    </template>

    <!-- barra de total: pílula clara flutuando sobre a lista -->
    <Transition name="surge">
      <div v-if="itens.length" class="fixed inset-x-3 md:left-[18.5rem] lg:left-[20.5rem] md:right-[4.5rem] bottom-3 md:bottom-[4.5rem] z-30 bg-tinta text-chao rounded-[2rem] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)]">
        <div class="flex items-baseline justify-between md:flex-col md:items-start gap-3">
          <span class="text-4xl md:text-5xl leading-none numero font-medium">{{ brl(total).replace(',00', '') }}</span>
          <button class="palavra text-sm opacity-60" @click="carrinho.clear()">Limpar</button>
        </div>
        <div v-if="mesaAlvo" class="flex">
          <button class="h-12 px-6 rounded-full bg-chao text-tinta text-[15px] w-full md:w-auto disabled:opacity-30" :disabled="enviando" @click="lancar(mesaAlvo)">Lançar →</button>
        </div>
        <div v-else class="grid grid-cols-2 md:flex gap-2">
          <button class="h-12 px-5 rounded-full bg-chao text-tinta text-[15px] transition-opacity hover:opacity-85 disabled:opacity-30" :disabled="enviando" @click="vender('cartao')">Cartão</button>
          <button class="h-12 px-5 rounded-full bg-chao/10 text-[15px] transition-colors hover:bg-chao/20 disabled:opacity-30" :disabled="enviando" @click="tela = 'pix'">Pix</button>
          <button class="h-12 px-5 rounded-full bg-chao/10 text-[15px] transition-colors hover:bg-chao/20 disabled:opacity-30" :disabled="enviando" @click="tela = 'dinheiro'">Dinheiro</button>
          <button v-if="mesas.length" class="h-12 px-5 rounded-full bg-chao/10 text-[15px] transition-colors hover:bg-chao/20 disabled:opacity-30" :disabled="enviando" @click="tela = 'mesa'">Mesa</button>
        </div>
      </div>
    </Transition>

    <!-- PIX: tela cheia na cor da marca, como no Logico -->
    <Tela v-if="tela === 'pix'" cheia rotulo="Pix" @fechar="tela = null">
      <div class="min-h-[100dvh] flex flex-col items-center justify-center gap-8 px-5 py-20 text-center">
        <span class="text-5xl md:text-6xl numero font-medium">{{ brl(total) }}</span>
        <img v-if="sessao.tenant.chavePix && pix" :src="pix" alt="QR Code Pix" class="w-64 h-64 md:w-80 md:h-80 bg-white p-4 rounded-[1.75rem]" />
        <p v-else-if="!sessao.tenant.chavePix" class="text-xl max-w-sm">Cadastre a chave Pix em Marca para mostrar o QR aqui.</p>
        <button class="h-14 px-8 rounded-full bg-marca-tinta text-marca text-lg font-medium disabled:opacity-30" :disabled="enviando" @click="vender('pix')">Pix recebido →</button>
      </div>
    </Tela>

    <!-- DINHEIRO -->
    <Tela v-if="tela === 'dinheiro'" rotulo="Dinheiro" @fechar="tela = null">
      <form class="min-h-[100dvh] flex flex-col justify-center gap-8 px-5 md:px-10 py-20 max-w-3xl" @submit.prevent="vender('dinheiro')">
        <p class="text-xl fraco numero">Total {{ brl(total) }}</p>
        <label class="flex items-baseline gap-4">
          <span class="text-3xl md:text-4xl">Recebi</span>
          <input v-model="recebido" type="number" step="0.01" min="0" autofocus aria-label="Valor recebido" class="flex-1 min-w-0 bg-transparent regua outline-none text-5xl md:text-6xl font-medium numero text-tinta" placeholder="0" />
        </label>
        <p class="text-3xl md:text-5xl numero" :class="troco < 0 && 'apagado'">Troco {{ brl(Math.max(troco, 0)) }}</p>
        <button class="bloco h-16 text-lg flex items-center justify-between px-8" :disabled="enviando">
          <span>Confirmar</span><span aria-hidden="true">→</span>
        </button>
      </form>
    </Tela>

    <!-- MESA: mesas redondas -->
    <Tela v-if="tela === 'mesa'" rotulo="Lançar na mesa" @fechar="tela = null">
      <div class="px-5 md:px-10 pt-24 pb-44">
        <h2 class="text-3xl md:text-4xl mb-10">Qual mesa?</h2>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-5">
          <button
            v-for="m in mesas"
            :key="m.id"
            class="aspect-square rounded-full flex flex-col items-center justify-center text-center p-2 transition-transform duration-150 active:scale-95"
            :class="escolhida?.id === m.id ? 'bg-tinta text-chao' : 'vidro-disco'"
            @click="escolhida = m; cliente = m.nomeCliente ?? ''"
          >
            <span class="text-3xl numero leading-none">{{ m.numero }}</span>
            <span v-if="m.ocupada" class="text-xs mt-1 truncate max-w-full">{{ m.nomeCliente || brl(m.total) }}</span>
          </button>
        </div>
      </div>
      <div v-if="escolhida" class="fixed inset-x-0 bottom-0 vidro px-5 md:px-10 py-6 flex flex-col md:flex-row gap-4">
        <input v-model="cliente" class="campo md:max-w-md" placeholder="nome do cliente (opcional)" aria-label="Nome do cliente" />
        <button class="bloco h-14 px-8 flex-1 text-lg flex items-center justify-between" :disabled="enviando" @click="lancar(escolhida, cliente || null)">
          <span>Lançar na {{ escolhida.numero }}</span><span aria-hidden="true">→</span>
        </button>
      </div>
    </Tela>
  </div>
</template>
