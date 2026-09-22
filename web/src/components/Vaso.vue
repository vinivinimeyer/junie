<script setup>
import { computed } from 'vue'

/**
 * Um insumo é um pote redondo: o nível é o saldo, a linha é o mínimo.
 * Casca de vidro, líquido da tinta. Destaque quando é hora de repor,
 * perigo quando está crítico ou acabou.
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
  props.status === 'critico' || props.status === 'zerado' ? 'rgb(var(--perigo))' : props.status === 'baixo' ? 'rgb(var(--destaque))' : 'rgb(var(--tinta))'
)
const id = `v${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <svg :width="tamanho" :height="tamanho" viewBox="0 0 100 100" aria-hidden="true" class="shrink-0 vaso">
    <defs>
      <clipPath :id="id"><circle cx="50" cy="50" r="46" /></clipPath>
      <linearGradient :id="`${id}g`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(255 255 255)" stop-opacity="0.35" />
        <stop offset="100%" stop-color="rgb(255 255 255)" stop-opacity="0" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="rgb(var(--chao) / .2)" stroke="rgb(var(--tinta) / .32)" stroke-width="1.5" />
    <g :clip-path="`url(#${id})`">
      <rect x="0" :y="100 - nivel * 100" width="100" height="100" :fill="cor" class="nivel" />
      <line v-if="minimo > 0" x1="0" x2="100" :y1="100 - linha * 100" :y2="100 - linha * 100" stroke="rgb(var(--chao))" stroke-width="2.5" stroke-dasharray="4 3" />
    </g>
    <ellipse cx="38" cy="32" rx="16" ry="10" fill="rgb(255 255 255 / .28)" />
    <circle cx="50" cy="50" r="46" fill="none" :stroke="`url(#${id}g)`" stroke-width="2" />
    <circle cx="50" cy="50" r="48" fill="none" stroke="rgb(255 255 255 / .28)" stroke-width="1" />
  </svg>
</template>

<style scoped>
.nivel { transition: y 0.6s var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); }
</style>
