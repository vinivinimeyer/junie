<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import { cardapioComoTexto, salvarCardapio } from '../../lib/quadro'
import { brl, num1 } from '../../lib/formato'
import { avisar, avisarErro } from '../../lib/avisos'
import QuadroCardapio from '../../components/quadro/QuadroCardapio.vue'
import FichaProduto from '../../components/FichaProduto.vue'

const dados = ref({ categorias: [], produtos: [], insumos: [] })
const texto = ref('')
const original = ref('')
const ficha = ref(null)
const salvando = ref(false)
const modo = ref('quadro')

async function recarregar() {
  const [categorias, produtos, insumos] = await Promise.all([api.get('/categorias'), api.get('/produtos?ativos=1'), api.get('/insumos')])
  dados.value = { categorias, produtos, insumos }
  texto.value = original.value = cardapioComoTexto(categorias, produtos)
}
onMounted(() => recarregar().catch(avisarErro))

const mudou = computed(() => texto.value.trim() !== original.value.trim())
const comProdutos = computed(() => dados.value.categorias.filter((c) => dados.value.produtos.some((p) => p.categoriaId === c.id)))

async function salvar() {
  salvando.value = true
  try {
    await salvarCardapio(texto.value, dados.value)
    await recarregar()
    avisar('Cardápio atualizado')
  } catch (e) {
    avisarErro(e)
  } finally {
    salvando.value = false
  }
}

async function alternarCozinha(c) {
  try {
    await api.put(`/categorias/${c.id}`, { nome: c.nome, ordem: c.ordem, enviaCozinha: !c.enviaCozinha })
    await recarregar()
  } catch (e) {
    avisarErro(e)
  }
}
</script>

<template>
  <div class="flex-1 px-5 md:px-10 pt-8 pb-40">
    <div class="flex gap-8 text-lg md:text-xl mb-10" role="tablist">
      <button role="tab" :aria-selected="modo === 'quadro'" :class="modo !== 'quadro' && 'apagado hover:opacity-70'" @click="modo = 'quadro'">Quadro</button>
      <button role="tab" :aria-selected="modo === 'fichas'" :class="modo !== 'fichas' && 'apagado hover:opacity-70'" @click="modo = 'fichas'">O que cada um leva</button>
    </div>

    <QuadroCardapio v-if="modo === 'quadro'" v-model="texto" />

    <div v-else class="max-w-4xl">
      <section v-for="c in comProdutos" :key="c.id" class="mb-12">
        <div class="regua pb-3 flex items-baseline justify-between gap-4">
          <h2 class="text-2xl md:text-3xl">{{ c.nome }}</h2>
          <button class="palavra text-base" :title="'Trocar destino'" @click="alternarCozinha(c)">{{ c.enviaCozinha ? 'vai p/ cozinha' : 'sai do balcão' }}</button>
        </div>
        <button v-for="p in dados.produtos.filter((x) => x.categoriaId === c.id)" :key="p.id" class="palavra w-full flex items-baseline gap-4 py-4 regua-fina text-xl" @click="ficha = p">
          <span class="flex-1 truncate">{{ p.nome }}</span>
          <span class="text-sm" :class="p.ficha.length ? 'fraco' : 'text-destaque'">{{ p.ficha.length ? `${p.ficha.length} insumo${p.ficha.length > 1 ? 's' : ''}` : 'sem ficha' }}</span>
          <span class="numero w-24 text-right" :class="p.margem !== null && p.margem < 30 && 'text-perigo'">{{ p.margem === null ? '' : `${num1(p.margem)}%` }}</span>
          <span class="numero w-24 text-right">{{ brl(p.preco) }}</span>
        </button>
      </section>
    </div>

    <Transition name="surge">
      <div v-if="modo === 'quadro' && mudou" class="fixed inset-x-0 bottom-0 z-30 bg-tinta text-chao px-5 md:px-10 py-6 flex items-center justify-between gap-6">
        <button class="palavra text-lg opacity-70" @click="texto = original">Desfazer</button>
        <button class="palavra text-2xl" :disabled="salvando" @click="salvar">{{ salvando ? 'Salvando…' : 'Salvar cardápio →' }}</button>
      </div>
    </Transition>

    <FichaProduto
      v-if="ficha"
      :produto="ficha"
      :categorias="dados.categorias"
      :insumos="dados.insumos"
      @fechar="ficha = null"
      @insumo-criado="recarregar"
      @salvo="ficha = null; recarregar()"
    />
  </div>
</template>
