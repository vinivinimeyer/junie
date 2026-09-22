<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import { brl, qtd, num1 } from '../../lib/formato'
import { lerInsumos, ligarRevenda } from '../../lib/quadro'
import { atualizarAlertas } from '../../lib/alertas'
import { avisar, avisarErro } from '../../lib/avisos'
import Palavras from '../../components/Palavras.vue'
import Vaso from '../../components/Vaso.vue'
import Tela from '../../components/Tela.vue'
import QuadroInsumos from '../../components/quadro/QuadroInsumos.vue'
import TelaInsumo from '../../components/estoque/TelaInsumo.vue'
import Comprar from '../../components/estoque/Comprar.vue'
import Historico from '../../components/estoque/Historico.vue'
import Contar from '../../components/estoque/Contar.vue'
import Fornecedores from '../../components/estoque/Fornecedores.vue'

const visao = ref(null)
const fornecedores = ref([])
const aba = ref('potes')
const aberto = ref(null)
const novos = ref(null)

async function carregar() {
  try {
    ;[visao.value, fornecedores.value] = await Promise.all([api.get('/estoque/visao'), api.get('/fornecedores')])
    atualizarAlertas()
  } catch (e) {
    avisarErro(e)
  }
}
onMounted(carregar)

const ORDEM = { zerado: 0, critico: 1, baixo: 2, ok: 3 }
const potes = computed(() => [...(visao.value?.itens ?? [])].sort((a, b) => ORDEM[a.status] - ORDEM[b.status] || a.nome.localeCompare(b.nome)))
const abas = computed(() => [
  { id: 'potes', rotulo: 'Potes' },
  { id: 'comprar', rotulo: 'Comprar', conta: visao.value?.resumo.emAlerta || undefined },
  { id: 'historico', rotulo: 'Histórico' },
  { id: 'contar', rotulo: 'Contar' },
  { id: 'fornecedores', rotulo: 'Fornecedores' },
])

const lista = (nomes) => (nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0])
/** O resumo em uma frase, no lugar de quatro indicadores. */
const frase = computed(() => {
  if (!visao.value) return ''
  const { itens, resumo } = visao.value
  const fim = itens.filter((i) => i.status === 'zerado' || i.status === 'critico').map((i) => i.nome)
  const baixo = itens.filter((i) => i.status === 'baixo').map((i) => i.nome)
  if (!fim.length && !baixo.length) return `Tudo em dia. ${brl(resumo.valorTotal)} na prateleira.`
  const partes = []
  if (fim.length) partes.push(`${lista(fim.slice(0, 3))}${fim.length > 3 ? ` e mais ${fim.length - 3}` : ''} ${fim.length > 1 ? 'estão' : 'está'} no fim.`)
  if (baixo.length) partes.push(`${lista(baixo.slice(0, 2))}${baixo.length > 2 ? ` e mais ${baixo.length - 2}` : ''} abaixo do mínimo.`)
  partes.push(`Repor custa ${brl(resumo.custoReposicao)}.`)
  return partes.join(' ')
})
const escala = (i) => Math.max(i.estoqueMinimo * 3, i.pontoDePedido * 2, i.quantidade, 1)
const PALAVRA = { zerado: 'acabou', critico: 'no fim', baixo: 'repor' }

async function guardarNovos() {
  try {
    for (const i of lerInsumos(novos.value).itens) {
      await api.post('/insumos', { nome: i.nome, unidade: i.unidade, quantidadeInicial: i.quantidade, estoqueMinimo: i.estoqueMinimo })
    }
    const [produtos, insumos] = await Promise.all([api.get('/produtos?ativos=1'), api.get('/insumos')])
    const ligados = await ligarRevenda(produtos, insumos)
    avisar(ligados ? `Guardado · ${ligados} de revenda ligados` : 'Guardado')
    novos.value = null
    carregar()
  } catch (e) {
    avisarErro(e)
  }
}
function depoisDeSalvar() {
  aberto.value = null
  carregar()
}
</script>

<template>
  <div class="flex-1 px-5 md:px-10 pt-8 pb-16">
    <p v-if="visao" class="text-2xl md:text-4xl leading-tight max-w-[34ch] mb-10" style="text-wrap: balance">{{ frase }}</p>
    <div v-else class="h-24 max-w-xl bg-tinta/10 mb-10" />

    <Palavras v-model="aba" :itens="abas" tamanho="text-lg md:text-xl" class="mb-8" />

    <template v-if="visao">
      <section v-if="aba === 'potes'">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-6 gap-y-10">
          <button v-for="i in potes" :key="i.id" class="palavra flex flex-col items-center text-center gap-2" @click="aberto = { insumo: i }">
            <Vaso :quantidade="i.quantidade" :minimo="i.estoqueMinimo" :escala="escala(i)" :status="i.status" :tamanho="112" />
            <span class="text-base leading-tight mt-1">{{ i.nome }}</span>
            <span class="text-sm numero" :class="i.status === 'ok' ? 'fraco' : i.status === 'baixo' ? 'text-destaque' : 'text-perigo'">
              {{ qtd(i.quantidade, i.unidade) }}<template v-if="i.coberturaDias !== null && i.quantidade > 0"> · {{ num1(i.coberturaDias) }} d</template>
              <template v-if="PALAVRA[i.status]"> · {{ PALAVRA[i.status] }}</template>
            </span>
          </button>
          <button class="palavra aspect-square w-28 mx-auto rounded-full flex items-center justify-center text-4xl" style="border: 3px dashed rgb(var(--tinta) / .4)" aria-label="Novos insumos" @click="novos = ''">+</button>
        </div>
        <p class="apagado text-sm mt-12 max-w-xl normal-case font-semibold">A linha tracejada é o mínimo. “d” é quantos dias dura no ritmo das últimas duas semanas.</p>
      </section>
      <Comprar v-else-if="aba === 'comprar'" :itens="visao.itens" @salvo="carregar" />
      <Historico v-else-if="aba === 'historico'" />
      <Contar v-else-if="aba === 'contar'" :itens="visao.itens" @salvo="carregar" />
      <Fornecedores v-else :fornecedores="fornecedores" @salvo="carregar" />
    </template>

    <TelaInsumo v-if="aberto" :insumo="aberto.insumo" :fornecedores="fornecedores" @fechar="aberto = null" @salvo="depoisDeSalvar" />

    <Tela v-if="novos !== null" rotulo="Novos insumos" @fechar="novos = null">
      <div class="px-5 md:px-10 pt-24 pb-16 flex flex-col gap-8">
        <p class="text-3xl">O que entrou na prateleira?</p>
        <QuadroInsumos v-model="novos" />
        <div class="flex justify-end">
          <button class="bloco h-16 px-8 text-xl aberto min-w-[60%] md:min-w-[22rem] flex items-center justify-between" :disabled="!novos.trim()" @click="guardarNovos">
            <span>Guardar</span><span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </Tela>
  </div>
</template>
