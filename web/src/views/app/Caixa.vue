<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '../../lib/api'
import { sessao } from '../../lib/sessao'
import { brl, num1, hora, dataCurta, isoDia, FORMAS } from '../../lib/formato'
import { atualizarAlertas } from '../../lib/alertas'
import { avisar, avisarErro } from '../../lib/avisos'
import Orbe from '../../components/Orbe.vue'
import Palavras from '../../components/Palavras.vue'

const PERIODOS = [
  { id: 0, rotulo: 'Hoje' },
  { id: 6, rotulo: '7 dias' },
  { id: 29, rotulo: '30 dias' },
]
const periodo = ref(0)
const resumo = ref(null)
const vendas = ref([])
const ativo = ref(null)
const tabela = ref(false)

const intervalo = computed(() => {
  const de = new Date()
  de.setDate(de.getDate() - periodo.value)
  return { de: isoDia(de), ate: isoDia() }
})

async function carregar() {
  try {
    const q = `de=${intervalo.value.de}&ate=${intervalo.value.ate}`
    ;[resumo.value, vendas.value] = await Promise.all([api.get(`/relatorios/resumo?${q}`), api.get(`/vendas?${q}`)])
  } catch (e) {
    avisarErro(e)
  }
}
onMounted(carregar)
watch(periodo, carregar)

/** Série completa: dias (ou horas, hoje) sem venda entram como zero. */
const serie = computed(() => {
  if (!resumo.value) return []
  if (periodo.value === 0) return resumo.value.porHora.slice(7, 23).map((h) => ({ rotulo: `${h.hora}h`, valor: h.faturamento }))
  const porData = new Map(resumo.value.porDia.map((d) => [d.data, d]))
  const dias = []
  for (let d = new Date(`${intervalo.value.de}T12:00:00`); isoDia(d) <= intervalo.value.ate; d.setDate(d.getDate() + 1)) {
    dias.push({ rotulo: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), valor: porData.get(isoDia(d))?.faturamento ?? 0 })
  }
  return dias
})
const maximo = computed(() => Math.max(...serie.value.map((s) => s.valor), 1))
const formas = computed(() =>
  Object.entries(resumo.value?.porForma ?? {})
    .map(([f, v]) => ({ f, v, pct: resumo.value.faturamento ? (v / resumo.value.faturamento) * 100 : 0 }))
    .sort((a, b) => b.v - a.v)
)

async function cancelar(v) {
  if (!confirm(`Cancelar ${brl(v.total)} de ${hora(v.createdAt)}? Os insumos voltam para o estoque.`)) return
  try {
    await api.post(`/vendas/${v.id}/cancelar`)
    avisar('Venda cancelada · estoque devolvido')
    carregar()
    atualizarAlertas()
  } catch (e) {
    avisarErro(e)
  }
}
</script>

<template>
  <div class="flex-1 px-5 md:px-10 pt-8 pb-16">
    <Palavras v-model="periodo" :itens="PERIODOS" tamanho="text-lg md:text-xl" class="mb-8" />

    <div class="grid lg:grid-cols-[auto_1fr] gap-10 lg:gap-16 items-center">
      <Orbe :marca="sessao.tenant" tamanho="min(84vw, 24rem)" class="mx-auto lg:mx-0">
        <template v-if="resumo">
          <span class="text-sm opacity-80">Vendeu</span>
          <span class="text-4xl md:text-5xl leading-none my-2">{{ brl(resumo.faturamento).replace(',00', '') }}</span>
          <span class="text-sm opacity-80">Sobrou</span>
          <span class="text-xl numero">{{ brl(resumo.lucro) }}</span>
        </template>
      </Orbe>

      <div v-if="resumo" class="min-w-0">
        <p class="text-xl md:text-2xl numero leading-snug">
          {{ resumo.vendas }} vendas · ticket {{ brl(resumo.ticketMedio) }} · margem {{ resumo.margem === null ? '—' : `${num1(resumo.margem)}%` }}
        </p>

        <figure class="mt-8">
          <div v-if="!tabela" class="relative h-44 flex items-end gap-[2px]" @mouseleave="ativo = null">
            <div
              v-for="(s, i) in serie"
              :key="s.rotulo"
              class="flex-1 h-full flex items-end justify-center cursor-default"
              tabindex="0"
              :aria-label="`${s.rotulo}: ${brl(s.valor)}`"
              @mouseenter="ativo = i"
              @focus="ativo = i"
            >
              <div class="w-full max-w-6 rounded-t-[4px] bg-tinta transition-opacity duration-150" :style="{ height: `${Math.max((s.valor / maximo) * 100, s.valor ? 2 : 0)}%`, opacity: ativo === null || ativo === i ? 1 : 0.35 }" />
            </div>
            <div class="absolute inset-x-0 bottom-0 h-[2px] bg-tinta/25" />
            <span v-if="ativo !== null" class="absolute -top-8 text-base numero whitespace-nowrap pointer-events-none" :style="{ left: `min(calc(${((ativo + 0.5) / serie.length) * 100}% - 3rem), calc(100% - 7rem))` }">
              {{ serie[ativo].rotulo }} · {{ brl(serie[ativo].valor) }}
            </span>
          </div>
          <div v-if="!tabela" class="flex justify-between mt-2 text-xs fraco numero">
            <span>{{ serie[0]?.rotulo }}</span><span>{{ serie.at(-1)?.rotulo }}</span>
          </div>
          <table v-else class="w-full text-lg">
            <tr v-for="s in serie.filter((x) => x.valor)" :key="s.rotulo" class="regua-fina"><td class="py-2 numero">{{ s.rotulo }}</td><td class="py-2 text-right numero">{{ brl(s.valor) }}</td></tr>
          </table>
          <button class="palavra text-sm fraco mt-3" @click="tabela = !tabela">{{ tabela ? 'Ver barras' : 'Ver números' }}</button>
        </figure>
      </div>
    </div>

    <div v-if="resumo" class="grid lg:grid-cols-2 gap-14 mt-16">
      <section>
        <h2 class="regua text-2xl pb-3">Como pagaram</h2>
        <div v-for="x in formas" :key="x.f" class="flex items-baseline justify-between py-3 regua-fina text-xl">
          <span>{{ FORMAS[x.f] }}</span><span class="numero">{{ brl(x.v) }} <span class="fraco text-base">{{ num1(x.pct) }}%</span></span>
        </div>
        <h2 class="regua text-2xl pb-3 mt-12">Mais vendidos</h2>
        <p v-if="!resumo.topProdutos.length" class="apagado py-3">—</p>
        <div v-for="p in resumo.topProdutos" :key="p.nome" class="flex items-baseline gap-4 py-3 regua-fina text-xl">
          <span class="w-12 numero">{{ p.quantidade }}</span>
          <span class="flex-1 truncate">{{ p.nome }}</span>
          <span class="numero">{{ brl(p.faturamento) }}</span>
        </div>
      </section>

      <section>
        <h2 class="regua text-2xl pb-3">Vendas</h2>
        <p v-if="!vendas.length" class="apagado py-3">—</p>
        <div class="max-h-[34rem] overflow-y-auto">
          <div v-for="v in vendas.slice(0, 100)" :key="v.id" class="flex items-baseline gap-4 py-3 regua-fina" :class="v.status === 'cancelada' && 'apagado line-through'">
            <span class="w-24 fraco text-sm numero shrink-0">{{ periodo ? dataCurta(v.createdAt) : '' }} {{ hora(v.createdAt) }}</span>
            <span class="flex-1 truncate text-lg">{{ v.rotulo || v.itens.map((i) => `${i.quantidade} ${i.nome}`).join(', ') }}</span>
            <span class="fraco text-sm hidden sm:inline">{{ FORMAS[v.formaPagamento] }}</span>
            <span class="text-lg numero">{{ brl(v.total) }}</span>
            <button v-if="v.status === 'concluida'" class="palavra fraco" :aria-label="`Cancelar venda de ${brl(v.total)}`" @click="cancelar(v)">✕</button>
            <span v-else class="w-4" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
