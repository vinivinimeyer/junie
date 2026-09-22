<script setup>
import { computed } from 'vue'

/**
 * Logo enquadrada no círculo: escala e deslocamento vêm da marca
 * (ajustados no onboarding). O recorte é o próprio orbe.
 */
const props = defineProps({
  marca: { type: Object, required: true },
})

const estilo = computed(() => ({
  '--lx': Number(props.marca.logoX) || 0,
  '--ly': Number(props.marca.logoY) || 0,
  '--ls': Number(props.marca.logoEscala) > 0 ? Number(props.marca.logoEscala) : 1,
}))
</script>

<template>
  <img
    :src="marca.logo"
    :alt="marca.nome || ''"
    draggable="false"
    class="logo-no-orbe pointer-events-none select-none object-contain"
    :style="estilo"
  />
</template>

<style scoped>
.logo-no-orbe {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 58%;
  width: 58cqw;
  max-width: none;
  height: auto;
  transform: translate(-50%, -50%) translate(calc(var(--lx) * 1.72%), calc(var(--ly) * 1.72%)) scale(var(--ls));
  transform: translate(-50%, -50%) translate(calc(var(--lx) * 1cqw), calc(var(--ly) * 1cqh)) scale(var(--ls));
}
</style>
