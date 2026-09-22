<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../lib/api'
import { sessao } from '../../lib/sessao'
import { brl, haQuanto, FORMAS } from '../../lib/formato'
import { atualizarAlertas } from '../../lib/alertas'
import { avisar, avisarErro } from '../../lib/avisos'
import Orbe from '../../components/Orbe.vue'
import Tela from '../../components/Tela.vue'

const router = useRouter()
const mesas = ref([])
const carregando = ref(true)
const abertaId = ref(null)
const fechando = ref(false)

const aberta = computed(() => mesas.value.find((m) => m.id === abertaId.value))
const emAberto = computed(() => mesas.value.filter((m) => m.ocupada).reduce((s, m) => s + m.total, 0))
const nome = (m) => m.nomeCliente || m.rotulo || `Mesa ${m.numero}`
const prontos = (m) => m.itens.filter((i) => i.status === 'pronto').length
const STATUS = { novo: 'na fila', preparando: 'fazendo', pronto: 'pronto', entregue: '' }

async function carregar() {
  try {
    mesas.value = await api.get('/mesas')
  } catch (e) {
    avisarErro(e)
  } finally {
    carregando.value = false
  }
}
let timer
onMounted(() => {
  carregar()
  timer = setInterval(carregar, 15000)
})
onBeforeUnmount(() => clearInterval(timer))

async function remover(item) {
  try {
    const m = await api.del(`/mesas/${aberta.value.id}/itens/${item.id}`)
    mesas.value = mesas.value.map((x) => (x.id === m.id ? { ...x, ...m } : x))
  } catch (e) {
    avisarErro(e)
  }
}

async function fechar(forma) {
  fechando.value = true
  try {
    const venda = await api.post(`/mesas/${aberta.value.id}/fechar`, { formaPagamento: forma })
    avisar(`${venda.rotulo} · ${brl(venda.total)} · ${FORMAS[forma]}`)
    abertaId.value = null
    await carregar()
    atualizarAlertas()
  } catch (e) {
    avisarErro(e)
  } finally {
    fechando.value = false
  }
}
</script>

<template>
  <div class="flex-1 px-5 md:px-10 pt-6 pb-16">
    <p class="text-xl fraco mb-8 numero">{{ brl(emAberto) }} em aberto</p>

    <div v-if="carregando" class="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-6" aria-busy="true">
      <div v-for="n in 8" :key="n" class="aspect-square rounded-full vidro-disco" />
    </div>
    <p v-else-if="!mesas.length" class="text-2xl">
      Sem mesas. <RouterLink to="/configurar" class="palavra underline underline-offset-8 decoration-4">Criar mesas</RouterLink>
    </p>

    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] md:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 md:gap-8">
      <button
        v-for="m in mesas"
        :key="m.id"
        class="relative aspect-square rounded-full transition-transform duration-150 active:scale-95"
        :aria-label="m.ocupada ? `${nome(m)}, ${brl(m.total)}` : `Mesa ${m.numero} livre`"
        @click="m.ocupada ? (abertaId = m.id) : router.push(`/app?mesa=${m.id}`)"
      >
        <Orbe v-if="m.ocupada" :marca="sessao.tenant" :semente="m.numero" tamanho="100%">
          <span class="text-2xl md:text-4xl leading-none numero">{{ m.numero }}</span>
          <span class="text-xs md:text-sm mt-1 md:mt-2 truncate max-w-full">{{ m.nomeCliente || '' }}</span>
          <span class="text-xs md:text-sm numero">{{ brl(m.total) }}</span>
          <span class="text-xs opacity-75 mt-1 hidden md:block">{{ haQuanto(m.abertaEm) }}</span>
        </Orbe>
        <span v-else class="vidro-disco absolute inset-0 rounded-full flex items-center justify-center text-3xl md:text-4xl numero">{{ m.numero }}</span>
        <span v-if="prontos(m)" class="absolute top-[6%] right-[6%] w-9 h-9 rounded-full bg-destaque text-destaque-tinta flex items-center justify-center text-sm numero" :title="`${prontos(m)} pronto`">{{ prontos(m) }}</span>
      </button>
    </div>

    <Tela v-if="aberta" :rotulo="nome(aberta)" @fechar="abertaId = null">
      <div class="px-5 md:px-10 pt-20 pb-60 max-w-3xl">
        <h1 class="text-5xl md:text-7xl leading-none">{{ nome(aberta) }}</h1>
        <p class="fraco text-lg mt-3">Mesa {{ aberta.numero }} · há {{ haQuanto(aberta.abertaEm) }}</p>
        <ul class="mt-10">
          <li v-for="i in aberta.itens" :key="i.id" class="flex items-baseline gap-4 py-4 regua-fina text-xl md:text-2xl">
            <span class="w-10 numero">{{ i.quantidade }}</span>
            <span class="flex-1 truncate">{{ i.produto?.nome }}</span>
            <span class="text-base" :class="i.status === 'pronto' ? 'text-destaque' : 'apagado'">{{ STATUS[i.status] }}</span>
            <span class="numero">{{ brl(i.precoUnitario * i.quantidade) }}</span>
            <button v-if="i.status === 'novo'" class="palavra fraco text-lg" :aria-label="`Tirar ${i.produto?.nome}`" @click="remover(i)">✕</button>
          </li>
        </ul>
        <RouterLink :to="`/app?mesa=${aberta.id}`" class="palavra inline-block text-xl mt-6">+ Itens</RouterLink>
      </div>
      <div class="fixed inset-x-0 bottom-0 bg-tinta text-chao px-5 md:px-10 py-6 md:py-8 flex justify-between gap-6">
        <span class="text-5xl md:text-7xl leading-none numero">{{ brl(aberta.total).replace(',00', '') }}</span>
        <div class="flex flex-col items-end md:items-start gap-3 text-xl md:text-2xl">
          <button v-for="(r, f) in FORMAS" :key="f" class="palavra" :disabled="fechando" @click="fechar(f)">{{ r }}</button>
        </div>
      </div>
    </Tela>
  </div>
</template>
