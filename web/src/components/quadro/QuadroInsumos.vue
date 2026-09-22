<script setup>
import { computed } from 'vue'
import { lerInsumos } from '../../lib/quadro'
import { qtd } from '../../lib/formato'
import Vaso from '../Vaso.vue'

const texto = defineModel({ type: String, required: true })
const lido = computed(() => lerInsumos(texto.value))
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-10 lg:gap-16">
    <label class="block">
      <span class="sr-only">Insumos</span>
      <textarea
        v-model="texto"
        spellcheck="false"
        rows="12"
        class="w-full min-h-[40vh] bg-transparent text-tinta text-xl md:text-2xl leading-[1.55] font-bold resize-none outline-none rounded-r p-5"
        style="border: 4px solid rgb(var(--tinta))"
        :placeholder="'Leite integral 12 l\nCafé em grão 3 kg\nCopo 300 ml 150 un mín 50'"
      />
    </label>

    <div aria-live="polite">
      <div class="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-6">
        <div v-for="i in lido.itens" :key="i.nome" class="flex flex-col items-center text-center gap-2">
          <Vaso :quantidade="i.quantidade" :minimo="i.estoqueMinimo" :escala="Math.max(i.quantidade, i.estoqueMinimo * 3)" :tamanho="72" />
          <span class="text-xs leading-tight">{{ i.nome }}</span>
          <span class="text-xs fraco numero">{{ qtd(i.quantidade, i.unidade) }}</span>
        </div>
      </div>
      <p v-for="l in lido.ignoradas" :key="l" class="text-perigo text-sm mt-4">
        Não entendi “{{ l }}”. Escreva nome, quantidade e unidade (un, g, kg, ml, l).
      </p>
    </div>
  </div>
</template>
