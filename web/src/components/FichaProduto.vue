<script setup>
import { computed, reactive, ref } from 'vue'
import { api } from '../lib/api'
import { brl, num1, UNIDADES } from '../lib/formato'
import { avisarErro } from '../lib/avisos'
import Tela from './Tela.vue'

/** Produto + ficha técnica. Custo e margem mudam enquanto a pessoa digita. */
const props = defineProps({
  produto: { type: Object, required: true },
  categorias: { type: Array, required: true },
  insumos: { type: Array, required: true },
})
const emit = defineEmits(['fechar', 'salvo', 'insumo-criado'])

const form = reactive({
  nome: props.produto.nome,
  preco: props.produto.preco,
  categoriaId: props.produto.categoriaId,
  ficha: (props.produto.ficha ?? []).map((f) => ({ insumoId: f.insumoId, quantidade: f.quantidade })),
})
const novo = ref(null)
const salvando = ref(false)

const porId = computed(() => new Map(props.insumos.map((i) => [i.id, i])))
const livres = computed(() => props.insumos.filter((i) => !form.ficha.some((f) => f.insumoId === i.id)))
const custo = computed(() =>
  form.ficha.length
    ? form.ficha.reduce((s, f) => s + (Number(f.quantidade) || 0) * (porId.value.get(f.insumoId)?.custoUnitario ?? 0), 0)
    : props.produto.custoManual ?? 0
)
const margem = computed(() => (Number(form.preco) > 0 ? ((Number(form.preco) - custo.value) / Number(form.preco)) * 100 : null))

function adicionar(valor) {
  if (valor === 'novo') novo.value = { nome: '', unidade: 'g', custoUnitario: '' }
  else if (valor) form.ficha.push({ insumoId: Number(valor), quantidade: '' })
}

async function criarInsumo() {
  try {
    const criado = await api.post('/insumos', { nome: novo.value.nome, unidade: novo.value.unidade, custoUnitario: Number(novo.value.custoUnitario) || 0 })
    emit('insumo-criado', criado)
    form.ficha.push({ insumoId: criado.id, quantidade: '' })
    novo.value = null
  } catch (e) {
    avisarErro(e)
  }
}

async function salvar() {
  salvando.value = true
  try {
    const salvo = await api.put(`/produtos/${props.produto.id}`, {
      nome: form.nome,
      preco: Number(form.preco),
      categoriaId: form.categoriaId,
      ficha: form.ficha.filter((f) => Number(f.quantidade) > 0).map((f) => ({ insumoId: f.insumoId, quantidade: Number(f.quantidade) })),
    })
    emit('salvo', salvo)
  } catch (e) {
    avisarErro(e)
    salvando.value = false
  }
}

async function arquivar() {
  try {
    await api.del(`/produtos/${props.produto.id}`)
    emit('salvo')
  } catch (e) {
    avisarErro(e)
  }
}
</script>

<template>
  <Tela :rotulo="produto.nome" @fechar="emit('fechar')">
    <div class="max-w-3xl mx-auto px-5 md:px-10 pt-20 pb-40">
      <input v-model="form.nome" aria-label="Nome" class="w-full bg-transparent regua outline-none text-4xl md:text-6xl pb-3 uppercase font-bold text-tinta" />

      <div class="flex flex-wrap items-baseline gap-x-6 gap-y-3 mt-6 text-xl">
        <label class="flex items-baseline gap-2">
          <span class="fraco">R$</span>
          <input v-model="form.preco" type="number" step="0.01" min="0" aria-label="Preço" class="w-28 bg-transparent regua outline-none text-3xl font-bold numero text-tinta" />
        </label>
        <button
          v-for="c in categorias"
          :key="c.id"
          class="transition-opacity"
          :class="form.categoriaId === c.id ? '' : 'apagado hover:opacity-70'"
          @click="form.categoriaId = c.id"
        >{{ c.nome }}</button>
      </div>

      <h2 class="text-2xl mt-14 mb-2">Leva</h2>
      <div v-for="(l, i) in form.ficha" :key="l.insumoId" class="flex items-baseline gap-4 py-3 regua-fina">
        <input v-model="l.quantidade" type="number" step="any" min="0" placeholder="0" :aria-label="`Quantidade de ${porId.get(l.insumoId)?.nome}`" class="w-24 bg-transparent outline-none text-2xl font-bold numero text-right text-tinta" />
        <span class="w-10 fraco">{{ porId.get(l.insumoId)?.unidade }}</span>
        <span class="flex-1 truncate text-lg">{{ porId.get(l.insumoId)?.nome }}</span>
        <span class="fraco numero">{{ brl((Number(l.quantidade) || 0) * (porId.get(l.insumoId)?.custoUnitario ?? 0)) }}</span>
        <button class="palavra fraco" :aria-label="`Tirar ${porId.get(l.insumoId)?.nome}`" @click="form.ficha.splice(i, 1)">✕</button>
      </div>

      <div v-if="novo" class="flex flex-wrap items-end gap-3 mt-4">
        <input v-model="novo.nome" class="campo flex-1 min-w-[12rem]" placeholder="novo insumo" aria-label="Nome do insumo" />
        <select v-model="novo.unidade" class="campo w-24" aria-label="Unidade">
          <option v-for="u in UNIDADES" :key="u.valor" :value="u.valor">{{ u.valor }}</option>
        </select>
        <input v-model="novo.custoUnitario" type="number" step="any" min="0" class="campo w-36" :placeholder="`R$ por ${novo.unidade}`" aria-label="Custo" />
        <button class="bloco h-14 px-6 aberto" :disabled="!novo.nome" @click="criarInsumo">Criar</button>
      </div>
      <select v-else class="mt-4 bg-transparent text-lg aberto text-tinta outline-none cursor-pointer uppercase font-bold" :value="''" aria-label="Adicionar insumo" @change="adicionar($event.target.value); $event.target.value = ''">
        <option value="" disabled>+ insumo</option>
        <option v-for="i in livres" :key="i.id" :value="i.id">{{ i.nome }}</option>
        <option value="novo">+ novo insumo</option>
      </select>

      <p class="text-2xl md:text-3xl mt-14 leading-snug numero">
        Custa {{ brl(custo) }}<span class="fraco"> · </span>
        <span :class="margem !== null && margem < 30 ? 'text-perigo' : ''">margem {{ margem === null ? '—' : `${num1(margem)}%` }}</span>
      </p>
      <p v-if="!form.ficha.length" class="fraco mt-2">Sem ficha, a venda não baixa estoque.</p>
    </div>

    <div class="fixed bottom-0 inset-x-0 flex">
      <button class="palavra px-5 md:px-10 text-lg fraco" @click="arquivar">Arquivar</button>
      <button class="bloco flex-1 h-20 px-6 md:px-10 text-xl md:text-2xl aberto text-left flex items-center justify-between rounded-none" :disabled="salvando || !form.nome" @click="salvar">
        <span>{{ salvando ? 'Salvando…' : 'Salvar' }}</span><span aria-hidden="true">→</span>
      </button>
    </div>
  </Tela>
</template>
