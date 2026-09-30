<script setup>
import { computed } from 'vue'
import { lerCardapio } from '../../lib/quadro'
import { brl } from '../../lib/formato'

const texto = defineModel({ type: String, required: true })
const lido = computed(() => lerCardapio(texto.value))
const total = computed(() => lido.value.reduce((s, c) => s + c.produtos.length, 0))
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
    <label class="block lg:sticky lg:top-6">
      <span class="sr-only">Cardápio</span>
      <textarea
        v-model="texto"
        spellcheck="false"
        rows="16"
        class="quadro min-h-[50vh] text-lg md:text-xl leading-[1.6] p-6 md:p-7"
        :placeholder="'CAFÉS\nEspresso 7\nCappuccino 14\n\nCOMIDAS\nPão de queijo 12'"
      />
      <span class="apagado text-[13px] mt-3 block px-2">Categoria numa linha, produtos embaixo com o preço no fim. Linha em branco separa.</span>
    </label>

    <div aria-live="polite">
      <p class="fraco text-[15px] mb-5 numero px-2">
        <span class="text-tinta">{{ lido.length }}</span> {{ lido.length === 1 ? 'categoria' : 'categorias' }},
        <span class="text-tinta">{{ total }}</span> {{ total === 1 ? 'produto' : 'produtos' }}
      </p>
      <TransitionGroup tag="div" name="linha" class="flex flex-col gap-6">
        <section v-for="c in lido" :key="c.nome">
          <h3 class="flex items-baseline justify-between px-2 mb-2">
            <span class="text-lg font-medium">{{ c.nome }}</span>
            <span class="apagado text-[13px] numero">{{ c.produtos.length }}</span>
          </h3>
          <p v-if="!c.produtos.length" class="apagado text-[15px] px-2">sem produtos ainda</p>
          <TransitionGroup tag="div" name="linha" class="flex flex-col gap-1">
            <div v-for="(p, i) in c.produtos" :key="`${i}-${p.nome}`" class="pilula h-11 px-5 flex items-center justify-between gap-4 text-[15px]">
              <span class="truncate">{{ p.nome }}</span>
              <span class="numero shrink-0 fraco">{{ brl(p.preco) }}</span>
            </div>
          </TransitionGroup>
        </section>
      </TransitionGroup>
    </div>
  </div>
</template>
