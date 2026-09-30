<script setup>
import { vitrine, avancar } from '../../lib/vitrine'

const COLUNAS = [
  { status: 'novo', titulo: 'Na fila' },
  { status: 'preparando', titulo: 'Fazendo' },
  { status: 'pronto', titulo: 'Pronto' },
]
const acao = { novo: 'Começar', preparando: 'Marcar pronto', pronto: 'Entregar' }
</script>

<template>
  <div class="grid grid-cols-3 gap-2 md:gap-4">
    <div v-for="c in COLUNAS" :key="c.status" class="flex flex-col gap-2 min-w-0">
      <p class="fraco text-[15px] px-2 mb-1">
        {{ c.titulo }} <span class="apagado numero">{{ vitrine.cozinha.filter((i) => i.status === c.status).length || '' }}</span>
      </p>
      <TransitionGroup name="linha" tag="div" class="flex flex-col gap-2">
        <button
          v-for="i in vitrine.cozinha.filter((x) => x.status === c.status)"
          :key="i.id"
          class="pilula min-h-14 px-4 md:px-5 py-3 flex flex-col items-start justify-center text-left leading-tight"
          :class="c.status === 'pronto' && 'pilula-ativa'"
          :aria-label="`${acao[i.status]}: ${i.texto}`"
          @click="avancar(i)"
        >
          <span class="text-[15px] truncate max-w-full">{{ i.texto }}</span>
          <span class="apagado text-[12px] hidden md:block">{{ acao[i.status] }} →</span>
        </button>
      </TransitionGroup>
    </div>
  </div>
</template>
