<script setup>
import Orbe from '../Orbe.vue'

defineProps({
  exemplos: { type: Array, required: true },
  atual: { type: Number, required: true },
})
const emit = defineEmits(['escolher'])

const RITUAL = ['Como se chama?', 'Qual é a cor?', 'A logo no círculo', 'Qual a letra?', 'Quem cuida?']
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6" role="radiogroup" aria-label="Marca de exemplo">
      <button
        v-for="(m, i) in exemplos"
        :key="m.nome"
        role="radio"
        :aria-checked="i === atual"
        class="flex flex-col items-center gap-3 transition-opacity duration-200"
        :class="i === atual ? '' : 'opacity-45 hover:opacity-80'"
        @click="emit('escolher', i)"
      >
        <Orbe :marca="m" :semente="i" tamanho="min(36vw, 9.5rem)" :parado="i !== atual">
          <span class="text-[clamp(1.4rem,20cqw,2.6rem)] leading-none">{{ m.nome[0] }}</span>
        </Orbe>
        <span class="text-[15px]">{{ m.nome }}</span>
      </button>
    </div>

    <ol class="flex flex-wrap gap-2">
      <li v-for="(p, i) in RITUAL" :key="p" class="pilula h-12 pl-1.5 pr-5 flex items-center gap-3 text-[15px]">
        <span class="w-9 h-9 rounded-full vidro-disco flex items-center justify-center text-[13px] numero fraco">{{ i + 1 }}</span>
        {{ p }}
      </li>
    </ol>
  </div>
</template>
