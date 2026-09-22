<script setup>
import { avisos } from '../lib/avisos'
</script>

<template>
  <div class="fixed z-[70] inset-x-0 bottom-0 pointer-events-none flex flex-col" aria-live="polite">
    <TransitionGroup name="surge">
      <div
        v-for="a in avisos"
        :key="a.id"
        class="pointer-events-auto px-5 md:px-10 py-5 text-lg aberto"
        style="transform-origin: bottom center"
        :class="a.tipo === 'erro' ? 'bg-perigo text-white' : a.tipo === 'alerta' ? 'bg-destaque text-destaque-tinta' : 'bg-tinta text-chao'"
      >{{ a.texto }}</div>
    </TransitionGroup>
  </div>
</template>
