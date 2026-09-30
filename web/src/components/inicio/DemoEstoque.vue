<script setup>
import { vitrine, compras, statusDe, chegou } from '../../lib/vitrine'
import { brl, qtd } from '../../lib/formato'
import Vaso from '../Vaso.vue'

const ROTULO = { ok: 'Tranquilo', baixo: 'Repor', critico: 'Acabando', zerado: 'Acabou' }
const texto = (g, nome) =>
  `Olá, ${g.fornecedor}! Segue o pedido (${nome}):\n${g.itens.map((i) => `• ${qtd(i.sugestao, i.insumo.unidade)} de ${i.insumo.nome}`).join('\n')}\nObrigado!`

defineProps({ nome: { type: String, required: true } })
</script>

<template>
  <div class="flex flex-col gap-10">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
      <div v-for="i in vitrine.insumos" :key="i.id" class="flex flex-col items-center gap-2 text-center">
        <Vaso :quantidade="i.quantidade" :minimo="i.minimo" :escala="i.escala" :status="statusDe(i)" :tamanho="96" />
        <span class="text-[15px] leading-tight">{{ i.nome }}</span>
        <span class="text-[13px] numero leading-tight" :class="statusDe(i) === 'ok' ? 'apagado' : 'text-destaque'">
          {{ qtd(i.quantidade, i.unidade) }} · {{ ROTULO[statusDe(i)] }}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <p class="fraco text-[15px] px-2">Comprar</p>
      <TransitionGroup name="linha" tag="div" class="grid md:grid-cols-2 gap-3">
        <div v-for="g in compras" :key="g.fornecedor" class="quadro p-5 flex flex-col gap-4">
          <div class="flex items-baseline justify-between gap-4">
            <span class="text-lg truncate">{{ g.fornecedor }}</span>
            <span class="apagado numero text-[13px] shrink-0">{{ brl(g.total) }}</span>
          </div>
          <p class="text-[15px] leading-relaxed whitespace-pre-line fraco">{{ texto(g, nome) }}</p>
          <div class="flex flex-wrap gap-2 mt-auto">
            <span class="h-10 px-4 rounded-full bg-tinta text-chao text-[14px] inline-flex items-center" aria-hidden="true">WhatsApp →</span>
            <button
              v-for="i in g.itens"
              :key="i.insumo.id"
              class="pilula h-10 px-4 text-[14px]"
              @click="chegou(i)"
            >Chegou {{ i.insumo.nome.toLowerCase() }}</button>
          </div>
        </div>
      </TransitionGroup>
      <p v-if="!compras.length" class="text-[17px] px-2">Nada para comprar agora.</p>
    </div>
  </div>
</template>
