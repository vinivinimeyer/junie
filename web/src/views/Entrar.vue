<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../lib/api'
import { entrar, onboardingCompleto } from '../lib/sessao'
import { aplicarTema, MARCA_JUNIE } from '../lib/theme'
import Orbe from '../components/Orbe.vue'
import Selo from '../components/Selo.vue'
import LogoNoOrbe from '../components/LogoNoOrbe.vue'

/** Login da equipe. Em /entrar/:slug a tela já vem com a marca do cliente. */
const route = useRoute()
const router = useRouter()
const marca = ref(null)
const email = ref('')
const senha = ref('')
const erro = ref('')
const entrando = ref(false)

onMounted(async () => {
  if (route.params.slug) {
    try {
      marca.value = await api.get(`/public/marca/${route.params.slug}`)
    } catch {
      marca.value = null
    }
  }
  aplicarTema(marca.value ?? MARCA_JUNIE)
})

async function enviar() {
  erro.value = ''
  entrando.value = true
  try {
    const conta = await api.post('/auth/login', { email: email.value, senha: senha.value })
    entrar(conta)
    router.push(onboardingCompleto(conta.tenant) ? '/app' : '/configurar')
  } catch (e) {
    erro.value = e.message
  } finally {
    entrando.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh] grid md:grid-cols-2 items-center gap-10 px-5 md:px-12 py-10">
    <div class="flex flex-col items-center md:items-start gap-8">
      <Orbe :marca="marca ?? MARCA_JUNIE" tamanho="min(60vw, 22rem)">
        <LogoNoOrbe v-if="(marca ?? MARCA_JUNIE).logo" :marca="marca ?? MARCA_JUNIE" />
        <Selo v-else :marca="marca ?? MARCA_JUNIE" :altura="40" />
      </Orbe>
    </div>

    <form class="w-full max-w-md flex flex-col gap-5" :class="erro && 'treme'" @submit.prevent="enviar">
      <p class="text-3xl md:text-4xl leading-tight mb-4">{{ marca ? `Bom turno, ${marca.nome}.` : 'Entrar' }}</p>
      <input v-model="email" type="email" class="campo" placeholder="e-mail" autocomplete="email" aria-label="E-mail" required />
      <input v-model="senha" type="password" class="campo" placeholder="senha" autocomplete="current-password" aria-label="Senha" required />
      <p v-if="erro" class="text-perigo" role="alert">{{ erro }}</p>
      <button class="bloco h-16 text-xl aberto" :disabled="entrando">{{ entrando ? 'Entrando…' : 'Entrar' }}</button>
      <RouterLink v-if="!marca" to="/comecar" class="palavra fraco text-base mt-2">Criar marca</RouterLink>
    </form>
  </div>
</template>
