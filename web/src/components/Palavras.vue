<script setup>
/**
 * Abas em pílula, em linha, rolando de lado no celular.
 * A ativa ganha a superfície clara; as outras ficam no texto secundário.
 */
defineProps({
  itens: { type: Array, required: true },
  modelValue: [String, Number],
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <nav class="flex md:flex-wrap gap-1.5 overflow-x-auto md:overflow-visible no-scrollbar -mx-5 px-5 md:mx-0 md:px-0" role="tablist">
    <button
      v-for="i in itens"
      :key="i.id"
      role="tab"
      :aria-selected="modelValue === i.id"
      class="relative whitespace-nowrap rounded-full h-10 px-4 text-[15px] transition-colors duration-150"
      :class="modelValue === i.id ? 'pilula-ativa text-tinta' : 'fraco hover:text-tinta'"
      @click="emit('update:modelValue', i.id)"
    >
      {{ i.rotulo }}<sup v-if="i.conta" class="text-destaque text-[0.7em] ml-1 align-super numero">{{ i.conta }}</sup>
    </button>
  </nav>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
