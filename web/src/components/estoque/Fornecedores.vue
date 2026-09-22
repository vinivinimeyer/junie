<script setup>
import { ref } from 'vue'
import { api } from '../../lib/api'
import { avisarErro } from '../../lib/avisos'

const props = defineProps({ fornecedores: { type: Array, required: true } })
const emit = defineEmits(['salvo'])
const editando = ref(null)

async function salvar() {
  const f = editando.value
  try {
    const corpo = { nome: f.nome, telefone: f.telefone || null, prazoEntregaDias: Number(f.prazoEntregaDias) || 1 }
    if (f.id) await api.put(`/fornecedores/${f.id}`, corpo)
    else await api.post('/fornecedores', corpo)
    editando.value = null
    emit('salvo')
  } catch (e) {
    avisarErro(e)
  }
}
</script>

<template>
  <div class="max-w-4xl">
    <template v-for="f in props.fornecedores" :key="f.id">
      <form v-if="editando?.id === f.id" class="grid sm:grid-cols-[1fr_12rem_8rem_auto] gap-3 py-4 regua-fina" @submit.prevent="salvar">
        <input v-model="editando.nome" class="campo h-12 text-lg" aria-label="Nome" />
        <input v-model="editando.telefone" class="campo h-12 text-lg" placeholder="whatsapp" aria-label="WhatsApp" />
        <input v-model="editando.prazoEntregaDias" type="number" min="0" class="campo h-12 text-lg" aria-label="Prazo em dias" />
        <button class="palavra text-lg px-2">Guardar</button>
      </form>
      <button v-else class="palavra w-full flex items-baseline gap-4 py-4 regua-fina" @click="editando = { ...f }">
        <span class="flex-1 text-xl md:text-2xl truncate">{{ f.nome }}</span>
        <span class="fraco numero">{{ f.telefone || 'sem whatsapp' }}</span>
        <span class="fraco numero w-20 text-right">{{ f.prazoEntregaDias }} d</span>
      </button>
    </template>
    <form v-if="editando && !editando.id" class="grid sm:grid-cols-[1fr_12rem_8rem_auto] gap-3 py-4" @submit.prevent="salvar">
      <input v-model="editando.nome" class="campo h-12 text-lg" placeholder="fornecedor" aria-label="Nome" autofocus />
      <input v-model="editando.telefone" class="campo h-12 text-lg" placeholder="whatsapp" aria-label="WhatsApp" />
      <input v-model="editando.prazoEntregaDias" type="number" min="0" class="campo h-12 text-lg" placeholder="dias" aria-label="Prazo em dias" />
      <button class="palavra text-lg px-2" :disabled="!editando.nome">Guardar</button>
    </form>
    <button v-else class="palavra text-xl mt-6" @click="editando = { nome: '', telefone: '', prazoEntregaDias: 2 }">+ Fornecedor</button>
  </div>
</template>
