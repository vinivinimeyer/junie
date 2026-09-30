<script setup>
import { computed, ref } from 'vue'
import { vitrine, produtos, custoDe, mudarPreco } from '../../lib/vitrine'
import { brl, num1 } from '../../lib/formato'
import Palavras from '../Palavras.vue'

const escolhido = ref('cappuccino')
const produto = computed(() => produtos.value.find((p) => p.id === escolhido.value) ?? produtos.value[0])
const abas = computed(() => produtos.value.map((p) => ({ id: p.id, rotulo: p.nome })))
const insumo = (id) => vitrine.insumos.find((i) => i.id === id)
const custo = computed(() => (produto.value ? custoDe(produto.value) : 0))
const margem = computed(() => (produto.value?.preco > 0 ? ((produto.value.preco - custo.value) / produto.value.preco) * 100 : null))
</script>

<template>
  <div v-if="produto" class="flex flex-col gap-6">
    <Palavras v-model="escolhido" :itens="abas" />

    <div class="flex items-baseline gap-3 regua pb-3">
      <span class="text-3xl md:text-4xl font-medium truncate">{{ produto.nome }}</span>
      <label class="ml-auto flex items-baseline gap-2 shrink-0">
        <span class="fraco">R$</span>
        <input
          :value="produto.preco"
          type="number"
          step="0.5"
          min="0"
          aria-label="Preço"
          class="w-20 bg-transparent outline-none text-3xl font-medium numero text-right text-tinta"
          @input="mudarPreco(produto, $event.target.value)"
        />
      </label>
    </div>

    <div>
      <p class="fraco text-[15px] mb-1">Leva</p>
      <div v-for="f in produto.ficha" :key="f.insumo" class="flex items-baseline gap-4 py-3 regua-fina">
        <input
          v-model.number="f.quantidade"
          type="number"
          step="any"
          min="0"
          :aria-label="`Quantidade de ${insumo(f.insumo)?.nome}`"
          class="w-20 bg-transparent outline-none text-2xl font-medium numero text-right text-tinta"
        />
        <span class="w-8 fraco">{{ insumo(f.insumo)?.unidade }}</span>
        <span class="flex-1 truncate text-lg">{{ insumo(f.insumo)?.nome }}</span>
        <span class="fraco numero">{{ brl((Number(f.quantidade) || 0) * (insumo(f.insumo)?.custo ?? 0)) }}</span>
      </div>
      <p v-if="!produto.ficha.length" class="fraco text-[17px] py-3">Sem ficha, a venda não baixa estoque.</p>
    </div>

    <p class="text-2xl md:text-3xl leading-snug numero">
      Custa {{ brl(custo) }}<span class="fraco"> · </span>
      <span :class="margem !== null && margem < 30 ? 'text-perigo' : ''">margem {{ margem === null ? '—' : `${num1(margem)}%` }}</span>
    </p>
  </div>
</template>
