<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { vitrine, produtos, resumo, mudar, vender, mostrar } from '../../lib/vitrine'
import { brl, qtd } from '../../lib/formato'
import Orbe from '../Orbe.vue'
import Pontos from '../Pontos.vue'
import Palavras from '../Palavras.vue'

/**
 * A dobra é um balcão: a comanda se monta sozinha, cobra e começa outra.
 * De um lado o terminal (o PDV), do outro o palco: a esfera é a tela do
 * cliente e o fluxo mostra o que cada pagamento dispara.
 * Tocar em qualquer coisa assume o caixa, e a venda passa a valer para a
 * página inteira (cozinha, estoque e caixa lá embaixo).
 */
const props = defineProps({ marca: { type: Object, required: true } })

const ROTEIROS = [
  [['cappuccino', 2], ['pao de queijo', 1]],
  [['latte gelado', 1], ['espresso', 1]],
  [['espresso', 2], ['pao de queijo', 2]],
]
const STATUS = { pix: 'Esperando o Pix…', cartao: 'Passando o cartão…' }
const FORMA = { pix: 'Pix', cartao: 'cartão' }

const reduzMovimento = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const auto = ref(!reduzMovimento)
const simulado = reactive({})
const fase = ref('somando') // 'somando' | 'pix' | 'cartao' | 'pago'
const tocado = ref(null)
const apertado = ref(null)
const pago = ref(0)
/** Vendas do piloto automático: só enfeitam o "Hoje", não mexem no estoque. */
const extra = reactive({ valor: 0, vendas: 0 })

const carrinho = computed(() => (auto.value ? simulado : vitrine.carrinho))
const aba = ref('tudo')
const abas = computed(() => [{ id: 'tudo', rotulo: 'Tudo' }, ...[...new Set(produtos.value.map((p) => p.categoria))].map((c) => ({ id: c, rotulo: c }))])
const balcao = computed(() => (aba.value === 'tudo' ? produtos.value.slice(0, 5) : produtos.value.filter((p) => p.categoria === aba.value)))
const total = computed(() => produtos.value.reduce((s, p) => s + p.preco * (carrinho.value[p.id] ?? 0), 0))
const itens = computed(() => Object.values(carrinho.value).reduce((s, q) => s + q, 0))
const hoje = computed(() => Math.round(resumo.value.faturamento + extra.valor).toLocaleString('pt-BR'))
const redondo = (v) => brl(v).replace(',00', '')

// ---------- depois do toque: o que a venda dispara ----------

/** Foto da última comanda paga, para o fluxo continuar aceso depois do pagamento. */
const ultima = ref(null)
const linhas = computed(() => produtos.value.filter((p) => carrinho.value[p.id]).map((p) => ({ produto: p, q: carrinho.value[p.id] })))

function registrar(forma) {
  ultima.value = { linhas: linhas.value.map((l) => ({ ...l, produto: { ...l.produto, ficha: l.produto.ficha.map((f) => ({ ...f })) } })), total: total.value, forma }
}

function baixas(lista) {
  const soma = new Map()
  for (const { produto, q } of lista) for (const f of produto.ficha) soma.set(f.insumo, (soma.get(f.insumo) ?? 0) + f.quantidade * q)
  return [...soma]
    .map(([id, v]) => {
      const i = vitrine.insumos.find((x) => x.id === id)
      return i && `${i.nome} −${qtd(v, i.unidade)}`
    })
    .filter(Boolean)
    .join(' · ')
}

const fluxo = computed(() => {
  const aberta = linhas.value.length > 0
  const c = aberta ? { linhas: linhas.value, total: total.value } : ultima.value
  if (!c) return null
  const pagou = !aberta
  const n = c.linhas.reduce((s, l) => s + l.q, 0)
  return {
    pagou,
    passos: [
      {
        rotulo: 'Caixa',
        texto: pagou ? `${redondo(c.total)} no ${FORMA[c.forma]}` : `${n} ${n > 1 ? 'itens' : 'item'} · ${redondo(c.total)}`,
        sub: pagou ? 'Recebido' : STATUS[fase.value] ?? 'Comanda aberta',
      },
      { rotulo: 'Cozinha', texto: c.linhas.map((l) => `${l.q} ${l.produto.nome.toLowerCase()}`).join(', '), sub: pagou ? 'Na fila' : 'Vai para a fila' },
      { rotulo: 'Estoque', texto: baixas(c.linhas) || 'Sem ficha, nada a baixar', sub: pagou ? 'Baixado' : 'Vai baixar' },
    ],
  }
})

const numeroComanda = computed(() => 128 + extra.vendas + vitrine.vendas.length)

const relogio = ref('')
const acertar = () => (relogio.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
acertar()
const tique = setInterval(acertar, 20000)

// ---------- piloto automático ----------

let geracao = 0
let montado = false
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const limpar = (obj) => Object.keys(obj).forEach((k) => delete obj[k])

async function rodar() {
  const eu = ++geracao
  const vivo = () => montado && auto.value && eu === geracao
  for (let r = 0; vivo(); r++) {
    await espera(900)
    for (const [id, q] of ROTEIROS[r % ROTEIROS.length]) {
      if (!produtos.value.some((p) => p.id === id)) continue
      for (let k = 0; k < q; k++) {
        await espera(620)
        if (!vivo()) return
        simulado[id] = (simulado[id] ?? 0) + 1
        tocado.value = id
      }
    }
    await espera(700)
    tocado.value = null
    if (!vivo() || !total.value) continue
    const forma = r % 2 ? 'cartao' : 'pix'
    apertado.value = forma
    fase.value = forma
    await espera(forma === 'pix' ? 1900 : 1200)
    if (!vivo()) return
    apertado.value = null
    registrar(forma)
    pago.value = total.value
    extra.valor += total.value
    extra.vendas++
    limpar(simulado)
    fase.value = 'pago'
    await espera(1700)
    if (!vivo()) return
    fase.value = 'somando'
  }
}

onMounted(() => {
  montado = true
  if (auto.value) rodar()
})
onBeforeUnmount(() => {
  montado = false
  clearInterval(tique)
})

/** Passa o balcão para a pessoa, com a comanda que estiver aberta. */
function assumir() {
  if (!auto.value) return
  auto.value = false
  for (const [id, q] of Object.entries(simulado)) vitrine.carrinho[id] = q
  limpar(simulado)
  tocado.value = null
  apertado.value = null
  if (fase.value !== 'pix') fase.value = 'somando'
}

// ---------- mãos da pessoa ----------

function tocar(p, delta = 1) {
  assumir()
  mudar(p, delta)
  tocado.value = p.id
  fase.value = 'somando'
}

function cobrar(forma) {
  assumir()
  if (!total.value) return
  if (forma === 'pix' && fase.value !== 'pix') fase.value = 'pix'
  else pagar(forma)
}

function pagar(forma) {
  registrar(forma)
  pago.value = total.value
  vender(forma)
  fase.value = 'pago'
  setTimeout(() => fase.value === 'pago' && (fase.value = 'somando'), 2400)
}
</script>

<template>
  <div class="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)_auto] gap-6 xl:gap-x-8 min-w-0">
    <!-- palco: a tela do cliente e o dia em número -->
    <div class="relative xl:col-start-2 xl:row-start-1 min-w-0">
      <div class="brilho-palco" aria-hidden="true" />
      <div class="relative h-full flex items-center justify-center py-2 xl:py-0">
        <Orbe :marca="props.marca" tamanho="min(64vw, 40vh, 27rem)">
          <Transition name="surge" mode="out-in">
            <div v-if="fase === 'pago'" key="pago" class="flex flex-col items-center">
              <svg class="w-[16cqw] h-[16cqw] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              <span class="text-[clamp(1.2rem,11cqw,3rem)] numero leading-none">{{ redondo(pago) }}</span>
              <span class="text-[clamp(0.7rem,3.6cqw,1rem)] opacity-80 mt-2">Pago · já na cozinha</span>
            </div>
            <div v-else-if="fase === 'pix' || fase === 'cartao'" :key="fase" class="flex flex-col items-center">
              <Pontos class="mb-3" />
              <span class="text-[clamp(1.2rem,11cqw,3rem)] numero leading-none">{{ redondo(total) }}</span>
              <span class="text-[clamp(0.7rem,3.6cqw,1rem)] opacity-80 mt-2">{{ STATUS[fase] }}</span>
            </div>
            <div v-else key="somando" class="flex flex-col items-center">
              <span class="text-[clamp(0.7rem,3.6cqw,1rem)] opacity-80 mb-1">{{ itens ? `${itens} ${itens > 1 ? 'itens' : 'item'}` : 'Comanda' }}</span>
              <span class="text-[clamp(1.2rem,11cqw,3rem)] numero leading-none">{{ redondo(total) }}</span>
              <span class="text-[clamp(0.7rem,3.6cqw,1rem)] opacity-80 mt-2">{{ itens ? 'Somando a comanda…' : 'Toque num produto' }}</span>
            </div>
          </Transition>
        </Orbe>
        <!-- a lua: o dia inteiro, girando em volta da venda -->
        <div class="-ml-[18%] self-end mb-[4%] shrink-0">
          <Orbe claro tamanho="min(38vw, 23vh, 15rem)">
            <span class="text-[clamp(0.65rem,4.4cqw,0.9rem)] opacity-60">Hoje</span>
            <Transition name="surge" mode="out-in">
              <span :key="hoje" class="text-[clamp(1rem,13cqw,2.1rem)] leading-none numero mt-1">R$ {{ hoje }}</span>
            </Transition>
            <span class="text-[clamp(0.7rem,6cqw,1rem)] numero mt-2 opacity-70">{{ resumo.vendas + extra.vendas }} vendas</span>
          </Orbe>
        </div>
      </div>
    </div>

    <!-- depois do toque: o que o pagamento dispara, em ordem -->
    <div class="fluxo relative xl:col-start-2 xl:row-start-2 rounded-[28px] p-5 md:p-6 min-w-0">
        <div class="flex items-baseline justify-between gap-4 mb-4">
          <span class="text-[15px]">Depois do toque</span>
          <span class="apagado text-[13px]">{{ fluxo?.pagou ? 'aconteceu agora' : 'acontece ao cobrar' }}</span>
        </div>
        <ol v-if="fluxo" class="relative flex flex-col gap-4">
          <span class="absolute left-[0.9rem] top-4 bottom-4 w-px bg-tinta/10" aria-hidden="true" />
          <li v-for="(f, i) in fluxo.passos" :key="f.rotulo" class="relative flex items-center gap-4 min-w-0">
            <span
              class="marco w-[1.85rem] h-[1.85rem] rounded-full shrink-0 flex items-center justify-center"
              :class="fluxo.pagou ? 'aceso' : 'vidro-disco'"
              :style="{ transitionDelay: fluxo.pagou ? `${i * 220}ms` : '0ms' }"
            >
              <svg v-if="fluxo.pagou" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              <span v-else class="w-1.5 h-1.5 rounded-full bg-tinta/40" />
            </span>
            <span class="w-16 shrink-0 apagado text-[13px]">{{ f.rotulo }}</span>
            <span class="flex flex-col min-w-0 leading-tight">
              <Transition name="surge" mode="out-in">
                <span :key="f.texto" class="text-[15px] truncate">{{ f.texto }}</span>
              </Transition>
              <span class="apagado text-[12px] mt-0.5">{{ f.sub }}</span>
            </span>
          </li>
        </ol>
        <p v-else class="fraco text-[15px]">Toque num produto e veja a venda correr.</p>
    </div>

    <!-- terminal: o PDV como aparelho -->
    <div class="terminal xl:col-start-1 xl:row-start-1 xl:row-span-2 row-start-2 rounded-[28px] p-2.5 md:p-3 flex flex-col min-w-0">
      <div class="flex items-center gap-3 px-3 pt-2 pb-4">
        <Orbe :marca="props.marca" tamanho="1.75rem" parado />
        <span class="text-[15px] truncate">{{ props.marca.nome }}</span>
        <span class="ml-auto flex items-center gap-2 apagado text-[13px] numero shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-destaque" aria-hidden="true" />
          Caixa aberto · {{ relogio }}
        </span>
      </div>

      <Palavras v-model="aba" :itens="abas" class="px-1 pb-3 !hidden min-[1800px]:!flex" />

      <ul class="flex flex-col gap-2">
        <li v-for="(p, i) in balcao" :key="p.id" class="flex items-center gap-2">
          <button
            class="pilula flex-1 h-16 xl:h-[4.5rem] min-[1800px]:h-20 px-3 md:px-4 flex items-center gap-4 min-w-0 text-left"
            :class="[carrinho[p.id] && 'pilula-ativa', tocado === p.id && 'toque']"
            @click="tocar(p)"
            @animationend="tocado = null"
          >
            <span v-if="carrinho[p.id]" class="w-10 h-10 rounded-full bg-tinta text-chao flex items-center justify-center text-[15px] numero shrink-0">{{ carrinho[p.id] }}</span>
            <Orbe v-else :marca="props.marca" :semente="i + 3" tamanho="2.5rem" parado />
            <span class="flex flex-col min-w-0 leading-tight">
              <span class="text-[15px] md:text-base truncate">{{ p.nome }}</span>
              <span class="apagado text-[13px] truncate">{{ p.categoria }}</span>
            </span>
            <span class="ml-auto numero text-[15px] md:text-base pr-2">{{ String(p.preco).replace('.', ',') }}</span>
          </button>
          <button
            class="pilula w-16 h-16 xl:h-[4.5rem] xl:w-[4.5rem] min-[1800px]:h-20 min-[1800px]:w-20 rounded-full text-2xl leading-none shrink-0"
            :class="!carrinho[p.id] && 'invisible'"
            :aria-label="`Tirar um ${p.nome}`"
            @click="tocar(p, -1)"
          >−</button>
        </li>
      </ul>

      <!-- comanda: o recibo se escrevendo, ocupa o vão até a barra -->
      <div class="flex-1 min-h-4 flex flex-col justify-end px-4 pt-6 pb-4">
        <div class="hidden md:flex items-baseline justify-between text-[13px] apagado regua-fina pb-2 mb-1">
          <span>Comanda <span class="numero">{{ numeroComanda }}</span></span>
          <span>{{ itens ? `${itens} ${itens > 1 ? 'itens' : 'item'}` : 'vazia' }}</span>
        </div>
        <TransitionGroup name="linha" tag="ul" class="hidden md:flex flex-col">
          <li v-for="l in linhas" :key="l.produto.id" class="flex items-baseline gap-3 py-1.5 text-[15px] numero">
            <span class="w-7 apagado">{{ l.q }}×</span>
            <span class="truncate">{{ l.produto.nome }}</span>
            <span class="flex-1 border-b border-dotted border-tinta/15 translate-y-[-4px]" aria-hidden="true" />
            <span>{{ redondo(l.produto.preco * l.q) }}</span>
          </li>
        </TransitionGroup>
      </div>

      <!-- barra de total: sempre no lugar, para a página não pular -->
      <div class="bg-tinta text-chao rounded-[2rem] p-4 pl-6 flex items-center justify-between gap-3">
        <Transition name="surge" mode="out-in">
          <span v-if="fase === 'pago'" key="pago" class="text-[15px]">Pronto. Próximo cliente.</span>
          <span v-else :key="'t'" class="text-3xl md:text-4xl numero font-medium leading-none" :class="!total && 'opacity-30'">{{ redondo(total) }}</span>
        </Transition>
        <span v-if="fase === 'pix' && !auto" class="flex gap-2 text-[15px]">
          <button class="h-11 px-4 rounded-full bg-chao/10 hover:bg-chao/20 transition-colors" @click="fase = 'somando'">Voltar</button>
          <button class="h-11 px-5 rounded-full bg-chao text-tinta" @click="pagar('pix')">Pix recebido →</button>
        </span>
        <span v-else class="flex gap-2 text-[15px]">
          <button
            class="h-11 px-5 rounded-full bg-chao text-tinta transition-[opacity,transform] duration-150 hover:opacity-85 disabled:opacity-30"
            :class="apertado === 'cartao' && 'scale-95 opacity-80'"
            :disabled="!total || fase === 'pago'"
            @click="cobrar('cartao')"
          >Cartão</button>
          <button
            class="h-11 px-5 rounded-full transition-[background-color,transform] duration-150 disabled:opacity-30"
            :class="apertado === 'pix' ? 'bg-chao/25 scale-95' : 'bg-chao/10 hover:bg-chao/20'"
            :disabled="!total || fase === 'pago'"
            @click="cobrar('pix')"
          >Pix</button>
        </span>
      </div>

      <p class="px-3 pt-3 pb-1 text-[13px] apagado h-8">
        <Transition name="surge" mode="out-in">
          <span v-if="auto" key="a">Piloto automático. Toque para assumir o caixa.</span>
          <button v-else key="m" class="palavra" @click="mostrar('cozinha')">A venda segue para cozinha, estoque e caixa ↓</button>
        </Transition>
      </p>
    </div>
  </div>
</template>

<style scoped>
.terminal,
.fluxo {
  background: rgb(var(--tinta) / 0.04);
  box-shadow: inset 0 0 0 1px rgb(var(--tinta) / 0.07);
}
.fluxo {
  background: rgb(var(--chao) / 0.5);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
}

/* O entardecer vaza da esfera para o palco. */
.brilho-palco {
  position: absolute;
  inset: -10% -6% 20%;
  pointer-events: none;
  background:
    radial-gradient(38% 34% at 46% 58%, color-mix(in srgb, rgb(var(--destaque)) 30%, transparent), transparent 70%),
    radial-gradient(55% 50% at 50% 40%, color-mix(in srgb, rgb(var(--marca)) 34%, transparent), transparent 72%);
  filter: blur(40px);
  opacity: 0.8;
  transition: background 0.8s var(--ease-out);
}

.marco { transition: background-color 0.35s var(--ease-out), color 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out); }
.marco.aceso {
  background: rgb(var(--tinta));
  color: rgb(var(--chao));
  box-shadow: 0 0 0 4px rgb(var(--destaque) / 0.18);
}

.toque { animation: toque 260ms var(--ease-out); }
@keyframes toque {
  40% { transform: scale(0.985); background: rgb(var(--tinta) / 0.26); }
}
</style>
