<script setup>
import { computed, reactive, ref } from 'vue'
import { api } from '../../lib/api'
import { brl, qtd } from '../../lib/formato'
import { avisar, avisarErro } from '../../lib/avisos'

/** Contagem na prateleira: digita o que tem; o sistema lança só a diferença. */
const props = defineProps({ itens: { type: Array, required: true } })
const emit = defineEmits(['salvo'])
const contagem = reactive({})
const salvando = ref(false)

const dif = (i) => (contagem[i.id] === undefined || contagem[i.id] === '' ? null : Number(contagem[i.id]) - i.quantidade)
const contados = computed(() => props.itens.filter((i) => dif(i) !== null))
const impacto = computed(() => contados.value.reduce((s, i) => s + dif(i) * i.custoUnitario, 0))

async function fechar() {
  salvando.value = true
  try {
    const { divergencias } = await api.post('/estoque/inventario', { contagens: contados.value.map((i) => ({ insumoId: i.id, quantidade: Number(contagem[i.id]) })) })
    Object.keys(contagem).forEach((k) => delete contagem[k])
    avisar(divergencias.length ? `${divergencias.length} acertos lançados` : 'Bateu certinho')
    emit('salvo')
  } catch (e) {
    avisarErro(e)
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl pb-40">
    <div v-for="i in itens" :key="i.id" class="flex items-baseline gap-4 py-3 regua-fina">
      <span class="flex-1 text-xl truncate">{{ i.nome }}</span>
      <span class="fraco numero hidden sm:inline">{{ qtd(i.quantidade, i.unidade) }}</span>
      <input v-model="contagem[i.id]" type="number" step="any" min="0" :aria-label="`Contagem de ${i.nome}`" placeholder="—" class="w-24 bg-transparent regua-fina outline-none text-2xl font-bold numero text-right text-tinta placeholder:text-tinta/30" />
      <span class="w-8 fraco">{{ i.unidade }}</span>
      <span class="w-24 text-right numero" :class="dif(i) < 0 ? 'text-perigo' : 'fraco'">{{ dif(i) === null || dif(i) === 0 ? '' : `${dif(i) > 0 ? '+' : ''}${qtd(dif(i), i.unidade)}` }}</span>
    </div>
    <div v-if="contados.length" class="fixed inset-x-0 bottom-0 bg-tinta text-chao px-5 md:px-10 py-6 flex items-center justify-between gap-6 z-30">
      <span class="text-xl numero">{{ contados.length }} contados · {{ brl(impacto) }}</span>
      <button class="palavra text-2xl" :disabled="salvando" @click="fechar">Fechar contagem →</button>
    </div>
  </div>
</template>
