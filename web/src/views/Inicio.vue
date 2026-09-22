<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { sessao } from '../lib/sessao'
import { criarDemonstracao } from '../lib/demoRapida'
import { avisarErro } from '../lib/avisos'
import Orbe from '../components/Orbe.vue'
import Palavras from '../components/Palavras.vue'
import Vaso from '../components/Vaso.vue'

const router = useRouter()
const criando = ref(false)

const EXEMPLOS = [
  { nome: 'Logico', corPrimaria: '#0000FF', corDestaque: '#9AA8FF', fonte: 'DIN 2014' },
  { nome: 'Café Aurora', corPrimaria: '#C8653C', corDestaque: '#F2C14E', fonte: 'Fraunces' },
  { nome: 'Bar do Porto', corPrimaria: '#6F7BD9', corDestaque: '#C9B8FF', fonte: 'Space Grotesk' },
  { nome: 'Cantina Nona', corPrimaria: '#5F8F8A', corDestaque: '#D8D2C4', fonte: 'Archivo' },
]

const TURNOS = [
  { id: 'vender', rotulo: 'Vender', frase: 'vender', texto: 'Toca no produto, soma na barra. Cartão registra na hora. Pix e dinheiro abrem tela cheia.' },
  { id: 'mesas', rotulo: 'Mesas', frase: 'as mesas', texto: 'Mesas redondas. Ocupada vira orbe. Livre é vidro. Tocar lança o pedido.' },
  { id: 'cozinha', rotulo: 'Cozinha', frase: 'a cozinha', texto: 'O mesmo item da comanda. Tocar passa de coluna: fila, fazendo, pronto.' },
  { id: 'estoque', rotulo: 'Estoque', frase: 'o estoque', texto: 'Potes mostram o nível. A linha é o mínimo. Comprar monta o pedido por fornecedor.' },
  { id: 'caixa', rotulo: 'Caixa', frase: 'o caixa', texto: 'O orbe do caixa diz quanto entrou e quanto sobrou. Sem gráfico, com o dia.' },
]

const RITUAL = [
  'Como se chama?',
  'Qual é a cor?',
  'A logo no círculo',
  'Qual a letra?',
  'Quem cuida?',
]

const CARDAPIO = [
  { nome: 'Espresso', preco: '7' },
  { nome: 'Cappuccino', preco: '14' },
  { nome: 'Latte', preco: '15' },
  { nome: 'Pão de queijo', preco: '8' },
]

const POTES = [
  { nome: 'Café', quantidade: 3.2, minimo: 1, escala: 5, status: 'ok' },
  { nome: 'Leite', quantidade: 7, minimo: 8, escala: 12, status: 'baixo' },
  { nome: 'Copo', quantidade: 40, minimo: 80, escala: 200, status: 'critico' },
  { nome: 'Açúcar', quantidade: 4, minimo: 1, escala: 6, status: 'ok' },
]

const COZINHA = {
  fila: ['2 latte', '1 mocha'],
  fazendo: ['1 cappuccino'],
  pronto: ['3 espresso'],
}

const atual = ref(0)
const momento = ref(0)
const turno = ref('vender')
const escolheuTurno = ref(false)
const reduzMovimento = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function avancarMarca() {
  atual.value = (atual.value + 1) % EXEMPLOS.length
}

function avancarTurno() {
  if (escolheuTurno.value) return
  momento.value = (momento.value + 1) % TURNOS.length
  turno.value = TURNOS[momento.value].id
}

const giroMarca = reduzMovimento ? 0 : setInterval(avancarMarca, 3400)
const giroTurno = reduzMovimento ? 0 : setInterval(avancarTurno, 2800)

onBeforeUnmount(() => {
  clearInterval(giroMarca)
  clearInterval(giroTurno)
  document.documentElement.style.scrollBehavior = ''
})
document.documentElement.style.scrollBehavior = 'smooth'

function verTurno(id) {
  escolheuTurno.value = true
  turno.value = id
  const i = TURNOS.findIndex((t) => t.id === id)
  if (i >= 0) momento.value = i
}

function verMarca(i) {
  atual.value = i
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
  <div class="min-h-[100dvh] flex flex-col">
    <header class="sticky top-0 z-30 px-5 md:px-12 pt-5 md:pt-6 pb-3 bg-chao/90 backdrop-blur-md">
      <div class="vidro-barra rounded-r flex items-baseline justify-between gap-6 text-lg aberto px-5 py-3 w-full entra" style="--i: 0">
        <a href="#topo" class="palavra">Junie</a>
        <nav class="hidden md:flex gap-8" aria-label="Página">
          <a href="#turno" class="palavra">Produto</a>
          <a href="#marca" class="palavra">Marca</a>
        </nav>
        <RouterLink v-if="sessao.token" to="/app" class="palavra">{{ sessao.tenant?.nome }}</RouterLink>
        <RouterLink v-else to="/entrar" class="palavra">Entrar</RouterLink>
      </div>
    </header>

    <main id="topo" class="flex-1">
      <section class="px-5 md:px-12 pt-6 md:pt-8 pb-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8 lg:gap-12">
        <div class="order-2 md:order-1 flex flex-col gap-6 md:gap-8 min-w-0">
          <h1 class="text-[clamp(2.25rem,8vw,3.75rem)] leading-[0.92] entra" style="--i: 1">
            <span class="block">O sistema para</span>
            <span class="block whitespace-nowrap" aria-live="polite">
              <Transition name="surge" mode="out-in">
                <span :key="momento" class="inline-block">{{ TURNOS[momento].frase }}</span>
              </Transition>
            </span>
          </h1>
          <p class="text-lg md:text-xl leading-snug max-w-[36ch] fraco entra" style="--i: 2">
            Marca, cardápio, mesas e estoque. O PDV sai com a identidade da casa.
          </p>
          <div class="flex flex-col items-start gap-4 entra" style="--i: 3">
            <RouterLink to="/comecar" class="bloco h-16 md:h-20 px-7 md:px-8 text-lg md:text-2xl aberto w-max max-w-full flex items-center gap-8 whitespace-nowrap">
              <span>Criar minha marca</span><span aria-hidden="true">→</span>
            </RouterLink>
            <button class="palavra text-xl md:text-2xl" :disabled="criando" @click="demonstracao">
              {{ criando ? 'Abrindo o Café Aurora…' : 'Ver demonstração' }}
            </button>
          </div>
        </div>

        <div class="order-1 md:order-2 flex justify-center md:justify-end entra" style="--i: 0">
          <div class="w-[min(52vw,14rem)] md:w-[min(26vw,16rem)] lg:w-[min(30vw,22rem)] aspect-square">
            <Orbe :marca="EXEMPLOS[atual]" :semente="atual" tamanho="100%">
              <span class="text-xl md:text-3xl leading-none px-[8%]" :style="{ fontFamily: `var(--fonte)` }">{{ EXEMPLOS[atual].nome }}</span>
            </Orbe>
          </div>
        </div>
      </section>

      <div class="px-5 md:px-12">
        <div class="regua flex flex-wrap gap-x-8 gap-y-3 text-2xl md:text-4xl py-6 md:py-8" role="list">
          <button
            v-for="(m, i) in EXEMPLOS"
            :key="m.nome"
            class="palavra"
            :class="i !== atual && 'apagado'"
            @click="verMarca(i)"
          >{{ m.nome }}</button>
        </div>
      </div>

      <section id="turno" class="px-5 md:px-12 py-16 md:py-24 scroll-mt-24">
        <h2 class="text-3xl md:text-5xl leading-[0.95] max-w-[18ch] mb-8 md:mb-12">O turno inteiro, na cor da casa.</h2>
        <Palavras :itens="TURNOS" :model-value="turno" tamanho="text-2xl lg:text-4xl" @update:model-value="verTurno" />

        <div class="mt-10 md:mt-14 grid md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-8 lg:gap-16 items-start">
          <p class="text-xl md:text-2xl fraco max-w-[36ch] lg:pt-2">
            <Transition name="surge" mode="out-in">
              <span :key="turno" class="block">{{ TURNOS.find(t => t.id === turno)?.texto }}</span>
            </Transition>
          </p>

          <div class="min-h-[18rem] min-w-0">
            <Transition name="surge" mode="out-in">
              <div v-if="turno === 'vender'" key="vender" class="flex flex-col">
                <ul>
                  <li v-for="p in CARDAPIO" :key="p.nome" class="flex justify-between py-4 md:py-5 regua text-2xl md:text-4xl leading-none">
                    <span>{{ p.nome }}</span><span class="numero">{{ p.preco }}</span>
                  </li>
                </ul>
                <div class="bloco mt-0 h-20 md:h-24 px-5 md:px-8 flex items-center justify-between gap-4">
                  <span class="text-4xl md:text-6xl leading-none numero">44</span>
                  <span class="flex gap-4 md:gap-8 text-lg md:text-2xl whitespace-nowrap">
                    <span>Dinheiro</span><span>Cartão</span><span>Pix</span>
                  </span>
                </div>
              </div>

              <div v-else-if="turno === 'mesas'" key="mesas">
                <div class="grid grid-cols-4 lg:grid-cols-8 gap-3 md:gap-5">
                  <div v-for="n in 8" :key="n" class="aspect-square relative">
                    <Orbe v-if="n <= 3" :marca="EXEMPLOS[atual]" :semente="n" tamanho="100%">
                      <span class="text-xl md:text-2xl numero">{{ n }}</span>
                    </Orbe>
                    <span v-else class="vidro-disco absolute inset-0 rounded-full flex items-center justify-center text-xl md:text-2xl numero">{{ n }}</span>
                  </div>
                </div>
              </div>

              <div v-else-if="turno === 'cozinha'" key="cozinha">
                <div class="grid grid-cols-3 gap-6 md:gap-10">
                  <div v-for="[nome, itens] in Object.entries(COZINHA)" :key="nome">
                    <p class="text-lg md:text-2xl mb-4">{{ nome }}</p>
                    <button v-for="item in itens" :key="item" class="palavra w-full text-left py-3 regua-fina text-lg md:text-2xl">{{ item }}</button>
                  </div>
                </div>
              </div>

              <div v-else-if="turno === 'estoque'" key="estoque">
                <div class="flex flex-wrap gap-8 md:gap-12">
                  <div v-for="p in POTES" :key="p.nome" class="flex flex-col items-center gap-2 w-24 text-center">
                    <Vaso :quantidade="p.quantidade" :minimo="p.minimo" :escala="p.escala" :status="p.status" :tamanho="88" />
                    <span class="text-sm">{{ p.nome }}</span>
                  </div>
                </div>
              </div>

              <div v-else key="caixa" class="flex items-center">
                <Orbe :marca="EXEMPLOS[atual]" tamanho="min(52vw, 16rem)">
                  <span class="text-sm aberto mb-2">Hoje</span>
                  <span class="text-3xl md:text-4xl leading-none">o caixa</span>
                </Orbe>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <section id="marca" class="px-5 md:px-12 py-16 md:py-24 scroll-mt-24">
        <h2 class="text-3xl md:text-5xl leading-[0.95] max-w-[16ch] mb-10 md:mb-16">A tela vira a marca a cada escolha.</h2>
        <div>
          <p v-for="(p, i) in RITUAL" :key="p" class="regua py-5 md:py-7 text-2xl sm:text-4xl md:text-5xl lg:text-6xl leading-none flex justify-between gap-6">
            <span>{{ p }}</span>
            <span class="apagado numero text-lg md:text-2xl self-end hidden sm:block">{{ i + 1 }}</span>
          </p>
        </div>
        <p class="fraco text-lg md:text-xl mt-10 max-w-[46ch]">Depois, o cardápio se escreve como no quadro. Mesas e prateleira na sequência. Ou começa pela demonstração.</p>
      </section>

      <section class="px-5 md:px-12 py-16 md:py-24">
        <h2 class="text-[clamp(2.25rem,8vw,3.75rem)] leading-[0.92] max-w-[12ch] mb-10">Abre o caixa com a sua cara.</h2>
        <RouterLink to="/comecar" class="bloco h-20 md:h-24 px-7 md:px-8 text-xl md:text-3xl aberto w-max max-w-full flex items-center gap-8 whitespace-nowrap">
          <span>Criar minha marca</span><span aria-hidden="true">→</span>
        </RouterLink>
      </section>
    </main>
  </div>
</template>
