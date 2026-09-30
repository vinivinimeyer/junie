<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import Orbe from './Orbe.vue'
import LogoNoOrbe from './LogoNoOrbe.vue'
import Pontos from './Pontos.vue'

/**
 * Tela cheia enquanto algo grande acontece (criar a casa, montar o cardápio).
 * As etapas avançam no ritmo próprio e param na última até `aberto` virar false.
 */
const props = defineProps({
  aberto: Boolean,
  marca: { type: Object, default: undefined },
  titulo: { type: String, required: true },
  etapas: { type: Array, required: true },
  ritmo: { type: Number, default: 750 },
})

const atual = ref(0)
let relogio
watch(
  () => props.aberto,
  (sim) => {
    clearInterval(relogio)
    atual.value = 0
    if (!sim) return
    relogio = setInterval(() => {
      if (atual.value < props.etapas.length - 1) atual.value++
      else clearInterval(relogio)
    }, props.ritmo)
  },
  { immediate: true }
)
onBeforeUnmount(() => clearInterval(relogio))
</script>

<template>
  <Teleport to="body">
    <Transition name="cobre">
      <div v-if="aberto" class="fixed inset-0 z-50 bg-chao text-tinta flex flex-col items-center justify-center gap-10 px-6" style="--oy: 50%" role="status" aria-live="polite">
        <div class="relative criando-orbe">
          <svg class="anel" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="48.5" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width=".6" />
            <circle cx="50" cy="50" r="48.5" fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round" stroke-dasharray="38 267" />
          </svg>
          <Orbe :marca="marca" tamanho="min(62vw, 42vh, 19rem)">
            <LogoNoOrbe v-if="marca?.logo" :marca="marca" />
            <span v-else class="text-2xl md:text-3xl leading-tight font-medium">{{ marca?.nome }}</span>
          </Orbe>
        </div>

        <div class="w-full max-w-sm flex flex-col gap-5">
          <p class="text-xl md:text-2xl font-medium text-center">{{ titulo }}</p>
          <ol class="flex flex-col gap-1.5">
            <li
              v-for="(e, i) in etapas"
              :key="e"
              class="etapa pilula h-12 px-4 flex items-center gap-3 text-[15px]"
              :class="[i === atual && 'pilula-ativa', i > atual && 'opacity-40']"
              :style="{ '--i': i }"
            >
              <span class="w-5 h-5 flex items-center justify-center shrink-0">
                <svg v-if="i < atual" viewBox="0 0 20 20" class="w-5 h-5 feito" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" fill="currentColor" />
                  <path d="M6 10.4l2.6 2.6L14 7.6" fill="none" stroke="rgb(var(--chao))" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <Pontos v-else-if="i === atual" tamanho="1.05rem" />
                <span v-else class="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              </span>
              <span>{{ e }}</span>
            </li>
          </ol>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.criando-orbe { animation: chega 0.7s var(--ease-out) both; }
.anel {
  position: absolute;
  inset: -1.1rem;
  width: calc(100% + 2.2rem);
  height: calc(100% + 2.2rem);
  animation: gira 2.4s linear infinite;
}
.etapa {
  transition: background-color 0.25s var(--ease-out), opacity 0.25s var(--ease-out);
  animation: sobe 0.5s var(--ease-out) both;
  animation-delay: calc(0.15s + var(--i) * 60ms);
}
.feito { animation: marca 0.32s var(--ease-out) both; }
@keyframes chega { from { opacity: 0; transform: scale(0.86); filter: blur(8px); } }
@keyframes gira { to { transform: rotate(360deg); } }
@keyframes sobe { from { opacity: 0; transform: translateY(8px); } }
@keyframes marca { from { transform: scale(0.4); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .anel { animation: none; }
}
</style>
