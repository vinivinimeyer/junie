<script setup>
import { computed } from 'vue'
import { vitrine, resumo, cancelar, mostrar } from '../../lib/vitrine'
import { brl, hora, FORMAS } from '../../lib/formato'
import Orbe from '../Orbe.vue'

defineProps({ marca: { type: Object, required: true } })

const formas = computed(() =>
  Object.entries(resumo.value.porForma)
    .map(([f, v]) => ({ f, v, pct: (v / resumo.value.faturamento) * 100 }))
    .sort((a, b) => b.v - a.v)
)
const redondo = (v) => brl(Math.round(v)).replace(',00', '')
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex items-center">
      <Orbe :marca="marca" tamanho="min(48vw, 15rem)">
        <span class="text-sm opacity-80">Vendeu</span>
        <span class="text-[clamp(1.4rem,11cqw,2rem)] numero leading-none mt-1">{{ redondo(resumo.faturamento) }}</span>
        <span class="text-xs opacity-70 mt-2 numero">{{ resumo.vendas }} vendas</span>
      </Orbe>
      <div class="-ml-8 md:-ml-10">
        <Orbe claro tamanho="min(48vw, 15rem)">
          <span class="text-sm opacity-60">Sobrou</span>
          <span class="text-[clamp(1.4rem,11cqw,2rem)] numero leading-none mt-1">{{ redondo(resumo.lucro) }}</span>
          <span class="text-xs opacity-50 mt-2">tirando o custo da ficha</span>
        </Orbe>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div v-for="f in formas" :key="f.f" class="pilula h-12 px-5 flex items-center gap-4 text-[15px] relative overflow-hidden">
        <span class="absolute inset-y-0 left-0 bg-tinta/10 transition-[width] duration-500" :style="{ width: `${f.pct}%` }" aria-hidden="true" />
        <span class="relative">{{ FORMAS[f.f] }}</span>
        <span class="relative ml-auto numero">{{ redondo(f.v) }}</span>
        <span class="relative apagado numero w-10 text-right">{{ Math.round(f.pct) }}%</span>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <p class="fraco text-[15px] px-2">Suas vendas</p>
      <TransitionGroup name="linha" tag="div" class="flex flex-col gap-2">
        <div v-for="v in vitrine.vendas" :key="v.id" class="pilula h-14 px-5 flex items-center gap-4 text-[15px] min-w-0">
          <span class="apagado numero shrink-0">{{ hora(v.hora) }}</span>
          <span class="truncate">{{ v.linhas.map((l) => `${l.quantidade} ${l.nome.toLowerCase()}`).join(', ') }}</span>
          <span class="ml-auto numero shrink-0">{{ brl(v.total).replace(',00', '') }}</span>
          <button class="palavra fraco shrink-0" @click="cancelar(v)">Cancelar</button>
        </div>
      </TransitionGroup>
      <p v-if="!vitrine.vendas.length" class="apagado text-[15px] px-2">
        O que você <button class="palavra underline underline-offset-4" @click="mostrar('vender')">vender</button> aparece aqui. Cancelar devolve os insumos ao estoque.
      </p>
    </div>
  </div>
</template>
