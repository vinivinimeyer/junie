<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, modoDemo } from '../../lib/api'
import { sessao, sair, onboardingCompleto } from '../../lib/sessao'
import { alertasEstoque, atualizarAlertas, zerarAlertas } from '../../lib/alertas'
import { avisar } from '../../lib/avisos'
import Orbe from '../../components/Orbe.vue'
import Selo from '../../components/Selo.vue'
import Tela from '../../components/Tela.vue'

const route = useRoute()
const router = useRouter()
const menu = ref(false)

const SECOES = [
  { to: '/app', rotulo: 'Vender' },
  { to: '/app/mesas', rotulo: 'Mesas' },
  { to: '/app/cozinha', rotulo: 'Cozinha' },
  { to: '/app/estoque', rotulo: 'Estoque', alerta: true },
  { to: '/app/caixa', rotulo: 'Caixa' },
]
const ativa = (to) => (to === '/app' ? route.path === '/app' : route.path.startsWith(to))
const link = computed(() => `${location.origin}/entrar/${sessao.tenant?.slug}`)

onMounted(atualizarAlertas)
watch(() => route.path, () => (menu.value = false))

async function copiarLink() {
  try {
    await navigator.clipboard.writeText(link.value)
    avisar('Link da equipe copiado')
  } catch {
    avisar(link.value, 'alerta', 8000)
  }
}

async function encerrar() {
  try {
    await api.post('/auth/logout')
  } catch {
    // token já inválido: sai do mesmo jeito
  }
  const slug = sessao.tenant?.slug
  // Sai da área logada antes de limpar a sessão, senão o layout re-renderiza sem tenant.
  await router.push(slug ? `/entrar/${slug}` : '/')
  zerarAlertas()
  sair()
}
</script>

<template>
  <div v-if="sessao.tenant" class="min-h-[100dvh] flex flex-col">
    <header class="px-5 md:px-10 pt-5 md:pt-7">
      <div class="flex items-center justify-between gap-4 mb-5 md:mb-7">
        <Selo :marca="sessao.tenant" :altura="26" />
        <button class="rounded-full transition-transform duration-200 hover:scale-105 active:scale-95" aria-label="Menu" @click="menu = true">
          <Orbe :marca="sessao.tenant" tamanho="2.75rem" />
        </button>
      </div>
      <nav class="flex gap-6 md:gap-10 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 [scrollbar-width:none]" aria-label="Seções">
        <RouterLink
          v-for="s in SECOES"
          :key="s.to"
          :to="s.to"
          class="whitespace-nowrap text-[26px] md:text-[34px] leading-none pb-3 transition-opacity duration-150"
          :class="ativa(s.to) ? '' : 'apagado hover:opacity-70'"
          :aria-current="ativa(s.to) ? 'page' : undefined"
        >
          {{ s.rotulo }}<sup v-if="s.alerta && alertasEstoque" class="text-destaque text-[0.5em] ml-1 numero">{{ alertasEstoque }}</sup>
        </RouterLink>
      </nav>
      <RouterLink v-if="!onboardingCompleto()" to="/configurar" class="palavra block text-destaque text-base mt-2">Terminar a configuração →</RouterLink>
    </header>

    <main class="flex-1 flex flex-col">
      <RouterView v-slot="{ Component }">
        <Transition name="surge" mode="out-in"><component :is="Component" /></Transition>
      </RouterView>
    </main>

    <Tela v-if="menu" rotulo="Menu" @fechar="menu = false">
      <div class="min-h-[100dvh] px-5 md:px-10 pt-24 pb-10 flex flex-col">
        <p class="fraco text-lg mb-6 entra" style="--i: 0">{{ sessao.user?.nome }} · {{ sessao.tenant.nome }}</p>
        <RouterLink to="/app/cardapio" class="palavra regua py-5 md:py-7 text-4xl md:text-6xl leading-none entra" style="--i: 1">Cardápio</RouterLink>
        <RouterLink to="/marca" class="palavra regua py-5 md:py-7 text-4xl md:text-6xl leading-none entra" style="--i: 2">Marca</RouterLink>
        <RouterLink to="/configurar" class="palavra regua py-5 md:py-7 text-4xl md:text-6xl leading-none entra" style="--i: 3">Configuração</RouterLink>
        <button class="palavra regua py-5 md:py-7 text-4xl md:text-6xl leading-none entra" style="--i: 4" @click="copiarLink">Link da equipe</button>
        <button class="palavra py-5 md:py-7 text-4xl md:text-6xl leading-none entra" style="--i: 5" @click="encerrar">Sair</button>
        <p v-if="modoDemo" class="apagado text-sm mt-auto pt-10">Demonstração: os dados ficam neste navegador.</p>
      </div>
    </Tela>
  </div>
</template>
