<script setup>
/** Logo da marca; sem logo, o nome vira a assinatura (como o wordmark do Logico). */
defineProps({ marca: { type: Object, required: true }, altura: { type: Number, default: 28 } })
</script>

<template>
  <img v-if="marca.logo" :src="marca.logo" :alt="marca.nome" :style="{ height: `${altura}px` }" class="w-auto max-w-[160px] object-contain" />
  <span v-else class="leading-none aberto whitespace-nowrap" :style="{ fontSize: `${altura * 0.72}px` }">{{ marca.nome || 'Sua marca' }}</span>
</template>
