<script setup>
import { computed, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { vitrine, produtos, itens, total, mudar, vender, mostrar } from '../../lib/vitrine'
import { payloadPix } from '../../lib/pix'
import { brl } from '../../lib/formato'
import Palavras from '../Palavras.vue'

const props = defineProps({ marca: { type: Object, required: true } })

const aba = ref('tudo')
const abas = computed(() => [{ id: 'tudo', rotulo: 'Tudo' }, ...[...new Set(produtos.value.map((p) => p.categoria))].map((c) => ({ id: c, rotulo: c }))])
const visiveis = computed(() => (aba.value === 'tudo' ? produtos.value : produtos.value.filter((p) => p.categoria === aba.value)))
watch(abas, (a) => !a.some((x) => x.id === aba.value) && (aba.value = 'tudo'))

const pix = ref(null)
const feito = ref(null)

async function abrirPix() {
  const codigo = payloadPix({ chave: 'contato@junie.app', nome: props.marca.nome, cidade: 'Sao Paulo', valor: total.value })
  pix.value = await QRCode.toDataURL(codigo, { margin: 1, width: 320 })
}

function cobrar(forma) {
  const valor = total.value
  vender(forma)
  pix.value = null
  feito.value = { valor, alerta: vitrine.alerta }
}
watch(() => itens.value.length, (n) => n && (feito.value = null))
</script>

<template>
  <div class="flex flex-col gap-4">
    <Palavras v-model="aba" :itens="abas" />

    <ul class="flex flex-col gap-2">
      <li v-for="p in visiveis" :key="p.id" class="flex items-center gap-2">
        <button
          class="pilula flex-1 flex items-center gap-4 h-16 px-6 min-w-0 text-left"
          :class="vitrine.carrinho[p.id] && 'pilula-ativa'"
          @click="mudar(p, 1)"
        >
          <span class="w-5 shrink-0 numero" :class="!vitrine.carrinho[p.id] && 'apagado'">{{ vitrine.carrinho[p.id] ?? '+' }}</span>
          <span class="truncate">{{ p.nome }}</span>
          <span class="ml-auto numero">{{ brl(p.preco).replace('R$', '').replace(',00', '').trim() }}</span>
        </button>
        <button
          class="pilula w-16 h-16 rounded-full text-2xl leading-none shrink-0"
          :class="!vitrine.carrinho[p.id] && 'invisible'"
          :aria-label="`Tirar um ${p.nome}`"
          @click="mudar(p, -1)"
        >−</button>
      </li>
    </ul>

    <Transition name="surge" mode="out-in">
      <!-- Pix: o QR sai com a chave e o valor, na cor da casa -->
      <div v-if="pix" key="pix" class="rounded-[2rem] p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6 text-white" style="background: rgb(var(--marca))">
        <img :src="pix" alt="QR Code Pix de exemplo" class="w-44 h-44 bg-white p-3 rounded-[1.25rem] shrink-0" />
        <div class="flex flex-col items-center sm:items-start gap-4 text-center sm:text-left">
          <span class="text-4xl numero font-medium leading-none">{{ brl(total) }}</span>
          <span class="text-[15px] opacity-75 max-w-[26ch]">Pix Copia e Cola com a chave da casa. Nada de maquininha no meio.</span>
          <span class="flex gap-2">
            <button class="h-11 px-5 rounded-full bg-white text-[#111113] text-[15px]" @click="cobrar('pix')">Pix recebido →</button>
            <button class="h-11 px-4 rounded-full text-[15px] opacity-75 palavra" @click="pix = null">Voltar</button>
          </span>
        </div>
      </div>

      <div v-else-if="itens.length" key="total" class="bg-tinta text-chao rounded-[2rem] p-5 flex flex-wrap items-center justify-between gap-4">
        <span class="text-4xl numero font-medium leading-none">{{ brl(total).replace(',00', '') }}</span>
        <span class="flex gap-2 text-[15px]">
          <button class="h-11 px-5 rounded-full bg-chao text-tinta transition-opacity hover:opacity-85" @click="cobrar('cartao')">Cartão</button>
          <button class="h-11 px-5 rounded-full bg-chao/10 transition-colors hover:bg-chao/20" @click="abrirPix">Pix</button>
        </span>
      </div>

      <div v-else-if="feito" key="feito" class="pilula min-h-16 px-6 py-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]" role="status">
        <span>Venda de {{ brl(feito.valor) }} registrada.</span>
        <button v-if="feito.alerta.length" class="palavra text-destaque" @click="mostrar('estoque')">{{ feito.alerta.join(' e ') }} {{ feito.alerta.length > 1 ? 'entraram' : 'entrou' }} no mínimo →</button>
        <button v-else class="palavra fraco" @click="mostrar('cozinha')">Já está na cozinha →</button>
      </div>

      <p v-else key="vazio" class="apagado text-[15px] px-6 h-16 flex items-center">Toque num produto para somar.</p>
    </Transition>
  </div>
</template>
