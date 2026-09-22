<script setup>
import { computed } from 'vue'
import { api } from '../../lib/api'
import { sessao } from '../../lib/sessao'
import { brl, qtd } from '../../lib/formato'
import { avisar, avisarErro } from '../../lib/avisos'

/** Pedido sugerido por fornecedor, pronto para mandar no WhatsApp. */
const props = defineProps({ itens: { type: Array, required: true } })
const emit = defineEmits(['salvo'])

const grupos = computed(() => {
  const mapa = new Map()
  for (const i of props.itens.filter((x) => x.sugestaoCompra > 0)) {
    const k = i.fornecedor?.id ?? 0
    const g = mapa.get(k) ?? { fornecedor: i.fornecedor, itens: [], total: 0 }
    g.itens.push(i)
    g.total += i.custoSugestao
    mapa.set(k, g)
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total)
})

const texto = (g) =>
  `Olá${g.fornecedor ? `, ${g.fornecedor.nome}` : ''}! Pedido da ${sessao.tenant.nome}:\n\n${g.itens.map((i) => `• ${qtd(i.sugestaoCompra, i.unidade)} de ${i.nome}`).join('\n')}\n\nObrigado!`
const whatsapp = (g) => `https://wa.me/55${g.fornecedor.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(texto(g))}`

async function copiar(g) {
  try {
    await navigator.clipboard.writeText(texto(g))
    avisar('Pedido copiado')
  } catch {
    avisar('Não deu para copiar', 'erro')
  }
}

async function chegou(i) {
  try {
    await api.post(`/insumos/${i.id}/movimentar`, { tipo: 'entrada', quantidade: i.sugestaoCompra, custoUnitario: i.custoUnitario })
    avisar(`${i.nome} · +${qtd(i.sugestaoCompra, i.unidade)}`)
    emit('salvo')
  } catch (e) {
    avisarErro(e)
  }
}
</script>

<template>
  <div class="max-w-4xl">
    <p v-if="!grupos.length" class="text-2xl">Nada para comprar agora.</p>
    <section v-for="g in grupos" :key="g.fornecedor?.id ?? 0" class="mb-14">
      <div class="regua pb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h3 class="text-2xl md:text-3xl">{{ g.fornecedor?.nome ?? 'Sem fornecedor' }}</h3>
        <div class="flex gap-6 text-lg">
          <button class="palavra" @click="copiar(g)">Copiar</button>
          <a v-if="g.fornecedor?.telefone" :href="whatsapp(g)" target="_blank" rel="noopener" class="palavra">WhatsApp →</a>
        </div>
      </div>
      <div v-for="i in g.itens" :key="i.id" class="flex items-baseline gap-4 py-4 regua-fina text-xl md:text-2xl">
        <span class="w-32 md:w-40 numero shrink-0">{{ qtd(i.sugestaoCompra, i.unidade) }}</span>
        <span class="flex-1 truncate" :class="['critico', 'zerado'].includes(i.status) && 'text-perigo'">{{ i.nome }}</span>
        <span class="fraco numero text-lg hidden sm:inline">{{ brl(i.custoSugestao) }}</span>
        <button class="palavra text-lg" @click="chegou(i)">Chegou</button>
      </div>
      <p class="text-right fraco text-lg mt-3 numero">{{ g.fornecedor ? `entrega em ${g.fornecedor.prazoEntregaDias} d · ` : '' }}{{ brl(g.total) }}</p>
    </section>
  </div>
</template>
