<script setup>
import { onMounted, ref, watch } from 'vue'
import { api } from '../../lib/api'
import { qtd, dataCurta, hora } from '../../lib/formato'
import { avisarErro } from '../../lib/avisos'

const movs = ref([])
const tipo = ref('')
const TIPOS = { '': 'Tudo', entrada: 'Chegou', venda: 'Venda', perda: 'Perda', ajuste: 'Contagem', estorno: 'Estorno' }

async function carregar() {
  try {
    movs.value = await api.get(`/estoque/movimentacoes?limite=150${tipo.value ? `&tipo=${tipo.value}` : ''}`)
  } catch (e) {
    avisarErro(e)
  }
}
onMounted(carregar)
watch(tipo, carregar)
</script>

<template>
  <div class="max-w-5xl">
    <div class="flex flex-wrap gap-x-6 gap-y-2 text-lg mb-6">
      <button v-for="(r, k) in TIPOS" :key="k" :class="tipo !== k && 'apagado hover:opacity-70'" @click="tipo = k">{{ r }}</button>
    </div>
    <p v-if="!movs.length" class="apagado text-xl">—</p>
    <div v-for="m in movs" :key="m.id" class="grid grid-cols-[5.5rem_1fr_auto] md:grid-cols-[8rem_7rem_1fr_9rem_9rem] gap-x-4 gap-y-1 py-3 regua-fina items-baseline">
      <span class="fraco text-sm numero">{{ dataCurta(m.createdAt) }} {{ hora(m.createdAt) }}</span>
      <span class="text-sm hidden md:block" :class="m.tipo === 'perda' ? 'text-perigo' : 'fraco'">{{ TIPOS[m.tipo] }}</span>
      <span class="text-lg truncate">{{ m.insumo.nome }}<span v-if="m.motivo" class="fraco text-sm"> · {{ m.motivo }}</span></span>
      <span class="text-lg numero text-right">{{ m.quantidade > 0 ? '+' : '−' }}{{ qtd(Math.abs(m.quantidade), m.insumo.unidade) }}</span>
      <span class="fraco numero text-right hidden md:block">{{ qtd(m.saldoApos, m.insumo.unidade) }}</span>
    </div>
  </div>
</template>
