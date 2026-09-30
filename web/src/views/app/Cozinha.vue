<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import { avisarErro } from '../../lib/avisos'

/** Fila da cozinha e do bar. Tocar no pedido passa para a próxima coluna. */
const itens = ref([])
const carregando = ref(true)
const agora = ref(Date.now())

const COLUNAS = [
  { status: 'novo', titulo: 'Na fila', proximo: 'preparando', acao: 'Começar' },
  { status: 'preparando', titulo: 'Fazendo', proximo: 'pronto', acao: 'Marcar pronto' },
  { status: 'pronto', titulo: 'Pronto', proximo: 'entregue', acao: 'Entregar' },
]
const por = computed(() => Object.fromEntries(COLUNAS.map((c) => [c.status, itens.value.filter((i) => i.status === c.status)])))

async function carregar() {
  try {
    itens.value = await api.get('/cozinha')
  } catch (e) {
    avisarErro(e)
  } finally {
    carregando.value = false
  }
}
let timer
onMounted(() => {
  carregar()
  timer = setInterval(() => {
    agora.value = Date.now()
    carregar()
  }, 8000)
})
onBeforeUnmount(() => clearInterval(timer))

async function avancar(item, status) {
  const antes = item.status
  item.status = status
  try {
    await api.put(`/cozinha/${item.id}`, { status })
    if (status === 'entregue') itens.value = itens.value.filter((i) => i.id !== item.id)
  } catch (e) {
    item.status = antes
    avisarErro(e)
  }
}

const minutos = (iso) => Math.max(0, Math.round((agora.value - new Date(iso).getTime()) / 60000))
const mesa = (i) => i.mesa?.nomeCliente || i.mesa?.rotulo || `Mesa ${i.mesa?.numero}`
</script>

<template>
  <div class="flex-1 px-5 md:px-8 pt-8 pb-16 grid md:grid-cols-3 gap-10 md:gap-8 items-start">
    <section v-for="col in COLUNAS" :key="col.status">
      <h2 class="text-xl md:text-2xl px-2 pb-4 flex justify-between items-baseline">
        <span>{{ col.titulo }}</span><span class="numero text-[15px]" :class="por[col.status].length ? 'fraco' : 'apagado'">{{ por[col.status].length }}</span>
      </h2>
      <div v-if="carregando" class="flex flex-col gap-1.5" aria-busy="true">
        <div v-for="n in 3" :key="n" class="brilho h-24 rounded-[min(var(--raio),1.75rem)]" :style="{ '--i': n, opacity: 1 - n * 0.2 }" />
      </div>
      <p v-else-if="!por[col.status].length" class="apagado px-2 py-4 text-[15px]">Nada por aqui.</p>
      <TransitionGroup name="surge" tag="ul" class="flex flex-col gap-1.5">
        <li v-for="i in por[col.status]" :key="i.id">
          <button class="pilula w-full px-5 py-4 text-left rounded-[min(var(--raio),1.75rem)]" :aria-label="`${i.quantidade} ${i.produto?.nome}, ${mesa(i)}: marcar como ${col.proximo}`" @click="avancar(i, col.proximo)">
            <span class="flex justify-between text-[13px]" :class="minutos(i.createdAt) > 15 && col.status !== 'pronto' ? 'text-perigo' : 'fraco'">
              <span class="truncate">{{ mesa(i) }}</span><span class="numero shrink-0">{{ minutos(i.createdAt) }} min</span>
            </span>
            <span class="block text-lg md:text-xl leading-tight mt-1"><span class="numero">{{ i.quantidade }}×</span> {{ i.produto?.nome }}</span>
            <span v-if="i.observacao" class="block text-destaque text-[15px] mt-1">{{ i.observacao }}</span>
            <span class="block apagado text-[13px] mt-2">{{ col.acao }} →</span>
          </button>
        </li>
      </TransitionGroup>
    </section>
  </div>
</template>
