<script setup>
import Orbe from './Orbe.vue'
import LogoNoOrbe from './LogoNoOrbe.vue'

/** Logo da marca no círculo, com o enquadro do onboarding; sem logo, o nome vira a assinatura. */
defineProps({ marca: { type: Object, required: true }, altura: { type: Number, default: 28 } })
</script>

<template>
  <span v-if="marca.logo" class="inline-flex items-center gap-2.5 min-w-0">
    <Orbe :marca="marca" :tamanho="`${Math.round(altura * 1.25)}px`" parado>
      <LogoNoOrbe :marca="marca" />
    </Orbe>
    <span class="leading-none whitespace-nowrap truncate" :style="{ fontSize: `${Math.max(15, altura * 0.62)}px` }">{{ marca.nome }}</span>
  </span>
  <span v-else class="leading-none aberto whitespace-nowrap" :style="{ fontSize: `${altura * 0.72}px` }">{{ marca.nome || 'Sua marca' }}</span>
</template>
