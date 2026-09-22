<script setup>
import { computed, reactive, ref } from 'vue'
import { api } from '../../lib/api'
import { brl, qtd, num1 } from '../../lib/formato'
import { avisar, avisarErro } from '../../lib/avisos'
import Tela from '../Tela.vue'
import Vaso from '../Vaso.vue'

/** Um insumo: o pote grande, o que dá para fazer com ele e os ajustes. */
const props = defineProps({
  insumo: { type: Object, required: true },
  fornecedores: { type: Array, default: () => [] },
  tipo: { type: String, default: 'entrada' },
  quantidade: Number,
})
const emit = defineEmits(['fechar', 'salvo'])

const TIPOS = [['entrada', 'Chegou'], ['perda', 'Perdi'], ['ajuste', 'Contei']]
const MOTIVOS = ['Venceu', 'Quebrou', 'Erro no preparo', 'Equipe']
const form = reactive({ tipo: props.tipo, quantidade: props.quantidade ?? '', custo: props.insumo.custoUnitario, motivo: '' })
const ajustes = reactive({ estoqueMinimo: props.insumo.estoqueMinimo, custoUnitario: props.insumo.custoUnitario, fornecedorId: props.insumo.fornecedorId ?? '' })
const salvando = ref(false)

const q = computed(() => Number(form.quantidade) || 0)
const depois = computed(() => (form.tipo === 'entrada' ? props.insumo.quantidade + q.value : form.tipo === 'perda' ? props.insumo.quantidade - q.value : q.value))
const escala = computed(() => Math.max(props.insumo.estoqueMinimo * 3, props.insumo.quantidade, depois.value, 1))

async function registrar() {
  salvando.value = true
  try {
    await api.post(`/insumos/${props.insumo.id}/movimentar`, {
      tipo: form.tipo,
      quantidade: q.value,
      ...(form.tipo === 'entrada' ? { custoUnitario: Number(form.custo) || 0 } : {}),
      ...(form.motivo ? { motivo: form.motivo } : {}),
    })
    avisar(`${props.insumo.nome} · ${qtd(depois.value, props.insumo.unidade)}`)
    emit('salvo')
  } catch (e) {
    avisarErro(e)
    salvando.value = false
  }
}

async function salvarAjustes() {
  try {
    await api.put(`/insumos/${props.insumo.id}`, {
      nome: props.insumo.nome,
      unidade: props.insumo.unidade,
      estoqueMinimo: Number(ajustes.estoqueMinimo) || 0,
      custoUnitario: Number(ajustes.custoUnitario) || 0,
      fornecedorId: ajustes.fornecedorId ? Number(ajustes.fornecedorId) : null,
    })
    avisar('Guardado')
    emit('salvo')
  } catch (e) {
    avisarErro(e)
  }
}
</script>

<template>
  <Tela :rotulo="insumo.nome" @fechar="emit('fechar')">
    <div class="px-5 md:px-10 pt-20 pb-40 grid md:grid-cols-[auto_1fr] gap-10 md:gap-16 max-w-6xl">
      <div class="flex flex-col items-center gap-4">
        <Vaso :quantidade="depois" :minimo="insumo.estoqueMinimo" :escala="escala" :status="depois <= 0 ? 'zerado' : depois <= insumo.estoqueMinimo ? 'baixo' : 'ok'" :tamanho="220" />
        <p class="text-3xl numero">{{ qtd(depois, insumo.unidade) }}</p>
        <p class="fraco text-sm numero">
          agora {{ qtd(insumo.quantidade, insumo.unidade) }}<template v-if="insumo.coberturaDias !== null && insumo.coberturaDias !== undefined"> · dura {{ num1(insumo.coberturaDias) }} d</template>
        </p>
      </div>

      <div class="min-w-0">
        <h1 class="text-4xl md:text-6xl leading-none">{{ insumo.nome }}</h1>
        <div class="flex gap-8 mt-10 text-2xl md:text-3xl" role="radiogroup" aria-label="O que aconteceu">
          <button v-for="[id, r] in TIPOS" :key="id" role="radio" :aria-checked="form.tipo === id" :class="form.tipo !== id && 'apagado hover:opacity-70'" @click="form.tipo = id">{{ r }}</button>
        </div>

        <form class="mt-8 flex flex-col gap-6" @submit.prevent="registrar">
          <label class="flex items-baseline gap-4">
            <input v-model="form.quantidade" type="number" step="any" min="0" autofocus :aria-label="`Quantidade em ${insumo.unidade}`" class="w-48 bg-transparent regua outline-none text-6xl font-bold numero text-tinta" placeholder="0" />
            <span class="text-3xl fraco">{{ insumo.unidade }}</span>
          </label>
          <label v-if="form.tipo === 'entrada'" class="flex items-baseline gap-3 text-xl">
            <span class="fraco">a R$</span>
            <input v-model="form.custo" type="number" step="any" min="0" aria-label="Custo por unidade" class="w-32 bg-transparent regua-fina outline-none font-bold numero text-tinta text-2xl" />
            <span class="fraco">por {{ insumo.unidade }}</span>
          </label>
          <div v-if="form.tipo === 'perda'" class="flex flex-wrap gap-x-6 gap-y-2 text-xl" role="radiogroup" aria-label="Motivo">
            <button v-for="m in MOTIVOS" :key="m" type="button" role="radio" :aria-checked="form.motivo === m" :class="form.motivo !== m && 'apagado hover:opacity-70'" @click="form.motivo = m">{{ m }}</button>
          </div>
          <p v-if="form.tipo === 'perda' && q" class="text-perigo text-xl numero">−{{ brl(q * insumo.custoUnitario) }}</p>
          <button class="bloco h-16 text-xl aberto flex items-center justify-between px-8 max-w-md" :disabled="salvando || form.quantidade === '' || (form.tipo === 'perda' && !form.motivo)">
            <span>Registrar</span><span aria-hidden="true">→</span>
          </button>
        </form>

        <details class="mt-16">
          <summary class="palavra text-lg fraco cursor-pointer list-none">Ajustes do insumo</summary>
          <div class="grid sm:grid-cols-3 gap-4 mt-6">
            <label class="text-sm fraco flex flex-col gap-2">Mínimo ({{ insumo.unidade }})
              <input v-model="ajustes.estoqueMinimo" type="number" step="any" min="0" class="campo h-12 text-lg" />
            </label>
            <label class="text-sm fraco flex flex-col gap-2">Custo por {{ insumo.unidade }}
              <input v-model="ajustes.custoUnitario" type="number" step="any" min="0" class="campo h-12 text-lg" />
            </label>
            <label class="text-sm fraco flex flex-col gap-2">Fornecedor
              <select v-model="ajustes.fornecedorId" class="campo h-12 text-lg">
                <option value="">—</option>
                <option v-for="f in fornecedores" :key="f.id" :value="f.id">{{ f.nome }}</option>
              </select>
            </label>
          </div>
          <button class="palavra text-lg mt-4" @click="salvarAjustes">Guardar ajustes →</button>
        </details>
      </div>
    </div>
  </Tela>
</template>
