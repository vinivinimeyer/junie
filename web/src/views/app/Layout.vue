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
  <div v-if="sessao.tenant" class="moldura">
    <div class="painel relative flex flex-col md:flex-row">
      <aside class="md:w-56 lg:w-64 shrink-0 px-5 md:px-8 pt-5 md:pt-8 md:pb-8 flex md:flex-col items-center md:items-start justify-between gap-4">
        <Selo :marca="sessao.tenant" :altura="24" />
        <div class="hidden md:block mt-auto space-y-3">
          <RouterLink v-if="!onboardingCompleto()" to="/configurar" class="palavra block text-sm text-destaque">Terminar a configuração →</RouterLink>
          <p class="fraco text-sm leading-snug max-w-[18ch]">{{ sessao.user?.nome }} no {{ sessao.tenant.nome }}.</p>
        </div>
        <button class="md:hidden rounded-full transition-transform duration-200 active:scale-95" aria-label="Menu" @click="menu = true">
          <Orbe :marca="sessao.tenant" tamanho="2.5rem" />
        </button>
      </aside>

      <div class="flex-1 min-w-0 flex flex-col">
        <header class="px-5 md:px-8 pt-4 md:pt-7 flex items-center justify-between gap-4">
          <nav class="flex gap-1 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 [scrollbar-width:none]" aria-label="Seções">
            <RouterLink
              v-for="s in SECOES"
              :key="s.to"
              :to="s.to"
              class="whitespace-nowrap rounded-full h-10 px-4 flex items-center text-[15px] transition-colors duration-150"
              :class="ativa(s.to) ? 'pilula-ativa text-tinta' : 'fraco hover:text-tinta'"
              :aria-current="ativa(s.to) ? 'page' : undefined"
            >
              {{ s.rotulo }}<sup v-if="s.alerta && alertasEstoque" class="text-destaque text-[0.7em] ml-1 numero">{{ alertasEstoque }}</sup>
            </RouterLink>
          </nav>
          <button class="hidden md:block rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 shrink-0" aria-label="Menu" @click="menu = true">
            <Orbe :marca="sessao.tenant" tamanho="2.75rem" />
          </button>
        </header>
        <RouterLink v-if="!onboardingCompleto()" to="/configurar" class="md:hidden palavra block text-destaque text-sm px-5 mt-3">Terminar a configuração →</RouterLink>

        <main class="flex-1 flex flex-col">
          <RouterView v-slot="{ Component }">
            <Transition name="surge" mode="out-in"><component :is="Component" /></Transition>
          </RouterView>
        </main>
      </div>
    </div>

    <Tela v-if="menu" rotulo="Menu" @fechar="menu = false">
      <div class="min-h-[100dvh] px-5 md:px-10 pt-24 pb-10 flex flex-col max-w-xl">
        <p class="fraco mb-6 entra" style="--i: 0">{{ sessao.user?.nome }} · {{ sessao.tenant.nome }}</p>
        <div class="flex flex-col gap-2">
          <RouterLink to="/app/cardapio" class="pilula h-16 px-6 flex items-center justify-between text-xl entra" style="--i: 1">Cardápio <span class="fraco" aria-hidden="true">→</span></RouterLink>
          <RouterLink to="/marca" class="pilula h-16 px-6 flex items-center justify-between text-xl entra" style="--i: 2">Marca <span class="fraco" aria-hidden="true">→</span></RouterLink>
          <RouterLink to="/configurar" class="pilula h-16 px-6 flex items-center justify-between text-xl entra" style="--i: 3">Configuração <span class="fraco" aria-hidden="true">→</span></RouterLink>
          <button class="pilula h-16 px-6 flex items-center justify-between text-xl entra" style="--i: 4" @click="copiarLink">Link da equipe <span class="fraco text-base">Copiar</span></button>
        </div>
        <button class="palavra fraco text-lg mt-8 entra" style="--i: 5" @click="encerrar">Sair</button>
        <p v-if="modoDemo" class="apagado text-sm mt-auto pt-10">Demonstração: os dados ficam neste navegador.</p>
      </div>
    </Tela>
  </div>
</template>
