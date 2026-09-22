<script setup>
import { computed } from 'vue'
import { lerCardapio } from '../../lib/quadro'
import { brl } from '../../lib/formato'

const texto = defineModel({ type: String, required: true })
const lido = computed(() => lerCardapio(texto.value))
const total = computed(() => lido.value.reduce((s, c) => s + c.produtos.length, 0))
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-10 lg:gap-16">
    <label class="block">
      <span class="sr-only">Cardápio</span>
      <textarea
        v-model="texto"
        spellcheck="false"
        rows="16"
        class="w-full min-h-[50vh] bg-transparent text-tinta text-xl md:text-2xl leading-[1.55] font-bold resize-none outline-none rounded-r p-5"
        style="border: 4px solid rgb(var(--tinta))"
        :placeholder="'CAFÉS\nEspresso 7\nCappuccino 14\n\nCOMIDAS\nPão de queijo 12'"
      />
    </label>

    <div aria-live="polite">
      <p class="apagado text-sm aberto mb-6 numero">{{ lido.length }} categorias · {{ total }} produtos</p>
      <section v-for="c in lido" :key="c.nome" class="mb-8">
        <h3 class="regua text-2xl pb-2 mb-1">{{ c.nome }}</h3>
        <p v-if="!c.produtos.length" class="apagado py-2">sem produtos</p>
        <div v-for="p in c.produtos" :key="p.nome" class="flex justify-between gap-4 py-2 regua-fina">
          <span class="truncate">{{ p.nome }}</span>
          <span class="numero shrink-0">{{ brl(p.preco) }}</span>
        </div>
      </section>
    </div>
  </div>
</template>
