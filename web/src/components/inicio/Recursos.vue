<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { foco } from '../../lib/vitrine'

/**
 * Seção de produto: recursos em lista à esquerda, o recurso funcionando num
 * painel à direita. O ativo tem uma barra que enche e passa para o próximo;
 * tocar no painel ou escolher um item para o giro, porque aí a pessoa está usando.
 */
const props = defineProps({
  id: { type: String, required: true },
  titulo: { type: String, required: true },
  subtitulo: { type: String, required: true },
  itens: { type: Array, required: true },
  duracao: { type: Number, default: 8000 },
})

const reduzMovimento = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const ativo = ref(props.itens[0].id)
const parado = ref(reduzMovimento)
const visivel = ref(false)
const pairando = ref(false)
const secao = ref(null)
const atual = computed(() => props.itens.find((i) => i.id === ativo.value))

function proximo() {
  const i = props.itens.findIndex((x) => x.id === ativo.value)
  ativo.value = props.itens[(i + 1) % props.itens.length].id
}
function escolher(id) {
  ativo.value = id
  parado.value = true
}

// Outro pedaço da página pediu um recurso desta seção (ex.: "entrou no mínimo ↓").
watch(foco, (id) => {
  if (!id || !props.itens.some((i) => i.id === id)) return
  escolher(id)
  secao.value?.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' })
  foco.value = null
})

let observador
onMounted(() => {
  observador = new IntersectionObserver(([e]) => (visivel.value = e.isIntersecting), { threshold: 0.35 })
  observador.observe(secao.value)
})
onBeforeUnmount(() => observador?.disconnect())
</script>

<template>
  <section :id="id" ref="secao" class="px-5 md:px-8 lg:px-12 py-20 md:py-28 scroll-mt-6">
    <h2 class="text-4xl md:text-6xl leading-[1.02] max-w-[18ch]">
      {{ titulo }}
      <span class="block fraco">{{ subtitulo }}</span>
    </h2>

    <div class="mt-12 md:mt-16 grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] gap-10 lg:gap-16 items-center">
      <ol class="flex flex-col gap-1">
        <li v-for="item in itens" :key="item.id">
          <button
            class="w-full flex gap-5 text-left py-3 group"
            :aria-expanded="ativo === item.id"
            :aria-controls="`${id}-painel`"
            @click="escolher(item.id)"
          >
            <span class="relative w-1.5 shrink-0 flex justify-center" aria-hidden="true">
              <span v-if="ativo === item.id" class="trilho absolute inset-y-1 w-1 rounded-full overflow-hidden">
                <span
                  :key="item.id"
                  class="enche absolute inset-x-0 top-0 rounded-full bg-tinta"
                  :class="parado ? 'cheia' : visivel && !pairando ? 'correndo' : 'esperando'"
                  :style="{ animationDuration: `${duracao}ms` }"
                  @animationend="proximo"
                />
              </span>
              <span v-else class="mt-[0.7rem] w-1.5 h-1.5 rounded-full bg-tinta/30 transition-colors group-hover:bg-tinta/60" />
            </span>
            <span class="flex flex-col min-w-0">
              <span class="text-xl md:text-2xl transition-colors" :class="ativo === item.id ? '' : 'fraco group-hover:text-tinta'">{{ item.rotulo }}</span>
              <span class="abre grid" :class="ativo === item.id && 'aberta'">
                <span class="overflow-hidden">
                  <span class="block pt-2 fraco text-[16px] leading-snug max-w-[34ch]">{{ item.texto }}</span>
                </span>
              </span>
            </span>
          </button>
        </li>
      </ol>

      <div
        :id="`${id}-painel`"
        class="produto relative rounded-[28px] overflow-hidden min-h-[34rem] md:min-h-[38rem] p-5 md:p-10 flex flex-col"
        @mouseenter="pairando = true"
        @mouseleave="pairando = false"
        @pointerdown="parado = true"
        @focusin="parado = true"
      >
        <Transition name="surge" mode="out-in">
          <div :key="ativo" class="relative flex-1 flex flex-col justify-center min-w-0">
            <slot :name="ativo" />
          </div>
        </Transition>
        <p v-if="atual?.dica" class="relative mt-8 self-start pilula h-9 px-4 inline-flex items-center gap-2 text-[13px]">
          <span class="apagado">Experimente</span> {{ atual.dica }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* O painel é uma janela do app: superfície quieta com o horizonte da marca no pé. */
.produto {
  background:
    radial-gradient(80% 45% at 50% 115%, color-mix(in srgb, rgb(var(--destaque)) 26%, transparent), transparent 70%),
    radial-gradient(70% 50% at 50% 100%, color-mix(in srgb, rgb(var(--marca)) 30%, transparent), transparent 75%),
    rgb(var(--tinta) / 0.04);
  box-shadow: inset 0 0 0 1px rgb(var(--tinta) / 0.07);
}

.trilho { background: rgb(var(--tinta) / 0.15); }
.enche { height: 0; animation-name: enche; animation-timing-function: linear; animation-fill-mode: forwards; }
.enche.correndo { animation-play-state: running; }
.enche.esperando { animation-play-state: paused; }
.enche.cheia { animation: none; height: 100%; }
@keyframes enche { to { height: 100%; } }

.abre { grid-template-rows: 0fr; transition: grid-template-rows 0.35s var(--ease-out); }
.abre.aberta { grid-template-rows: 1fr; }
</style>
