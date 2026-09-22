<script setup>
/**
 * Abas como palavras grandes, em linha, rolando de lado no celular.
 * A ativa fica na tinta cheia; as outras, apagadas.
 */
defineProps({
  itens: { type: Array, required: true },
  modelValue: [String, Number],
  tamanho: { type: String, default: 'text-[26px] md:text-[32px]' },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <nav class="flex gap-6 md:gap-9 overflow-x-auto no-scrollbar -mx-5 px-5 md:mx-0 md:px-0" role="tablist">
    <button
      v-for="i in itens"
      :key="i.id"
      role="tab"
      :aria-selected="modelValue === i.id"
      class="relative whitespace-nowrap leading-none py-2 transition-opacity duration-150"
      :class="[tamanho, modelValue === i.id ? '' : 'apagado hover:opacity-70']"
      @click="emit('update:modelValue', i.id)"
    >
      {{ i.rotulo }}<sup v-if="i.conta" class="text-destaque text-[0.45em] ml-1 align-super numero">{{ i.conta }}</sup>
    </button>
  </nav>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
