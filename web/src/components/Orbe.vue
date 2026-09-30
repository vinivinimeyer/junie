<script setup>
import { computed } from 'vue'
import { misturar, MARCA_JUNIE } from '../lib/theme'

/**
 * O objeto central da interface: uma esfera de vidro com um entardecer dentro.
 * Céu na cor da marca, horizonte claro e um eclipse com borda na cor de
 * destaque. `claro` vira a esfera branca fosca, para números e contrapontos.
 * O eclipse respira devagar; com movimento reduzido, fica parado.
 */
const props = defineProps({
  marca: { type: Object, default: () => MARCA_JUNIE },
  /** Tamanho CSS (ex.: '18rem', 'min(78vw, 420px)'). */
  tamanho: { type: String, default: '16rem' },
  /** Semente: orbes diferentes da mesma marca não ficam iguais. */
  semente: { type: Number, default: 0 },
  claro: Boolean,
  parado: Boolean,
})

const fundo = computed(() => {
  if (props.claro) {
    return 'radial-gradient(circle at 34% 26%, #FFFFFF 0%, #F1F1F3 32%, #D9D9DE 68%, #B9B9C0 100%)'
  }
  const base = props.marca.corPrimaria ?? MARCA_JUNIE.corPrimaria
  const ceu = misturar(base, '#1C2036', 0.45)
  const alto = misturar(base, '#5E6688', 0.55)
  const nevoa = misturar(base, '#C8C6D0', 0.72)
  return `linear-gradient(180deg, ${ceu} 0%, ${alto} 34%, ${nevoa} 56%, #B9B2B6 64%, #2A2630 86%, #121116 100%)`
})

const eclipse = computed(() => {
  const d = props.marca.corDestaque ?? MARCA_JUNIE.corDestaque
  const brasa = misturar(d, '#000000', 0.35)
  const luz = misturar(d, '#FFFFFF', 0.35)
  return `radial-gradient(ellipse 46% 27% at 50% 78%, #060608 0%, #060608 50%, ${brasa} 60%, ${d} 68%, ${luz} 75%, transparent 88%)`
})

const deslocamento = computed(() => `${((props.semente * 37) % 9) - 4}%`)
</script>

<template>
  <div
    class="orbe relative rounded-full isolate shrink-0 select-none [container-type:size]"
    :class="claro ? 'text-[#111113]' : 'text-white'"
    :style="{ width: tamanho, height: tamanho, background: fundo }"
  >
    <template v-if="!claro">
      <div class="eclipse" :class="!parado && 'respira'" :style="{ background: eclipse, '--dx': deslocamento }" aria-hidden="true" />
      <div class="nevoa" aria-hidden="true" />
    </template>
    <div class="aro" aria-hidden="true" />
    <div class="relative z-10 h-full w-full flex flex-col items-center justify-center text-center p-[13%] pb-[22%]" :class="!claro && 'sombra-texto'">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.orbe {
  overflow: hidden;
  contain: paint;
}
.eclipse {
  position: absolute;
  inset: -6%;
  filter: blur(calc(1.2cqw + 2px));
  transform: translateX(var(--dx));
}
.nevoa {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 22% at 50% 60%, rgb(255 255 255 / 0.28), transparent 70%),
    radial-gradient(circle at 50% 0%, rgb(0 0 0 / 0.25), transparent 55%);
  pointer-events: none;
}
.aro {
  position: absolute;
  inset: 0;
  z-index: 20;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.32),
    inset 0 1.5px 3px rgb(255 255 255 / 0.4),
    inset 0 -0.8cqw 3cqw rgb(255 255 255 / 0.12),
    inset 0 0 6cqw rgb(0 0 0 / 0.18);
}
.sombra-texto { text-shadow: 0 1px 12px rgb(0 0 0 / 0.25); }
.respira { animation: respira 9s var(--ease-in-out, ease-in-out) infinite alternate; }
@keyframes respira {
  from { transform: translateX(var(--dx)) translateY(0) scale(1); }
  to { transform: translateX(var(--dx)) translateY(-3%) scale(1.07); }
}
@media (prefers-reduced-motion: reduce) {
  .respira { animation: none; }
}
</style>
