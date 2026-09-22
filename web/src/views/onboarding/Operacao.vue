<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
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

const usarModelo = (t) =>
  tarefa(async () => {
    await api.post('/setup/importar', payloadDoTemplate({ ...t, mesas: 0 }))
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
          <div>
            <button class="palavra w-full regua py-6 md:py-8 text-3xl md:text-6xl leading-none" :disabled="ocupado" @click="usarModelo(sugerido)">
              {{ ocupado ? 'Montando…' : `Cardápio de ${sugerido.nome}` }}
            </button>
            <button class="palavra w-full regua py-6 md:py-8 text-3xl md:text-6xl leading-none" :disabled="ocupado" @click="passo = 1">Em branco</button>
          </div>
          <div class="flex flex-wrap gap-x-6 gap-y-2 text-lg">
            <span class="fraco">ou</span>
            <button v-for="t in outros" :key="t.id" class="palavra" :disabled="ocupado" @click="usarModelo(t)">{{ t.nome }}</button>
          </div>
        </section>

        <!-- CARDÁPIO -->
        <section v-else-if="PASSOS[passo] === 'cardapio'" key="cardapio" class="flex flex-col gap-8">
          <h1 class="text-2xl md:text-3xl">Escreva o cardápio como no quadro.</h1>
          <QuadroCardapio v-model="quadroCardapio" />
          <div class="flex justify-end">
            <button class="bloco h-16 md:h-20 px-8 text-xl md:text-2xl aberto min-w-[60%] md:min-w-[22rem] flex items-center justify-between" :disabled="ocupado || !quadroCardapio.trim()" @click="salvarQuadro">
              <span>{{ ocupado ? 'Salvando…' : 'Pronto' }}</span><span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <!-- MESAS -->
        <section v-else-if="PASSOS[passo] === 'mesas'" key="mesas" class="flex flex-col gap-10">
          <div class="flex flex-wrap gap-x-8 gap-y-3 text-2xl md:text-3xl" role="radiogroup" aria-label="Atendimento">
            <button v-for="[id, r] in [['mesas', 'Mesas'], ['comandas', 'Comandas'], ['balcao', 'Só balcão']]" :key="id" role="radio" :aria-checked="modoMesa === id" :class="modoMesa !== id && 'apagado hover:opacity-70'" @click="modoMesa = id">{{ r }}</button>
          </div>
          <template v-if="modoMesa !== 'balcao'">
            <div class="flex items-center gap-8">
              <button class="palavra text-6xl w-14" aria-label="Menos" :disabled="mesas <= Math.max(1, dados.mesas.length)" @click="mesas--">−</button>
              <span class="text-8xl md:text-[9rem] leading-none numero min-w-[2ch] text-center">{{ mesas }}</span>
              <button class="palavra text-6xl w-14" aria-label="Mais" :disabled="mesas >= 60" @click="mesas++">+</button>
            </div>
            <div class="flex flex-wrap gap-3" aria-hidden="true">
              <span
                v-for="n in mesas"
                :key="n"
                class="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-sm numero transition-transform duration-200"
                :class="n <= dados.mesas.length ? 'bg-tinta text-chao' : 'vidro-disco'"
                :style="{ '--i': n }"
              >{{ n }}</span>
            </div>
          </template>
          <div class="flex justify-end">
            <button class="bloco h-16 md:h-20 px-8 text-xl md:text-2xl aberto min-w-[60%] md:min-w-[22rem] flex items-center justify-between" :disabled="ocupado" @click="salvarMesas">
              <span>{{ ocupado ? 'Salvando…' : 'Pronto' }}</span><span aria-hidden="true">→</span>
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
            <button class="bloco h-14 px-8 text-lg aberto" :disabled="ocupado" @click="salvarInsumos">{{ ocupado ? 'Guardando…' : 'Guardar insumos' }}</button>
          </div>

          <div v-if="dados.produtos.length" class="max-w-3xl">
            <p class="text-2xl md:text-3xl numero">
              {{ dados.produtos.length - semFicha.length }} de {{ dados.produtos.length }} produtos baixam estoque.
            </p>
            <button v-for="p in semFicha" :key="p.id" class="palavra w-full flex justify-between py-4 regua-fina text-xl" @click="ficha = p">
              <span>{{ p.nome }}</span><span class="fraco">o que leva? →</span>
            </button>
          </div>

          <div class="flex justify-end">
            <button class="bloco h-16 md:h-20 px-8 text-xl md:text-2xl aberto min-w-[60%] md:min-w-[22rem] flex items-center justify-between" :disabled="ocupado" @click="concluirEstoque">
              <span>{{ semFicha.length ? 'Seguir e ligar depois' : 'Pronto' }}</span><span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <!-- PRONTO -->
        <section v-else key="pronto" class="flex flex-col items-center gap-10 pt-6">
          <Orbe :marca="sessao.tenant" tamanho="min(78vw, 26rem)">
            <LogoNoOrbe v-if="sessao.tenant.logo" :marca="sessao.tenant" />
            <span v-else class="text-2xl md:text-3xl leading-tight numero px-[12%]">
              {{ dados.produtos.length }} produtos<br />{{ dados.mesas.length }} mesas<br />{{ dados.insumos.length }} insumos
            </span>
          </Orbe>
          <p v-if="sessao.tenant.logo" class="text-2xl md:text-3xl leading-tight numero text-center">
            {{ dados.produtos.length }} produtos · {{ dados.mesas.length }} mesas · {{ dados.insumos.length }} insumos
          </p>
          <button class="bloco h-20 px-10 text-2xl aberto min-w-[min(100%,26rem)] flex items-center justify-between" @click="abrir">
            <span>Abrir o caixa</span><span aria-hidden="true">→</span>
          </button>
          <p class="fraco text-center">Equipe entra em <span class="text-tinta normal-case">/entrar/{{ sessao.tenant.slug }}</span></p>
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
  </div>
</template>
