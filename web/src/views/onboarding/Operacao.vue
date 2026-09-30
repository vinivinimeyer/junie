<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../lib/api'
import { sessao, atualizarTenant } from '../../lib/sessao'
import { TEMPLATES, templateDoSegmento, payloadDoTemplate } from '../../data/templates'
import { cardapioComoTexto, salvarCardapio, lerInsumos, ligarRevenda } from '../../lib/quadro'
import { qtd } from '../../lib/formato'
import { avisar, avisarErro } from '../../lib/avisos'
import Orbe from '../../components/Orbe.vue'
import LogoNoOrbe from '../../components/LogoNoOrbe.vue'
import Selo from '../../components/Selo.vue'
import Vaso from '../../components/Vaso.vue'
import FichaProduto from '../../components/FichaProduto.vue'
import QuadroCardapio from '../../components/quadro/QuadroCardapio.vue'
import QuadroInsumos from '../../components/quadro/QuadroInsumos.vue'
import Pontos from '../../components/Pontos.vue'
import Criando from '../../components/Criando.vue'

/**
 * Jornada 2. Cada passo grava na API; dá para sair e voltar de onde parou.
 * Cardápio e estoque se escrevem num quadro, como o de giz do balcão.
 */
const router = useRouter()
const PASSOS = ['comeco', 'cardapio', 'mesas', 'estoque', 'pronto']
const passo = ref(0)
const ocupado = ref(false)

const dados = reactive({ categorias: [], produtos: [], insumos: [], mesas: [] })
async function recarregar() {
  const [categorias, produtos, insumos, mesas] = await Promise.all([
    api.get('/categorias'),
    api.get('/produtos?ativos=1'),
    api.get('/insumos'),
    api.get('/mesas'),
  ])
  Object.assign(dados, { categorias, produtos, insumos, mesas })
}

const quadroCardapio = ref('')
const quadroInsumos = ref('')
const mesas = ref(8)
const modoMesa = ref('mesas')
const ficha = ref(null)

const sugerido = computed(() => templateDoSegmento(sessao.tenant?.segmento))
const outros = computed(() => TEMPLATES.filter((t) => t.id !== sugerido.value.id))
const semFicha = computed(() => dados.produtos.filter((p) => !p.ficha.length))

onMounted(async () => {
  try {
    await recarregar()
    quadroCardapio.value = cardapioComoTexto(dados.categorias, dados.produtos)
    mesas.value = dados.mesas.length || 8
    const feito = { comeco: dados.produtos.length > 0, ...sessao.tenant?.onboarding }
    const pendente = PASSOS.findIndex((p) => p !== 'pronto' && !feito[p])
    passo.value = pendente === -1 ? PASSOS.length - 1 : pendente
  } catch (e) {
    avisarErro(e)
  }
})

async function marcar(etapa) {
  atualizarTenant(await api.put('/marca/onboarding', { [etapa]: true }))
  passo.value++
  window.scrollTo({ top: 0 })
}

async function tarefa(fn) {
  ocupado.value = true
  try {
    await fn()
  } catch (e) {
    avisarErro(e)
  } finally {
    ocupado.value = false
  }
}

const montando = ref(null)
const usarModelo = (t) =>
  tarefa(async () => {
    montando.value = t
    try {
      await Promise.all([api.post('/setup/importar', payloadDoTemplate({ ...t, mesas: 0 })), new Promise((r) => setTimeout(r, 2600))])
    } finally {
      montando.value = null
    }
    await recarregar()
    quadroCardapio.value = cardapioComoTexto(dados.categorias, dados.produtos)
    mesas.value = t.mesas
    passo.value = 1
  })

const salvarQuadro = () =>
  tarefa(async () => {
    await salvarCardapio(quadroCardapio.value, dados)
    await recarregar()
    await marcar('cardapio')
  })

const salvarMesas = () =>
  tarefa(async () => {
    const faltam = modoMesa.value === 'balcao' ? 0 : mesas.value - dados.mesas.length
    if (faltam > 0) await api.post('/mesas/lote', { quantidade: faltam, ...(modoMesa.value === 'comandas' ? { prefixo: 'Comanda' } : {}) })
    await recarregar()
    await marcar('mesas')
  })

const salvarInsumos = () =>
  tarefa(async () => {
    const { itens } = lerInsumos(quadroInsumos.value)
    for (const i of itens) {
      await api.post('/insumos', { nome: i.nome, unidade: i.unidade, quantidadeInicial: i.quantidade, estoqueMinimo: i.estoqueMinimo })
    }
    quadroInsumos.value = ''
    await recarregar()
    const ligados = await ligarRevenda(dados.produtos, dados.insumos)
    if (ligados) avisar(`${ligados} produto${ligados > 1 ? 's' : ''} de revenda ligado${ligados > 1 ? 's' : ''} ao estoque`)
    await recarregar()
  })

const concluirEstoque = () => tarefa(() => marcar('estoque'))

function abrir() {
  sessionStorage.removeItem('junie-pulou-setup')
  router.push('/app')
}
function depois() {
  sessionStorage.setItem('junie-pulou-setup', '1')
  router.push('/app')
}
const escala = (i) => Math.max(i.estoqueMinimo * 3, i.quantidade, 1)

const contagem = reactive({ produtos: 0, mesas: 0, insumos: 0 })
watch(
  () => PASSOS[passo.value] === 'pronto' && dados.produtos.length + dados.mesas.length + dados.insumos.length,
  (sim) => {
    if (!sim) return
    const alvo = { produtos: dados.produtos.length, mesas: dados.mesas.length, insumos: dados.insumos.length }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Object.assign(contagem, alvo)
    const inicio = performance.now() + 350
    const quadro = (agora) => {
      const t = Math.min(1, Math.max(0, (agora - inicio) / 1100))
      const e = 1 - Math.pow(1 - t, 3)
      for (const k in alvo) contagem[k] = Math.round(alvo[k] * e)
      if (t < 1) requestAnimationFrame(quadro)
    }
    requestAnimationFrame(quadro)
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-[100dvh] flex flex-col">
    <div class="flex h-1 gap-1" aria-hidden="true">
      <span v-for="(_, i) in PASSOS" :key="i" class="flex-1 transition-colors duration-300" :class="i <= passo ? 'bg-tinta' : 'bg-tinta/15'" />
    </div>
    <header class="flex justify-between items-center px-5 md:px-12 pt-6">
      <Selo :marca="sessao.tenant" :altura="30" />
      <div class="flex gap-6 text-lg aberto">
        <button v-if="passo > 0" class="palavra fraco" @click="passo--">← Voltar</button>
        <button class="palavra fraco" @click="depois">Depois</button>
      </div>
    </header>

    <main class="flex-1 px-5 md:px-12 py-10 md:py-14">
      <Transition name="surge" mode="out-in">
        <!-- COMEÇO -->
        <section v-if="PASSOS[passo] === 'comeco'" key="comeco" class="flex flex-col gap-10 max-w-5xl">
          <h1 class="text-2xl md:text-3xl">Por onde começar?</h1>
          <div class="flex flex-col gap-2 max-w-2xl">
            <button class="pilula pilula-ativa w-full h-20 md:h-24 px-7 md:px-8 flex items-center justify-between gap-6 text-left entra" style="--i: 1" :disabled="ocupado" @click="usarModelo(sugerido)">
              <span class="flex flex-col">
                <span class="text-xl md:text-2xl">Cardápio de {{ sugerido.nome }}</span>
                <span class="fraco text-[14px]">Pronto para editar, com preços e categorias</span>
              </span>
              <span class="seta-pilula text-xl" aria-hidden="true">→</span>
            </button>
            <button class="pilula w-full h-20 md:h-24 px-7 md:px-8 flex items-center justify-between gap-6 text-left entra" style="--i: 2" :disabled="ocupado" @click="passo = 1">
              <span class="flex flex-col">
                <span class="text-xl md:text-2xl">Em branco</span>
                <span class="fraco text-[14px]">Escrever do zero, como no quadro</span>
              </span>
              <span class="seta-pilula text-xl" aria-hidden="true">→</span>
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 entra" style="--i: 3">
            <span class="fraco text-[15px] mr-2">ou comece por</span>
            <button v-for="t in outros" :key="t.id" class="pilula h-10 px-4 rounded-full text-[15px]" :disabled="ocupado" @click="usarModelo(t)">{{ t.nome }}</button>
          </div>
        </section>

        <!-- CARDÁPIO -->
        <section v-else-if="PASSOS[passo] === 'cardapio'" key="cardapio" class="flex flex-col gap-8">
          <h1 class="text-2xl md:text-3xl">Escreva o cardápio como no quadro.</h1>
          <QuadroCardapio v-model="quadroCardapio" />
          <div class="flex justify-end">
            <button class="bloco h-16 px-8 text-lg min-w-[60%] md:min-w-[22rem] flex items-center justify-between" :disabled="ocupado || !quadroCardapio.trim()" @click="salvarQuadro">
              <span>{{ ocupado ? 'Salvando…' : 'Pronto' }}</span><Pontos v-if="ocupado" /><span v-else class="seta-bloco" aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <!-- MESAS -->
        <section v-else-if="PASSOS[passo] === 'mesas'" key="mesas" class="flex flex-col gap-10">
          <h1 class="text-2xl md:text-3xl">Como a casa atende?</h1>
          <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Atendimento">
            <button v-for="[id, r] in [['mesas', 'Mesas'], ['comandas', 'Comandas'], ['balcao', 'Só balcão']]" :key="id" role="radio" :aria-checked="modoMesa === id" class="h-12 px-5 rounded-full text-[17px] transition-colors" :class="modoMesa === id ? 'pilula pilula-ativa' : 'fraco hover:text-tinta'" @click="modoMesa = id">{{ r }}</button>
          </div>
          <template v-if="modoMesa !== 'balcao'">
            <div class="flex items-center gap-8">
              <button class="pilula w-14 h-14 rounded-full text-2xl flex items-center justify-center" aria-label="Menos" :disabled="mesas <= Math.max(1, dados.mesas.length)" @click="mesas--">−</button>
              <span class="text-6xl md:text-7xl leading-none numero min-w-[2ch] text-center"><Transition name="conta" mode="out-in"><span :key="mesas" class="inline-block">{{ mesas }}</span></Transition></span>
              <button class="pilula w-14 h-14 rounded-full text-2xl flex items-center justify-center" aria-label="Mais" :disabled="mesas >= 60" @click="mesas++">+</button>
            </div>
            <div class="flex flex-wrap gap-3" aria-hidden="true">
              <span
                v-for="n in mesas"
                :key="n"
                class="disco-mesa w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-sm numero"
                :class="n <= dados.mesas.length ? 'bg-tinta text-chao' : 'vidro-disco'"
                :style="{ '--i': n }"
              >{{ n }}</span>
            </div>
          </template>
          <div class="flex justify-end">
            <button class="bloco h-16 px-8 text-lg min-w-[60%] md:min-w-[22rem] flex items-center justify-between" :disabled="ocupado" @click="salvarMesas">
              <span>{{ ocupado ? 'Salvando…' : 'Pronto' }}</span><Pontos v-if="ocupado" /><span v-else class="seta-bloco" aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <!-- ESTOQUE -->
        <section v-else-if="PASSOS[passo] === 'estoque'" key="estoque" class="flex flex-col gap-10">
          <h1 class="text-2xl md:text-3xl">O que você tem na prateleira hoje?</h1>

          <div v-if="dados.insumos.length" class="flex gap-6 overflow-x-auto pb-2 -mx-5 px-5 md:mx-0 md:px-0">
            <div v-for="i in dados.insumos" :key="i.id" class="flex flex-col items-center gap-2 w-24 shrink-0 text-center">
              <Vaso :quantidade="i.quantidade" :minimo="i.estoqueMinimo" :escala="escala(i)" :tamanho="64" />
              <span class="text-xs leading-tight">{{ i.nome }}</span>
              <span class="text-xs fraco numero">{{ qtd(i.quantidade, i.unidade) }}</span>
            </div>
          </div>

          <QuadroInsumos v-model="quadroInsumos" />
          <div class="flex justify-end" v-if="quadroInsumos.trim()">
            <button class="bloco h-14 px-8 text-lg flex items-center gap-3" :disabled="ocupado" @click="salvarInsumos">{{ ocupado ? 'Guardando…' : 'Guardar insumos' }}<Pontos v-if="ocupado" /></button>
          </div>

          <div v-if="dados.produtos.length" class="max-w-3xl">
            <p class="text-xl md:text-2xl numero mb-4">
              {{ dados.produtos.length - semFicha.length }} de {{ dados.produtos.length }} produtos baixam estoque.
            </p>
            <div class="flex flex-col gap-1">
              <button v-for="p in semFicha" :key="p.id" class="pilula w-full h-12 px-5 flex items-center justify-between text-[15px]" @click="ficha = p">
                <span>{{ p.nome }}</span><span class="fraco">o que leva? →</span>
              </button>
            </div>
          </div>

          <div class="flex justify-end">
            <button class="bloco h-16 px-8 text-lg min-w-[60%] md:min-w-[22rem] flex items-center justify-between" :disabled="ocupado" @click="concluirEstoque">
              <span>{{ semFicha.length ? 'Seguir e ligar depois' : 'Pronto' }}</span><Pontos v-if="ocupado" /><span v-else class="seta-bloco" aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <!-- PRONTO -->
        <section v-else key="pronto" class="flex flex-col items-center gap-8 pt-2">
          <div class="relative pronto-orbe">
            <span class="onda" aria-hidden="true" />
            <span class="onda" style="animation-delay: .5s" aria-hidden="true" />
            <Orbe :marca="sessao.tenant" tamanho="min(70vw, 42vh, 22rem)">
              <LogoNoOrbe v-if="sessao.tenant.logo" :marca="sessao.tenant" />
              <span v-else class="text-2xl md:text-3xl leading-tight font-medium">{{ sessao.tenant.nome }}</span>
            </Orbe>
          </div>
          <h1 class="text-3xl md:text-4xl text-center entra" style="--i: 3">{{ sessao.tenant.nome }} está aberto.</h1>
          <div class="flex flex-wrap justify-center gap-1.5" aria-label="Resumo">
            <span v-for="([k, rotulo], i) in [['produtos', 'produtos'], ['mesas', 'mesas'], ['insumos', 'insumos']]" :key="k" class="pilula h-16 px-6 flex flex-col items-center justify-center entra" :style="{ '--i': 4 + i }">
              <span class="numero text-xl leading-none">{{ contagem[k] }}</span>
              <span class="apagado text-[13px]">{{ rotulo }}</span>
            </span>
          </div>
          <button class="bloco h-16 px-8 text-lg min-w-[min(100%,22rem)] flex items-center justify-between entra" style="--i: 7" @click="abrir">
            <span>Abrir o caixa</span><span class="seta-bloco" aria-hidden="true">→</span>
          </button>
          <p class="fraco text-center text-[15px] entra" style="--i: 8">Equipe entra em <span class="text-tinta">/entrar/{{ sessao.tenant.slug }}</span></p>
        </section>
      </Transition>
    </main>

    <FichaProduto
      v-if="ficha"
      :produto="ficha"
      :categorias="dados.categorias"
      :insumos="dados.insumos"
      @fechar="ficha = null"
      @insumo-criado="recarregar"
      @salvo="ficha = null; recarregar()"
    />

    <Criando
      :aberto="!!montando"
      :marca="sessao.tenant"
      :titulo="`Montando o cardápio de ${montando?.nome ?? ''}`"
      :etapas="['Escrevendo as categorias', 'Colocando os preços', 'Ligando o estoque', 'Arrumando o balcão']"
      :ritmo="620"
    />
  </div>
</template>

<style scoped>
.seta-pilula { transition: transform 0.2s var(--ease-out); }
@media (hover: hover) and (pointer: fine) {
  button:hover > .seta-pilula { transform: translateX(4px); }
}
.disco-mesa { animation: pinga 0.32s var(--ease-out) both; animation-delay: calc(min(var(--i), 12) * 18ms); }
.conta-enter-active, .conta-leave-active { transition: opacity 0.14s var(--ease-out), transform 0.14s var(--ease-out); }
.conta-enter-from { opacity: 0; transform: translateY(0.25em); }
.conta-leave-to { opacity: 0; transform: translateY(-0.25em); }
.pronto-orbe { animation: chega 0.8s var(--ease-out) both; }
.onda {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgb(var(--tinta) / 0.35);
  animation: onda 2.2s var(--ease-out) 0.3s 2 both;
  pointer-events: none;
}
@keyframes pinga { from { opacity: 0; transform: scale(0.4); } }
@keyframes chega { from { opacity: 0; transform: scale(0.8); filter: blur(10px); } }
@keyframes onda { from { opacity: 0.9; transform: scale(1); } to { opacity: 0; transform: scale(1.35); } }
</style>
