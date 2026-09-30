<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { sessao } from '../lib/sessao'
import { criarDemonstracao } from '../lib/demoRapida'
import { avisarErro } from '../lib/avisos'
import { hexParaRgb } from '../lib/theme'
import Orbe from '../components/Orbe.vue'
import Palavras from '../components/Palavras.vue'
import Vaso from '../components/Vaso.vue'
import Pontos from '../components/Pontos.vue'

const router = useRouter()
const criando = ref(false)

const EXEMPLOS = [
  { nome: 'Café Aurora', corPrimaria: '#3F4A8C', corDestaque: '#FF7A2F', fonte: 'Host Grotesk' },
  { nome: 'Logico', corPrimaria: '#1F2BFF', corDestaque: '#9AA8FF', fonte: 'DIN 2014' },
  { nome: 'Bar do Porto', corPrimaria: '#6F4AA8', corDestaque: '#FF4F7A', fonte: 'Space Grotesk' },
  { nome: 'Cantina Nona', corPrimaria: '#4F7F7A', corDestaque: '#E8B04A', fonte: 'Archivo' },
]

const TURNOS = [
  { id: 'vender', rotulo: 'Vender', frase: 'vender', status: 'Somando a comanda…', texto: 'Toca no produto, soma na barra. Cartão registra na hora. Pix e dinheiro abrem tela cheia.' },
  { id: 'mesas', rotulo: 'Mesas', frase: 'as mesas', status: 'Abrindo a mesa 4…', texto: 'Mesa ocupada vira esfera com a cor da casa. Livre fica vazia. Tocar lança o pedido.' },
  { id: 'cozinha', rotulo: 'Cozinha', frase: 'a cozinha', status: 'Chamando a cozinha…', texto: 'O mesmo item da comanda. Tocar passa de coluna: fila, fazendo, pronto.' },
  { id: 'estoque', rotulo: 'Estoque', frase: 'o estoque', status: 'Contando a prateleira…', texto: 'Potes mostram o nível. A linha é o mínimo. Comprar monta o pedido por fornecedor.' },
  { id: 'caixa', rotulo: 'Caixa', frase: 'o caixa', status: 'Fechando o caixa…', texto: 'A esfera do caixa diz quanto entrou e quanto sobrou. Sem gráfico, com o dia.' },
]

const RITUAL = ['Como se chama?', 'Qual é a cor?', 'A logo no círculo', 'Qual a letra?', 'Quem cuida?']

const CARDAPIO = [
  { nome: 'Cappuccino', categoria: 'Bebidas quentes', preco: '14', hoje: 38 },
  { nome: 'Espresso', categoria: 'Bebidas quentes', preco: '7', hoje: 52 },
  { nome: 'Pão de queijo', categoria: 'Salgados', preco: '8', hoje: 41 },
  { nome: 'Latte gelado', categoria: 'Bebidas frias', preco: '16', hoje: 19 },
]

const POTES = [
  { nome: 'Café', quantidade: 3.2, minimo: 1, escala: 5, status: 'ok' },
  { nome: 'Leite', quantidade: 7, minimo: 8, escala: 12, status: 'baixo' },
  { nome: 'Copo', quantidade: 40, minimo: 80, escala: 200, status: 'critico' },
  { nome: 'Açúcar', quantidade: 4, minimo: 1, escala: 6, status: 'ok' },
]

const COZINHA = { Fila: ['2 latte', '1 mocha'], Fazendo: ['1 cappuccino'], Pronto: ['3 espresso'] }

const atual = ref(0)
const momento = ref(0)
const turno = ref('vender')
const linha = ref(0)
const escolheuTurno = ref(false)
const reduzMovimento = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const marca = computed(() => EXEMPLOS[atual.value])
const horizonte = computed(() => ({
  '--marca': hexParaRgb(marca.value.corPrimaria).join(' '),
  '--destaque': hexParaRgb(marca.value.corDestaque).join(' '),
  '--raio': '999px',
}))

function avancarTurno() {
  if (escolheuTurno.value) return
  momento.value = (momento.value + 1) % TURNOS.length
  turno.value = TURNOS[momento.value].id
}

const giros = reduzMovimento
  ? []
  : [
      setInterval(() => (atual.value = (atual.value + 1) % EXEMPLOS.length), 5200),
      setInterval(avancarTurno, 2800),
      setInterval(() => (linha.value = (linha.value + 1) % CARDAPIO.length), 1900),
    ]

onBeforeUnmount(() => {
  giros.forEach(clearInterval)
  document.documentElement.style.scrollBehavior = ''
})
document.documentElement.style.scrollBehavior = 'smooth'

function verTurno(id) {
  escolheuTurno.value = true
  turno.value = id
  const i = TURNOS.findIndex((t) => t.id === id)
  if (i >= 0) momento.value = i
}

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

        <div class="flex-1 min-w-0 flex flex-col px-5 md:px-8 md:pt-7 pb-8 md:pb-0">
          <nav class="hidden md:flex justify-end gap-8 text-[15px] entra" style="--i: 0" aria-label="Página">
            <a href="#turno" class="palavra fraco hover:text-tinta">Produto</a>
            <a href="#marca" class="palavra fraco hover:text-tinta">Marca</a>
            <RouterLink v-if="sessao.token" to="/app" class="palavra fraco hover:text-tinta">{{ sessao.tenant?.nome }}</RouterLink>
            <RouterLink v-else to="/entrar" class="palavra fraco hover:text-tinta">Entrar</RouterLink>
          </nav>

          <!-- esferas: a marca pensando e o dia em número -->
          <div class="relative mt-2 md:mt-8 flex items-center entra" style="--i: 2">
            <Orbe :marca="marca" :semente="atual" tamanho="min(62vw, 42vh, 22rem)">
              <Pontos class="mb-3" />
              <Transition name="surge" mode="out-in">
                <span :key="momento" class="text-[clamp(0.8rem,3.4cqw,1rem)]">{{ TURNOS[momento].status }}</span>
              </Transition>
            </Orbe>
            <div class="-ml-[12%] md:-ml-10 shrink-0">
              <Orbe claro tamanho="min(62vw, 42vh, 22rem)">
                <span class="text-[clamp(0.75rem,3cqw,0.95rem)] opacity-60">Hoje</span>
                <span class="text-[clamp(1.6rem,12cqw,3rem)] leading-none numero mt-1">R$ 1.218</span>
                <span class="text-[clamp(0.75rem,3cqw,0.95rem)] opacity-60 mt-4">{{ marca.nome }}</span>
                <span class="text-[clamp(0.9rem,5cqw,1.35rem)] numero">32 vendas</span>
              </Orbe>
            </div>
          </div>

          <!-- linhas: o cardápio como no app -->
          <div class="mt-5 md:mt-6 flex flex-col gap-2 min-w-0 entra" style="--i: 3">
            <div class="flex gap-2">
              <span class="pilula w-14 h-14 md:w-16 md:h-16 rounded-full shrink-0 flex items-center justify-center fraco" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </span>
              <div class="pilula h-14 md:h-16 px-6 flex-1 min-w-0 flex items-center gap-1 text-[15px] whitespace-nowrap">
                <span class="numero">12</span><span class="fraco">produtos,</span><span class="numero">4</span><span class="fraco">categorias</span>
              </div>
              <div class="hidden sm:flex pilula h-14 md:h-16 px-6 items-center gap-2 text-[15px] fraco">
                <button v-for="(m, i) in EXEMPLOS" :key="m.nome" class="palavra whitespace-nowrap" :class="i === atual ? 'text-tinta' : ''" @click="atual = i">{{ m.nome }}</button>
              </div>
            </div>
            <div
              v-for="(p, i) in CARDAPIO"
              :key="p.nome"
              class="pilula h-16 md:h-[4.75rem] px-3 md:px-4 flex items-center gap-4 min-w-0"
              :class="i === linha && 'pilula-ativa'"
            >
              <Orbe :marca="marca" :semente="i + 3" tamanho="2.75rem" parado />
              <span class="flex flex-col min-w-0 leading-tight">
                <span class="text-[15px] md:text-base truncate">{{ p.nome }}</span>
                <span class="apagado text-[13px] md:text-sm truncate">{{ p.categoria }}</span>
              </span>
              <span class="ml-auto flex flex-col items-end leading-tight shrink-0">
                <span class="numero text-[15px] md:text-base">{{ p.preco }}</span>
                <span class="apagado text-[13px]">Preço</span>
              </span>
              <span class="hidden sm:flex flex-col items-end leading-tight shrink-0 w-20 pr-3">
                <span class="numero text-[15px] md:text-base">{{ p.hoje }}</span>
                <span class="apagado text-[13px]">Hoje</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="turno" class="px-5 md:px-8 lg:px-12 py-20 md:py-28 scroll-mt-10">
        <div class="grid lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] gap-10 lg:gap-16">
          <div class="flex flex-col gap-6">
            <h2 class="text-3xl md:text-4xl leading-[1.05] max-w-[16ch]">O turno inteiro, na cor da casa.</h2>
            <Palavras :itens="TURNOS" :model-value="turno" @update:model-value="verTurno" />
            <p class="fraco text-[17px] leading-snug max-w-[34ch]">
              <Transition name="surge" mode="out-in">
                <span :key="turno" class="block">{{ TURNOS.find((t) => t.id === turno)?.texto }}</span>
              </Transition>
            </p>
          </div>

          <div class="min-h-[22rem] min-w-0">
            <Transition name="surge" mode="out-in">
              <div v-if="turno === 'vender'" key="vender" class="flex flex-col gap-2">
                <div v-for="(p, i) in CARDAPIO" :key="p.nome" class="pilula h-16 px-6 flex items-center gap-4" :class="i < 2 && 'pilula-ativa'">
                  <span class="w-5 numero" :class="i >= 2 && 'apagado'">{{ i < 2 ? i + 1 : '+' }}</span>
                  <span class="truncate">{{ p.nome }}</span>
                  <span class="ml-auto numero">{{ p.preco }}</span>
                </div>
                <div class="bg-tinta text-chao rounded-[2rem] p-5 mt-2 flex items-center justify-between gap-4">
                  <span class="text-4xl numero font-medium leading-none">R$ 28</span>
                  <span class="flex gap-2 text-[15px]">
                    <span class="h-11 px-5 rounded-full bg-chao text-tinta flex items-center">Cartão</span>
                    <span class="h-11 px-5 rounded-full bg-chao/10 flex items-center">Pix</span>
                  </span>
                </div>
              </div>

              <div v-else-if="turno === 'mesas'" key="mesas" class="grid grid-cols-4 gap-3 md:gap-4 max-w-xl">
                <div v-for="n in 8" :key="n" class="aspect-square relative">
                  <Orbe v-if="n <= 3" :marca="marca" :semente="n" tamanho="100%">
                    <span class="text-xl md:text-2xl numero">{{ n }}</span>
                  </Orbe>
                  <span v-else class="vidro-disco absolute inset-0 rounded-full flex items-center justify-center text-lg md:text-xl numero fraco">{{ n }}</span>
                </div>
              </div>

              <div v-else-if="turno === 'cozinha'" key="cozinha" class="grid grid-cols-3 gap-3 md:gap-4">
                <div v-for="(itens, nome) in COZINHA" :key="nome" class="flex flex-col gap-2">
                  <p class="fraco text-[15px] px-2 mb-1">{{ nome }}</p>
                  <span v-for="item in itens" :key="item" class="pilula h-14 px-5 flex items-center text-[15px]" :class="nome === 'Pronto' && 'pilula-ativa'">{{ item }}</span>
                </div>
              </div>

              <div v-else-if="turno === 'estoque'" key="estoque" class="flex flex-wrap gap-6 md:gap-10">
                <div v-for="p in POTES" :key="p.nome" class="flex flex-col items-center gap-2 w-24 text-center">
                  <Vaso :quantidade="p.quantidade" :minimo="p.minimo" :escala="p.escala" :status="p.status" :tamanho="88" />
                  <span class="text-sm fraco">{{ p.nome }}</span>
                </div>
              </div>

              <div v-else key="caixa" class="flex items-center">
                <Orbe :marca="marca" tamanho="min(56vw, 15rem)">
                  <span class="text-sm opacity-80">Entrou</span>
                  <span class="text-3xl numero leading-none mt-1">R$ 1.218</span>
                </Orbe>
                <div class="-ml-10">
                  <Orbe claro tamanho="min(56vw, 15rem)">
                    <span class="text-sm opacity-60">Sobrou</span>
                    <span class="text-3xl numero leading-none mt-1">R$ 742</span>
                  </Orbe>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <section id="marca" class="px-5 md:px-8 lg:px-12 py-20 md:py-28 scroll-mt-10">
        <div class="grid lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] gap-10 lg:gap-16">
          <div class="flex flex-col gap-6">
            <h2 class="text-3xl md:text-4xl leading-[1.05] max-w-[14ch]">A tela vira a marca a cada escolha.</h2>
            <p class="fraco text-[17px] leading-snug max-w-[34ch]">Cinco perguntas, uma por tela. Depois o cardápio se escreve como no quadro, e mesas e prateleira vêm na sequência.</p>
          </div>
          <ol class="flex flex-col gap-2">
            <li v-for="(p, i) in RITUAL" :key="p" class="pilula h-16 md:h-[4.75rem] px-3 md:px-4 flex items-center gap-4 text-lg md:text-xl">
              <span class="w-11 h-11 rounded-full vidro-disco flex items-center justify-center text-[15px] numero fraco shrink-0">{{ i + 1 }}</span>
              {{ p }}
            </li>
          </ol>
        </div>
      </section>

      <section class="px-5 md:px-8 lg:px-12 pt-10 pb-20 md:pb-28 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <h2 class="text-4xl md:text-5xl leading-[1.02] max-w-[12ch]">Abre o caixa com a sua cara.</h2>
        <RouterLink to="/comecar" class="bloco h-14 px-7 text-base inline-flex items-center gap-3 self-start md:self-auto">
          Criar minha marca <span aria-hidden="true">→</span>
        </RouterLink>
      </section>
    </div>
  </div>
</template>
