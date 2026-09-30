<script setup>
import { computed } from 'vue'

/**
 * Um insumo é uma esfera de vidro: o nível é o saldo, a linha é o mínimo.
 * Líquido claro quando está tudo bem, cor de destaque quando é hora de
 * repor, perigo quando está crítico ou acabou.
 */
const props = defineProps({
  quantidade: { type: Number, required: true },
  minimo: { type: Number, default: 0 },
  /** Topo da escala (100% do pote). */
  escala: { type: Number, required: true },
  status: { type: String, default: 'ok' },
  tamanho: { type: Number, default: 112 },
})

const nivel = computed(() => Math.max(0, Math.min(1, props.quantidade / props.escala)))
const linha = computed(() => Math.max(0, Math.min(1, props.minimo / props.escala)))
const cor = computed(() =>
  props.status === 'critico' || props.status === 'zerado' ? 'var(--perigo)' : props.status === 'baixo' ? 'var(--destaque)' : 'var(--tinta)'
)
const forte = computed(() => props.status !== 'ok')
const id = `v${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <svg :width="tamanho" :height="tamanho" viewBox="0 0 100 100" aria-hidden="true" class="shrink-0 vaso">
    <defs>
      <clipPath :id="id"><circle cx="50" cy="50" r="49" /></clipPath>
      <linearGradient :id="`${id}l`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="`rgb(${cor})`" :stop-opacity="forte ? 0.95 : 0.34" />
        <stop offset="100%" :stop-color="`rgb(${cor})`" :stop-opacity="forte ? 0.35 : 0.1" />
      </linearGradient>
      <radialGradient :id="`${id}v`" cx="0.5" cy="0.35" r="0.7">
        <stop offset="0%" stop-color="rgb(var(--tinta))" stop-opacity="0.1" />
        <stop offset="100%" stop-color="rgb(var(--tinta))" stop-opacity="0.04" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="49" :fill="`url(#${id}v)`" />
    <g :clip-path="`url(#${id})`">
      <g class="nivel" :style="{ transform: `translateY(${100 - nivel * 100}px)` }">
        <rect x="0" y="0" width="100" height="100" :fill="`url(#${id}l)`" />
        <rect x="0" y="0" width="100" height="1.5" :fill="`rgb(${cor})`" :opacity="forte ? 0.9 : 0.6" />
      </g>
      <line v-if="minimo > 0" x1="0" x2="100" :y1="100 - linha * 100" :y2="100 - linha * 100" stroke="rgb(var(--tinta) / .55)" stroke-width="1" stroke-dasharray="2 3" />
    </g>
    <circle cx="50" cy="50" r="49" fill="none" stroke="rgb(255 255 255 / .16)" stroke-width="1" />
    <path d="M22 30 A34 34 0 0 1 50 16" fill="none" stroke="rgb(255 255 255 / .35)" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>

<style scoped>
.nivel { transition: transform 0.6s var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); }
</style>
