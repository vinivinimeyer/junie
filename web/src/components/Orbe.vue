<script setup>
import { computed } from 'vue'
import { misturar, tintaPara, MARCA_JUNIE } from '../lib/theme'

/**
 * O objeto central da interface: um círculo com a luz das cores da marca.
 * As manchas giram devagar; a casca é vidro (brilho + borda interna).
 * Com movimento reduzido, fica parado.
 */
const props = defineProps({
  marca: { type: Object, default: () => MARCA_JUNIE },
  /** Tamanho CSS (ex.: '18rem', 'min(78vw, 420px)'). */
  tamanho: { type: String, default: '16rem' },
  /** Semente: orbes diferentes da mesma marca não ficam iguais. */
  semente: { type: Number, default: 0 },
  parado: Boolean,
})

const cores = computed(() => {
  const base = props.marca.corPrimaria ?? MARCA_JUNIE.corPrimaria
  const destaque = props.marca.corDestaque ?? MARCA_JUNIE.corDestaque
  return {
    base,
    claro: misturar(base, '#FFFFFF', 0.55),
    nevoa: misturar(base, '#FFFFFF', 0.82),
    destaque,
    fundo: misturar(base, '#000000', 0.35),
  }
})

const ang = computed(() => (props.semente * 137) % 360)
const fundo = computed(() => {
  const c = cores.value
  return [
    `radial-gradient(circle at 28% 24%, ${c.nevoa} 0%, transparent 42%)`,
    `radial-gradient(circle at 78% 72%, ${c.destaque} 0%, transparent 46%)`,
    `radial-gradient(circle at 18% 86%, ${c.fundo} 0%, transparent 50%)`,
    `radial-gradient(circle at 60% 40%, ${c.claro} 0%, ${c.base} 70%)`,
  ].join(',')
})
const manchas = computed(() => {
  const c = cores.value
  return `conic-gradient(from ${ang.value}deg at 50% 50%, ${c.claro}, ${c.base}, ${c.destaque}, ${c.nevoa}, ${c.base}, ${c.claro})`
})
const texto = computed(() => tintaPara(misturar(cores.value.base, '#FFFFFF', 0.3)))
</script>

<template>
  <div
    class="orbe relative rounded-full isolate shrink-0 select-none [container-type:size]"
    :style="{ width: tamanho, height: tamanho, background: fundo, color: texto }"
  >
    <div class="manchas absolute -inset-1/4 opacity-55 mix-blend-soft-light" :class="!parado && 'gira'" :style="{ background: manchas }" />
    <div class="grao absolute inset-0 opacity-[.16] mix-blend-overlay pointer-events-none" />
    <div class="lente pointer-events-none" aria-hidden="true" />
    <div class="brilho pointer-events-none" :class="!parado && 'anda'" aria-hidden="true" />
    <div class="relative z-10 h-full w-full flex flex-col items-center justify-center text-center p-[12%]">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.orbe {
  overflow: hidden;
  contain: paint;
  outline: 1px solid rgb(255 255 255 / 0.28);
  outline-offset: -1px;
  box-shadow:
    inset 0 1px 2px rgb(255 255 255 / 0.35),
    inset 0 -12px 22px rgb(0 0 0 / 0.22);
}
.manchas { filter: blur(28px); }
.gira { animation: gira 38s linear infinite; }
@keyframes gira { to { transform: rotate(360deg); } }
.grao {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.lente {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  background: radial-gradient(circle at 30% 18%, rgb(255 255 255 / 0.38), transparent 32%);
  pointer-events: none;
}
.brilho {
  position: absolute;
  inset: -40%;
  z-index: 2;
  background: conic-gradient(from 200deg, transparent 0 74%, rgb(255 255 255 / 0.55) 77%, transparent 80%);
  opacity: 0.45;
  pointer-events: none;
}
.anda { animation: anda 18s linear infinite; }
@keyframes anda { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .gira, .anda { animation: none; }
}
</style>
