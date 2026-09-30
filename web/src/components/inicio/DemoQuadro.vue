<script setup>
import { computed } from 'vue'
import { vitrine, cardapio, categoria } from '../../lib/vitrine'
import { brl } from '../../lib/formato'

/** Categorias e produtos numa lista só, para a TransitionGroup animar cada linha. */
const linhas = computed(() =>
  cardapio.value.flatMap((c) => [
    { chave: `c-${c.nome}`, categoria: categoria(c.nome) },
    ...c.produtos.map((p) => ({ chave: `p-${c.nome}-${p.nome}`, ...p })),
  ])
)
</script>

<template>
  <div class="grid md:grid-cols-2 gap-4">
    <label class="flex flex-col gap-2">
      <span class="apagado text-[13px] px-2">O quadro</span>
      <textarea
        v-model="vitrine.texto"
        rows="11"
        spellcheck="false"
        aria-label="Cardápio escrito como no quadro"
        class="quadro px-6 py-5 text-[17px] leading-[1.7] numero"
      />
    </label>

    <div class="flex flex-col gap-2">
      <span class="apagado text-[13px] px-2">O cardápio</span>
      <TransitionGroup name="linha" tag="div" class="flex flex-col gap-2">
        <template v-for="l in linhas" :key="l.chave">
          <p v-if="l.categoria" class="fraco text-[13px] px-5 pt-2">{{ l.categoria }}</p>
          <div v-else class="pilula h-14 px-5 flex items-center gap-4 min-w-0">
            <span class="truncate text-[15px]">{{ l.nome }}</span>
            <span class="ml-auto numero text-[15px]">{{ brl(l.preco).replace(',00', '') }}</span>
          </div>
        </template>
      </TransitionGroup>
      <p v-if="!linhas.length" class="fraco text-[15px] px-5 pt-2">Escreva uma linha com nome e preço.</p>
    </div>
  </div>
</template>
