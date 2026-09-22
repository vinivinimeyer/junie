<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import { avisarErro } from '../../lib/avisos'

/** Fila da cozinha e do bar. Tocar no pedido passa para a próxima coluna. */
const itens = ref([])
const carregando = ref(true)
const agora = ref(Date.now())

const COLUNAS = [
  { status: 'novo', titulo: 'Na fila', proximo: 'preparando' },
  { status: 'preparando', titulo: 'Fazendo', proximo: 'pronto' },
  { status: 'pronto', titulo: 'Pronto', proximo: 'entregue' },
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
  <div class="flex-1 px-5 md:px-10 pt-8 pb-16 grid md:grid-cols-3 gap-10 md:gap-8 items-start">
    <section v-for="col in COLUNAS" :key="col.status">
      <h2 class="regua text-2xl md:text-3xl pb-3 flex justify-between">
        <span>{{ col.titulo }}</span><span class="numero" :class="!por[col.status].length && 'apagado'">{{ por[col.status].length }}</span>
      </h2>
      <p v-if="!carregando && !por[col.status].length" class="apagado py-6 text-lg">—</p>
      <TransitionGroup name="surge" tag="ul">
        <li v-for="i in por[col.status]" :key="i.id">
          <button class="palavra w-full py-5 regua-fina" :aria-label="`${i.quantidade} ${i.produto?.nome}, ${mesa(i)}: marcar como ${col.proximo}`" @click="avancar(i, col.proximo)">
            <span class="flex justify-between text-sm" :class="minutos(i.createdAt) > 15 && col.status !== 'pronto' ? 'text-perigo' : 'fraco'">
              <span class="truncate">{{ mesa(i) }}</span><span class="numero shrink-0">{{ minutos(i.createdAt) }} min</span>
            </span>
            <span class="block text-2xl md:text-3xl leading-tight mt-1"><span class="numero">{{ i.quantidade }}</span> {{ i.produto?.nome }}</span>
            <span v-if="i.observacao" class="block text-destaque text-lg mt-1">{{ i.observacao }}</span>
          </button>
        </li>
      </TransitionGroup>
    </section>
  </div>
</template>
