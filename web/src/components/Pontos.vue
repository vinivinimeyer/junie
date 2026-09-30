<script setup>
defineProps({ tamanho: { type: String, default: '1.25rem' } })
</script>

<template>
  <span class="pontos" :style="{ width: tamanho, height: tamanho }" aria-hidden="true"><i v-for="n in 8" :key="n" :style="{ '--n': n }" /></span>
</template>

<style scoped>
.pontos {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  animation: roda 1.6s steps(8) infinite;
}
.pontos i {
  position: absolute;
  inset: 0;
  transform: rotate(calc(var(--n) * 45deg));
}
.pontos i::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 0;
  width: 14%;
  height: 14%;
  min-width: 2px;
  min-height: 2px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: currentColor;
  opacity: calc(0.2 + var(--n) * 0.1);
}
@keyframes roda { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .pontos { animation: none; }
}
</style>
