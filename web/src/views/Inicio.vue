<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { sessao } from '../lib/sessao'
import { criarDemonstracao } from '../lib/demoRapida'
import { avisarErro } from '../lib/avisos'
import { hexParaRgb } from '../lib/theme'
import Orbe from '../components/Orbe.vue'
import HeroCheckout from '../components/inicio/HeroCheckout.vue'
import Recursos from '../components/inicio/Recursos.vue'
import DemoMarca from '../components/inicio/DemoMarca.vue'
import DemoQuadro from '../components/inicio/DemoQuadro.vue'
import DemoFicha from '../components/inicio/DemoFicha.vue'
import DemoVenda from '../components/inicio/DemoVenda.vue'
import DemoCozinha from '../components/inicio/DemoCozinha.vue'
import DemoEstoque from '../components/inicio/DemoEstoque.vue'
import DemoCaixa from '../components/inicio/DemoCaixa.vue'

const router = useRouter()
const criando = ref(false)

const EXEMPLOS = [
  { nome: 'Café Aurora', corPrimaria: '#3F4A8C', corDestaque: '#FF7A2F', fonte: 'Host Grotesk' },
  { nome: 'Logico', corPrimaria: '#1F2BFF', corDestaque: '#9AA8FF', fonte: 'DIN 2014' },
  { nome: 'Bar do Porto', corPrimaria: '#6F4AA8', corDestaque: '#FF4F7A', fonte: 'Space Grotesk' },
  { nome: 'Cantina Nona', corPrimaria: '#4F7F7A', corDestaque: '#E8B04A', fonte: 'Archivo' },
]

const TURNOS = [{ frase: 'vender' }, { frase: 'a cozinha' }, { frase: 'o estoque' }, { frase: 'o caixa' }]

const MONTAR = [
  { id: 'marca', rotulo: 'Marca', texto: 'Cor, logo e letra vestem o PDV, o Pix e as telas.', dica: 'toque numa casa' },
  { id: 'cardapio', rotulo: 'Cardápio no quadro', texto: 'Escreva como no giz. Linha sem preço vira categoria.', dica: 'escreva Mocha 15' },
  { id: 'ficha', rotulo: 'Ficha técnica', texto: 'Custo e margem de cada item, enquanto você digita.', dica: 'baixe o preço até a margem ficar vermelha' },
]

const OPERAR = [
  { id: 'vender', rotulo: 'Vender', texto: 'Toque, some e cobre. O Pix sai com o QR da casa.', dica: 'venda três cappuccinos' },
  { id: 'cozinha', rotulo: 'Cozinha', texto: 'O pedido cai na fila e anda com um toque.', dica: 'toque num pedido' },
  { id: 'estoque', rotulo: 'Estoque', texto: 'A venda baixa os potes. Abaixo do mínimo, o pedido ao fornecedor sai pronto.', dica: 'marque que chegou' },
  { id: 'caixa', rotulo: 'Caixa', texto: 'Quanto entrou, quanto sobrou. Cancelar devolve o estoque.', dica: 'cancele uma venda' },
]

const atual = ref(0)
const momento = ref(0)
const escolheuMarca = ref(false)
const reduzMovimento = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const marca = computed(() => EXEMPLOS[atual.value])
const horizonte = computed(() => ({
  '--marca': hexParaRgb(marca.value.corPrimaria).join(' '),
  '--destaque': hexParaRgb(marca.value.corDestaque).join(' '),
  '--raio': '999px',
}))

function escolherMarca(i) {
  escolheuMarca.value = true
  atual.value = i
}

const giros = reduzMovimento
  ? []
  : [
      setInterval(() => !escolheuMarca.value && (atual.value = (atual.value + 1) % EXEMPLOS.length), 5200),
      setInterval(() => (momento.value = (momento.value + 1) % TURNOS.length), 2800),
    ]

onBeforeUnmount(() => {
  giros.forEach(clearInterval)
  document.documentElement.style.scrollBehavior = ''
})
document.documentElement.style.scrollBehavior = 'smooth'

async function demonstracao() {
  criando.value = true
  try {
    await criarDemonstracao()
    router.push('/app')
  } catch (e) {
    avisarErro(e)
    criando.value = false
  }
}
</script>

<template>
  <div class="moldura" :style="horizonte">
    <div class="painel overflow-clip">
      <!-- dobra: a proposta à esquerda, o produto à direita -->
      <section id="topo" class="flex flex-col md:flex-row md:items-start md:min-h-[calc(100dvh-5rem)]">
        <aside class="md:w-[21rem] lg:w-[24rem] shrink-0 px-5 md:px-8 pt-5 md:pt-8 pb-8 flex flex-col gap-10 md:sticky md:top-10 md:h-[calc(100dvh-5rem)]">
          <div class="flex items-center justify-between">
            <a href="#topo" class="flex items-center gap-2.5 text-xl font-medium entra" style="--i: 0">
              <Orbe :marca="marca" tamanho="1.5rem" parado />
              Junie
            </a>
            <RouterLink v-if="sessao.token" to="/app" class="md:hidden palavra fraco text-[15px]">{{ sessao.tenant?.nome }}</RouterLink>
            <RouterLink v-else to="/entrar" class="md:hidden palavra fraco text-[15px]">Entrar</RouterLink>
          </div>

          <div class="md:mt-auto flex flex-col gap-6">
            <h1 class="text-[2.5rem] md:text-[2.75rem] leading-[1.02] entra" style="--i: 1">
              O sistema para
              <span class="block h-[1.05em] overflow-hidden" aria-live="polite">
                <Transition name="surge" mode="out-in">
                  <span :key="momento" class="block fraco">{{ TURNOS[momento].frase }}.</span>
                </Transition>
              </span>
            </h1>
            <p class="fraco text-[17px] leading-snug max-w-[30ch] entra" style="--i: 2">
              Marca, cardápio, mesas e estoque num PDV que veste a identidade da casa.
            </p>
            <div class="flex flex-wrap items-center gap-x-6 gap-y-3 entra" style="--i: 3">
              <RouterLink to="/comecar" class="bloco h-12 px-6 text-[15px] inline-flex items-center gap-3">
                Criar minha marca <span aria-hidden="true">→</span>
              </RouterLink>
              <button class="palavra fraco text-[15px]" :disabled="criando" @click="demonstracao">
                {{ criando ? 'Abrindo o Café Aurora…' : 'Ver demonstração' }}
              </button>
            </div>
          </div>
        </aside>

        <div class="flex-1 min-w-0 flex flex-col px-5 md:px-8 md:pt-7 pb-8 md:min-h-[calc(100dvh-5rem)]">
          <nav class="hidden md:flex justify-end gap-8 text-[15px] entra" style="--i: 0" aria-label="Página">
            <a href="#montar" class="palavra fraco hover:text-tinta">Como funciona</a>
            <RouterLink v-if="sessao.token" to="/app" class="palavra fraco hover:text-tinta">{{ sessao.tenant?.nome }}</RouterLink>
            <RouterLink v-else to="/entrar" class="palavra fraco hover:text-tinta">Entrar</RouterLink>
          </nav>

          <!-- checkout: o balcão vendendo sozinho até alguém tocar -->
          <HeroCheckout :marca="marca" class="flex-1 mt-2 md:mt-6 entra" style="--i: 2" />
        </div>
      </section>

      <!-- recursos: duas janelas do produto, todas mexendo no mesmo café -->
      <Recursos id="montar" titulo="Monte a casa" subtitulo="numa tarde, sem planilha." :itens="MONTAR">
        <template #marca><DemoMarca :exemplos="EXEMPLOS" :atual="atual" @escolher="escolherMarca" /></template>
        <template #cardapio><DemoQuadro /></template>
        <template #ficha><DemoFicha /></template>
      </Recursos>

      <Recursos id="operar" titulo="Toque o dia" subtitulo="do pedido ao fechamento." :itens="OPERAR">
        <template #vender><DemoVenda :marca="marca" /></template>
        <template #cozinha><DemoCozinha /></template>
        <template #estoque><DemoEstoque :nome="marca.nome" /></template>
        <template #caixa><DemoCaixa :marca="marca" /></template>
      </Recursos>

      <section class="px-5 md:px-8 lg:px-12 pt-16 pb-20 md:pb-28 regua-topo flex flex-col md:flex-row md:items-end justify-between gap-8">
        <h2 class="text-4xl md:text-5xl leading-[1.02] max-w-[12ch]">Agora com a sua cara.</h2>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
          <RouterLink to="/comecar" class="bloco h-14 px-7 text-base inline-flex items-center gap-3">
            Criar minha marca <span aria-hidden="true">→</span>
          </RouterLink>
          <button class="palavra fraco text-[15px]" :disabled="criando" @click="demonstracao">
            {{ criando ? 'Abrindo o Café Aurora…' : 'Abrir o app de demonstração' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.regua-topo { border-top: 1px solid rgb(var(--tinta) / 0.07); }
</style>
