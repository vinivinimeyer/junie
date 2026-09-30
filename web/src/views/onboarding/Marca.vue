<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../lib/api'
import { sessao, entrar, atualizarTenant } from '../../lib/sessao'
import { aplicarTema, carregarFonte, CORES, FONTES, MARCA_JUNIE, misturar } from '../../lib/theme'
import { lerLogo, coresDaLogo, prepararLogo } from '../../lib/imagem'
import { avisar, avisarErro } from '../../lib/avisos'
import Orbe from '../../components/Orbe.vue'
import LogoNoOrbe from '../../components/LogoNoOrbe.vue'
import Pontos from '../../components/Pontos.vue'
import Criando from '../../components/Criando.vue'

/**
 * Jornada 1. Uma pergunta por tela; não existe prévia separada porque a
 * própria tela vira a marca a cada escolha. Com `editando`, o mesmo ritual
 * serve para mudar a marca depois (sem a etapa de conta).
 */
const props = defineProps({ editando: Boolean })
const router = useRouter()
const RASCUNHO = 'junie-rascunho-marca'

function lerRascunho() {
  try {
    return JSON.parse(localStorage.getItem(RASCUNHO)) ?? {}
  } catch {
    return {}
  }
}

const inicial = props.editando ? { marca: sessao.tenant } : lerRascunho()
const marca = reactive({
  ...MARCA_JUNIE,
  nome: '',
  segmento: 'cafeteria',
  chavePix: '',
  cidadePix: '',
  logoEscala: 1,
  logoX: 0,
  logoY: 0,
  ...inicial.marca,
})
const conta = reactive({ nome: '', email: '', senha: '' })
const passo = ref(props.editando ? 0 : inicial.passo ?? 0)
const enviando = ref(false)
const sugeridas = ref([])
const arrastando = ref(false)
const arquivo = ref(null)

const PASSOS = props.editando ? ['nome', 'cor', 'logo', 'letra', 'salvar'] : ['nome', 'cor', 'logo', 'letra', 'conta']
const SEGMENTOS = [['cafeteria', 'Café'], ['bar', 'Bar'], ['restaurante', 'Restaurante'], ['padaria', 'Padaria'], ['outro', 'Outro']]

watch(marca, () => aplicarTema(marca), { deep: true, immediate: true })
watch([marca, passo], () => {
  if (props.editando) return
  try {
    localStorage.setItem(RASCUNHO, JSON.stringify({ marca, passo: passo.value }))
  } catch {
    // logo grande demais para o localStorage
  }
}, { deep: true })
onMounted(() => FONTES.forEach((f) => carregarFonte(f.nome)))

const pode = computed(() => {
  const etapa = PASSOS[passo.value]
  if (etapa === 'nome') return marca.nome.trim().length >= 2
  if (etapa === 'conta') return conta.nome.trim() && /\S+@\S+\.\S+/.test(conta.email) && conta.senha.length >= 6
  return true
})

// Cor de apoio: a mais contrastante entre claro e escuro da própria marca.
const apoios = computed(() => [misturar(marca.corPrimaria, '#FFFFFF', 0.6), misturar(marca.corPrimaria, '#000000', 0.45), ...CORES.filter((c) => c !== marca.corPrimaria).slice(0, 4)])

function escolherCor(cor) {
  marca.corPrimaria = cor
  marca.corDestaque = misturar(cor, '#FFFFFF', 0.6)
}

const ESCALA_MIN = 0.4
const ESCALA_MAX = 2.6
const EIXO = 42
const limitar = (n, min, max) => Math.min(max, Math.max(min, n))
const lendo = ref(false)
const chegou = ref(0)
const enquadro = reactive({ cobre: 1, cabe: 1, preenche: false })
function resetarEnquadro(escala = enquadro.preenche ? enquadro.cobre : enquadro.cabe) {
  marca.logoEscala = escala
  marca.logoX = 0
  marca.logoY = 0
}

async function receberLogo(file) {
  arrastando.value = false
  if (!file) return
  if (!file.type.startsWith('image/')) return avisarErro(new Error('Envie uma imagem PNG, JPG ou SVG'))
  lendo.value = true
  try {
    const [lida] = await Promise.all([lerLogo(file), new Promise((r) => setTimeout(r, 450))])
    const { logo, razao, preenche } = await prepararLogo(lida)
    enquadro.cobre = Math.min(ESCALA_MAX, Math.round((100 / (58 * Math.min(1, razao))) * 100) / 100)
    enquadro.cabe = Math.round((78 / (58 * Math.sqrt(1 + razao * razao))) * 100) / 100
    enquadro.preenche = preenche
    marca.logo = logo
    resetarEnquadro()
    chegou.value++
    sugeridas.value = await coresDaLogo(logo)
  } catch (e) {
    avisarErro(e)
  } finally {
    lendo.value = false
    if (arquivo.value) arquivo.value.value = ''
  }
}

function alternarEnquadro() {
  enquadro.preenche = !enquadro.preenche
  resetarEnquadro()
}
const zoom = computed({
  get: () => Number(marca.logoEscala) || 1,
  set: (v) => (marca.logoEscala = Math.round(Number(v) * 100) / 100),
})
const zoomRelativo = computed(() => Math.round((zoom.value / ((enquadro.preenche ? enquadro.cobre : enquadro.cabe) || 1)) * 100))
const zoomPct = computed(() => ((zoom.value - ESCALA_MIN) / (ESCALA_MAX - ESCALA_MIN)) * 100)

function mudarEscala(delta) {
  marca.logoEscala = Math.round(limitar(Number(marca.logoEscala) + delta, ESCALA_MIN, ESCALA_MAX) * 100) / 100
}

const gesto = ref(null)
function orbeRect(el) {
  return (el.closest('.orbe') ?? el).getBoundingClientRect()
}
function enquadrarInicio(e) {
  if (!marca.logo) return
  e.currentTarget.setPointerCapture(e.pointerId)
  const pts = gesto.value?.pts instanceof Map ? gesto.value.pts : new Map()
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pts.size === 2) {
    const [a, b] = [...pts.values()]
    gesto.value = { pts, pinch: Math.hypot(a.x - b.x, a.y - b.y), escala: Number(marca.logoEscala) || 1 }
  } else {
    gesto.value = { pts, x: e.clientX, y: e.clientY, lx: Number(marca.logoX) || 0, ly: Number(marca.logoY) || 0 }
  }
}
function enquadrarMove(e) {
  const g = gesto.value
  if (!g?.pts?.has(e.pointerId)) return
  g.pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (g.pts.size >= 2 && g.pinch) {
    const [a, b] = [...g.pts.values()]
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    marca.logoEscala = Math.round(limitar(g.escala * (dist / g.pinch), ESCALA_MIN, ESCALA_MAX) * 100) / 100
    return
  }
  const r = orbeRect(e.currentTarget)
  marca.logoX = limitar(g.lx + ((e.clientX - g.x) / r.width) * 100, -EIXO, EIXO)
  marca.logoY = limitar(g.ly + ((e.clientY - g.y) / r.height) * 100, -EIXO, EIXO)
}
function enquadrarFim(e) {
  if (!gesto.value) return
  gesto.value.pts?.delete(e.pointerId)
  if (!gesto.value.pts?.size) gesto.value = null
}
function zoomRodinha(e) {
  if (!marca.logo) return
  mudarEscala(e.deltaY > 0 ? -0.08 : 0.08)
}

function tirarLogo() {
  marca.logo = null
  sugeridas.value = []
  resetarEnquadro(1)
}

const ETAPAS_CRIAR = computed(() => props.editando
  ? ['Guardando a cor e a letra', 'Enquadrando a logo', 'Vestindo o caixa']
  : [`Abrindo ${marca.nome}`, 'Vestindo a tela com a sua cor', 'Separando a gaveta do Pix', 'Preparando o balcão'])

async function avancar() {
  if (!pode.value) return
  if (passo.value < PASSOS.length - 1) return passo.value++
  enviando.value = true
  const dados = {
    ...marca,
    logoEscala: Number(marca.logoEscala) || 1,
    logoX: Number(marca.logoX) || 0,
    logoY: Number(marca.logoY) || 0,
    chavePix: marca.chavePix || null,
    cidadePix: marca.cidadePix || null,
  }
  const pausa = new Promise((r) => setTimeout(r, props.editando ? 1900 : 3100))
  try {
    if (props.editando) {
      const [tenant] = await Promise.all([api.put('/marca', { ...dados, logo: marca.logo ?? null }), pausa])
      atualizarTenant(tenant)
      avisar('Marca atualizada')
      router.push('/app')
    } else {
      const [resposta] = await Promise.all([api.post('/auth/cadastro', { ...conta, marca: dados }), pausa])
      try {
        localStorage.removeItem(RASCUNHO)
      } catch {}
      entrar(resposta)
      router.push('/configurar')
    }
  } catch (e) {
    avisarErro(e)
    enviando.value = false
  }
}

function voltar() {
  if (passo.value > 0) passo.value--
  else router.push(props.editando ? '/app' : '/')
}
</script>

<template>
  <div class="min-h-[100dvh] flex flex-col" @keydown.enter.exact="PASSOS[passo] !== 'conta' && avancar()">
    <div class="flex h-1 gap-1" aria-hidden="true">
      <span v-for="(_, i) in PASSOS" :key="i" class="flex-1 transition-colors duration-300" :class="i <= passo ? 'bg-tinta' : 'bg-tinta/15'" />
    </div>

    <header class="flex justify-between items-baseline px-5 md:px-12 pt-6 text-lg aberto">
      <button class="palavra" @click="voltar">← {{ passo === 0 ? (editando ? 'App' : 'Junie') : 'Voltar' }}</button>
      <span class="apagado numero">{{ passo + 1 }}/{{ PASSOS.length }}</span>
    </header>

    <main class="flex-1 px-5 md:px-12 py-10 md:py-14 flex flex-col">
      <Transition name="surge" mode="out-in">
        <!-- NOME -->
        <section v-if="PASSOS[passo] === 'nome'" key="nome" class="flex-1 flex flex-col justify-center gap-12">
          <label for="nome" class="text-2xl md:text-3xl">Como se chama?</label>
          <input
            id="nome"
            v-model="marca.nome"
            autofocus
            autocomplete="organization"
            class="w-full bg-transparent regua outline-none text-4xl md:text-6xl pb-3 font-medium text-tinta placeholder:text-tinta/25"
            placeholder="Café Aurora"
          />
          <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Segmento">
            <button
              v-for="[id, rotulo] in SEGMENTOS"
              :key="id"
              role="radio"
              :aria-checked="marca.segmento === id"
              class="h-12 px-5 rounded-full text-[17px] transition-colors"
              :class="marca.segmento === id ? 'pilula pilula-ativa' : 'fraco hover:text-tinta'"
              @click="marca.segmento = id"
            >{{ rotulo }}</button>
          </div>
        </section>

        <!-- COR -->
        <section v-else-if="PASSOS[passo] === 'cor'" key="cor" class="flex-1 grid md:grid-cols-[1fr_auto] gap-12 items-center">
          <div class="flex flex-col gap-12">
            <h1 class="text-2xl md:text-3xl">Qual é a cor de {{ marca.nome }}?</h1>
            <div class="flex flex-wrap gap-4" role="radiogroup" aria-label="Cor da marca">
              <button
                v-for="c in CORES"
                :key="c"
                role="radio"
                :aria-checked="marca.corPrimaria === c"
                :aria-label="c"
                class="w-16 h-16 md:w-20 md:h-20 rounded-full transition-transform duration-200"
                :class="marca.corPrimaria === c ? 'scale-110 ring-4 ring-tinta ring-offset-4 ring-offset-chao' : 'hover:scale-105 active:scale-95'"
                :style="{ background: c }"
                @click="escolherCor(c)"
              />
              <label class="relative w-16 h-16 md:w-20 md:h-20 rounded-full cursor-pointer flex items-center justify-center text-2xl" style="border: 1.5px dashed rgb(var(--tinta) / .45)">
                <span aria-hidden="true">+</span>
                <input type="color" :value="marca.corPrimaria" class="absolute inset-0 opacity-0 cursor-pointer" aria-label="Outra cor" @input="escolherCor($event.target.value.toUpperCase())" />
              </label>
            </div>
            <div class="flex flex-col gap-4">
              <span class="text-lg fraco">Apoio</span>
              <div class="flex flex-wrap gap-3">
                <button
                  v-for="c in apoios"
                  :key="c"
                  :aria-label="`Cor de apoio ${c}`"
                  class="w-10 h-10 rounded-full"
                  :class="marca.corDestaque === c && 'ring-4 ring-tinta ring-offset-2 ring-offset-chao'"
                  :style="{ background: c }"
                  @click="marca.corDestaque = c"
                />
              </div>
            </div>
            <div class="flex gap-1.5" role="radiogroup" aria-label="Fundo">
              <button role="radio" :aria-checked="marca.tema === 'escuro'" class="h-12 px-5 rounded-full text-[17px] transition-colors" :class="marca.tema === 'escuro' ? 'pilula pilula-ativa' : 'fraco hover:text-tinta'" @click="marca.tema = 'escuro'">Fundo preto</button>
              <button role="radio" :aria-checked="marca.tema === 'claro'" class="h-12 px-5 rounded-full text-[17px] transition-colors" :class="marca.tema === 'claro' ? 'pilula pilula-ativa' : 'fraco hover:text-tinta'" @click="marca.tema = 'claro'">Fundo branco</button>
            </div>
          </div>
          <Orbe :marca="marca" tamanho="min(70vw, 26rem)" class="justify-self-center" />
        </section>

        <!-- LOGO -->
        <section v-else-if="PASSOS[passo] === 'logo'" key="logo" class="flex-1 flex flex-col items-center justify-center gap-7">
          <h1 class="text-2xl md:text-3xl text-center">A logo no círculo</h1>
          <div
            class="envio relative rounded-full touch-none outline-none"
            :class="[arrastando && 'solta', lendo && 'lendo', marca.logo ? (gesto ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer']"
            :aria-label="marca.logo ? 'Arraste para enquadrar a logo' : 'Enviar logo'"
            :role="marca.logo ? 'img' : 'button'"
            :tabindex="marca.logo ? -1 : 0"
            @click="!marca.logo && !lendo && arquivo.click()"
            @keydown.enter.space.prevent="!marca.logo && arquivo.click()"
            @dragenter.prevent="arrastando = true"
            @dragover.prevent="arrastando = true"
            @dragleave.self="arrastando = false"
            @drop.prevent="receberLogo($event.dataTransfer.files[0])"
            @pointerdown="enquadrarInicio"
            @pointermove="enquadrarMove"
            @pointerup="enquadrarFim"
            @pointercancel="enquadrarFim"
            @wheel.prevent="zoomRodinha"
          >
            <svg v-if="!marca.logo" class="anel-envio" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="49" fill="none" stroke="currentColor" stroke-width=".5" stroke-dasharray="1.2 2.6" stroke-linecap="round" />
            </svg>
            <Orbe :marca="marca" tamanho="min(74vw, 44vh, 24rem)" class="orbe-envio">
              <LogoNoOrbe v-if="marca.logo" :key="chegou" :marca="marca" class="logo-chega" />
              <div v-if="lendo" class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/35 backdrop-blur-sm text-white">
                <Pontos tamanho="1.6rem" />
                <span class="text-[15px]">Lendo a logo…</span>
              </div>
              <div v-else-if="!marca.logo" class="flex flex-col items-center gap-3">
                <span class="seta w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center" aria-hidden="true">
                  <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17V6M7 10.5 12 6l5 4.5" /><path d="M5 19h14" /></svg>
                </span>
                <span class="text-lg md:text-xl leading-tight">{{ arrastando ? 'Pode soltar' : 'Solte a logo aqui' }}</span>
                <span class="text-[13px] opacity-75">ou toque para escolher · PNG, JPG, SVG</span>
              </div>
              <div v-if="marca.logo && gesto" class="absolute inset-[8%] z-30 rounded-full border border-dashed border-white/60 pointer-events-none" aria-hidden="true" />
            </Orbe>
          </div>
          <input ref="arquivo" type="file" accept="image/*" class="hidden" @change="receberLogo($event.target.files[0])" />

          <Transition name="surge" mode="out-in">
            <div v-if="marca.logo" key="ajuste" class="flex flex-col items-center gap-5 w-full max-w-md">
              <div class="w-full flex items-center gap-3" role="group" aria-label="Tamanho da logo">
                <button class="pilula w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0" aria-label="Menor" :disabled="zoom <= ESCALA_MIN" @click="mudarEscala(-0.1)">−</button>
                <input v-model.number="zoom" type="range" :min="ESCALA_MIN" :max="ESCALA_MAX" step="0.01" class="regulador flex-1" :style="{ '--p': `${zoomPct}%` }" aria-label="Tamanho da logo" />
                <button class="pilula w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0" aria-label="Maior" :disabled="zoom >= ESCALA_MAX" @click="mudarEscala(0.1)">+</button>
                <span class="numero fraco text-[15px] w-12 text-right shrink-0">{{ zoomRelativo }}%</span>
              </div>
              <div class="flex flex-wrap justify-center gap-1.5">
                <button class="pilula h-10 px-4 rounded-full text-[15px]" @click="alternarEnquadro">{{ enquadro.preenche ? 'Caber inteira' : 'Preencher o círculo' }}</button>
                <button class="pilula h-10 px-4 rounded-full text-[15px]" @click="resetarEnquadro()">Centralizar</button>
                <button class="pilula h-10 px-4 rounded-full text-[15px]" @click="arquivo.click()">Trocar</button>
                <button class="h-10 px-4 rounded-full text-[15px] fraco hover:text-perigo transition-colors" @click="tirarLogo">Remover</button>
              </div>
              <p class="apagado text-[13px] text-center">Arraste para posicionar. Pinça ou roda do mouse para o tamanho.</p>
            </div>
            <p v-else key="sem" class="fraco text-[15px]">Sem logo, o nome vira a assinatura.</p>
          </Transition>

          <div v-if="sugeridas.length" class="flex items-center gap-3">
            <span class="fraco text-[15px]">Cores da logo</span>
            <button v-for="(c, i) in sugeridas" :key="c" :aria-label="`Usar ${c}`" class="cor-sugerida w-9 h-9 rounded-full transition-transform hover:scale-110 active:scale-95" :class="marca.corPrimaria === c && 'ring-2 ring-tinta ring-offset-2 ring-offset-chao'" :style="{ background: c, '--i': i }" @click="escolherCor(c)" />
          </div>
        </section>

        <!-- LETRA -->
        <section v-else-if="PASSOS[passo] === 'letra'" key="letra" class="flex-1 flex flex-col justify-center">
          <div role="radiogroup" aria-label="Letra">
            <button
              v-for="f in FONTES"
              :key="f.nome"
              role="radio"
              :aria-checked="marca.fonte === f.nome"
              class="w-full flex items-baseline justify-between gap-6 py-5 md:py-7 regua text-left transition-opacity"
              :class="marca.fonte === f.nome ? '' : 'opacity-35 hover:opacity-70'"
              @click="marca.fonte = f.nome"
            >
              <span class="text-3xl md:text-5xl leading-none truncate" :style="{ fontFamily: `${f.css}, sans-serif` }">{{ marca.nome }}</span>
              <span class="text-sm aberto shrink-0 hidden sm:block">{{ f.nome }}</span>
            </button>
          </div>
        </section>

        <!-- CONTA / SALVAR -->
        <section v-else key="fim" class="flex-1 grid md:grid-cols-[1fr_auto] gap-12 items-center">
          <form class="flex flex-col gap-4 max-w-lg w-full" @submit.prevent="avancar">
            <h1 class="text-2xl md:text-3xl mb-6">{{ editando ? 'Pix no caixa' : 'Quem cuida de ' + marca.nome + '?' }}</h1>
            <template v-if="!editando">
              <input v-model="conta.nome" class="campo" placeholder="seu nome" autocomplete="name" aria-label="Seu nome" />
              <input v-model="conta.email" type="email" class="campo" placeholder="e-mail" autocomplete="email" aria-label="E-mail" />
              <input v-model="conta.senha" type="password" class="campo" placeholder="senha (6 ou mais)" autocomplete="new-password" aria-label="Senha" />
            </template>
            <input v-model="marca.chavePix" class="campo" placeholder="chave pix (opcional)" aria-label="Chave Pix" />
            <input v-model="marca.cidadePix" class="campo" placeholder="cidade" aria-label="Cidade do Pix" />
            <button type="submit" class="hidden" />
          </form>
          <Orbe :marca="marca" tamanho="min(60vw, 20rem)" class="justify-self-center">
            <LogoNoOrbe v-if="marca.logo" :marca="marca" />
            <span v-else class="text-2xl md:text-3xl leading-none px-[12%]">{{ marca.nome }}</span>
          </Orbe>
        </section>
      </Transition>
    </main>

    <footer class="px-5 md:px-12 pb-8 flex justify-end">
      <button class="bloco h-16 px-8 text-lg min-w-[60%] md:min-w-[22rem] text-left flex items-center justify-between gap-6" :disabled="!pode || enviando" @click="avancar">
        <span>{{ passo < PASSOS.length - 1 ? 'Continuar' : enviando ? 'Salvando…' : editando ? 'Salvar marca' : `Criar ${marca.nome}` }}</span>
        <Pontos v-if="enviando" />
        <span v-else class="seta-bloco" aria-hidden="true">→</span>
      </button>
    </footer>

    <Criando :aberto="enviando" :marca="marca" :titulo="editando ? 'Salvando a marca' : `Criando ${marca.nome}`" :etapas="ETAPAS_CRIAR" />
  </div>
</template>

<style scoped>
.envio { transition: transform 0.35s var(--ease-out); }
.envio:focus-visible { box-shadow: 0 0 0 3px rgb(var(--chao)), 0 0 0 5px rgb(var(--tinta)); }
.envio.solta { transform: scale(1.04); }
.anel-envio {
  position: absolute;
  inset: -0.9rem;
  width: calc(100% + 1.8rem);
  height: calc(100% + 1.8rem);
  opacity: 0.45;
  animation: gira 40s linear infinite;
  transition: opacity 0.3s var(--ease-out);
}
.envio:hover .anel-envio, .envio.solta .anel-envio { opacity: 0.9; }
.envio.solta .anel-envio { animation-duration: 6s; }
.seta { transition: transform 0.35s var(--ease-out); }
.envio:hover .seta { transform: translateY(-3px); }
.envio.solta .seta { transform: translateY(-6px) scale(1.08); }
.logo-chega { animation: chega 0.55s var(--ease-out) both; }
.cor-sugerida { animation: pinga 0.4s var(--ease-out) both; animation-delay: calc(var(--i) * 60ms); }

.regulador {
  -webkit-appearance: none;
  appearance: none;
  height: 2.75rem;
  background: transparent;
  cursor: pointer;
}
.regulador::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(to right, rgb(var(--tinta)) var(--p), rgb(var(--tinta) / 0.14) var(--p));
}
.regulador::-moz-range-track { height: 4px; border-radius: 999px; background: rgb(var(--tinta) / 0.14); }
.regulador::-moz-range-progress { height: 4px; border-radius: 999px; background: rgb(var(--tinta)); }
.regulador::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  margin-top: calc(2px - 0.625rem);
  border-radius: 50%;
  background: rgb(var(--tinta));
  box-shadow: 0 0 0 4px rgb(var(--chao)), 0 2px 8px rgb(0 0 0 / 0.3);
  transition: transform 0.15s var(--ease-out);
}
.regulador::-moz-range-thumb {
  width: 1.25rem;
  height: 1.25rem;
  border: 0;
  border-radius: 50%;
  background: rgb(var(--tinta));
  box-shadow: 0 0 0 4px rgb(var(--chao));
}
.regulador:active::-webkit-slider-thumb { transform: scale(1.15); }
.regulador:focus-visible { outline: none; }
.regulador:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px rgb(var(--chao)), 0 0 0 6px rgb(var(--tinta) / 0.5); }

@keyframes gira { to { transform: rotate(360deg); } }
@keyframes chega { from { opacity: 0; scale: 0.6; filter: blur(10px); } }
@keyframes pinga { from { opacity: 0; transform: scale(0.3); } }
@media (prefers-reduced-motion: reduce) {
  .anel-envio { animation: none; }
}
</style>
