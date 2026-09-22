<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../lib/api'
import { sessao, entrar, atualizarTenant } from '../../lib/sessao'
import { aplicarTema, carregarFonte, CORES, FONTES, MARCA_JUNIE, misturar } from '../../lib/theme'
import { lerLogo, coresDaLogo } from '../../lib/imagem'
import { avisar, avisarErro } from '../../lib/avisos'
import Orbe from '../../components/Orbe.vue'
import LogoNoOrbe from '../../components/LogoNoOrbe.vue'

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
function resetarEnquadro() {
  marca.logoEscala = 1
  marca.logoX = 0
  marca.logoY = 0
}

async function receberLogo(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) return avisarErro(new Error('Envie uma imagem PNG, JPG ou SVG'))
  try {
    marca.logo = await lerLogo(file)
    resetarEnquadro()
    sugeridas.value = await coresDaLogo(marca.logo)
  } catch (e) {
    avisarErro(e)
  }
}

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
  resetarEnquadro()
}

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
  try {
    if (props.editando) {
      atualizarTenant(await api.put('/marca', { ...dados, logo: marca.logo ?? null }))
      avisar('Marca atualizada')
      router.push('/app')
    } else {
      const resposta = await api.post('/auth/cadastro', { ...conta, marca: dados })
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
            class="w-full bg-transparent regua outline-none text-5xl md:text-8xl pb-3 font-bold uppercase text-tinta placeholder:text-tinta/25"
            placeholder="Café Aurora"
          />
          <div class="flex flex-wrap gap-x-8 gap-y-3 text-2xl md:text-3xl" role="radiogroup" aria-label="Segmento">
            <button
              v-for="[id, rotulo] in SEGMENTOS"
              :key="id"
              role="radio"
              :aria-checked="marca.segmento === id"
              class="transition-opacity"
              :class="marca.segmento === id ? '' : 'apagado hover:opacity-70'"
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
              <label class="relative w-16 h-16 md:w-20 md:h-20 rounded-full cursor-pointer flex items-center justify-center text-2xl" style="border: 3px dashed rgb(var(--tinta) / .5)">
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
            <div class="flex gap-8 text-2xl md:text-3xl" role="radiogroup" aria-label="Fundo">
              <button role="radio" :aria-checked="marca.tema === 'escuro'" :class="marca.tema !== 'escuro' && 'apagado'" @click="marca.tema = 'escuro'">Fundo preto</button>
              <button role="radio" :aria-checked="marca.tema === 'claro'" :class="marca.tema !== 'claro' && 'apagado'" @click="marca.tema = 'claro'">Fundo branco</button>
            </div>
          </div>
          <Orbe :marca="marca" tamanho="min(70vw, 26rem)" class="justify-self-center" />
        </section>

        <!-- LOGO -->
        <section v-else-if="PASSOS[passo] === 'logo'" key="logo" class="flex-1 flex flex-col items-center justify-center gap-8">
          <div
            class="rounded-full touch-none"
            :class="[arrastando && 'scale-105', marca.logo && (gesto ? 'cursor-grabbing' : 'cursor-grab')]"
            :aria-label="marca.logo ? 'Arraste para enquadrar a logo' : 'Enviar logo'"
            role="img"
            @click="!marca.logo && arquivo.click()"
            @dragover.prevent="arrastando = true"
            @dragleave="arrastando = false"
            @drop.prevent="arrastando = false; receberLogo($event.dataTransfer.files[0])"
            @pointerdown="enquadrarInicio"
            @pointermove="enquadrarMove"
            @pointerup="enquadrarFim"
            @pointercancel="enquadrarFim"
            @wheel.prevent="zoomRodinha"
          >
            <Orbe :marca="marca" tamanho="min(74vw, 24rem)">
              <LogoNoOrbe v-if="marca.logo" :marca="marca" />
              <span v-else class="text-xl md:text-2xl leading-tight px-[12%]">Solte a logo aqui<br /><span class="opacity-70">ou toque</span></span>
            </Orbe>
          </div>
          <input ref="arquivo" type="file" accept="image/*" class="hidden" @change="receberLogo($event.target.files[0])" />

          <template v-if="marca.logo">
            <div class="flex items-center gap-8" role="group" aria-label="Tamanho da logo">
              <button class="palavra text-5xl w-12" aria-label="Menor" :disabled="marca.logoEscala <= ESCALA_MIN" @click="mudarEscala(-0.1)">−</button>
              <span class="text-5xl md:text-6xl leading-none numero min-w-[3ch] text-center">{{ Math.round((marca.logoEscala || 1) * 100) }}</span>
              <button class="palavra text-5xl w-12" aria-label="Maior" :disabled="marca.logoEscala >= ESCALA_MAX" @click="mudarEscala(0.1)">+</button>
            </div>
            <p class="fraco text-lg text-center">Arraste no círculo. Role ou use + − para o tamanho.</p>
            <div class="flex flex-wrap justify-center gap-x-8 gap-y-2 text-lg">
              <button class="palavra fraco" @click="resetarEnquadro">No centro</button>
              <button class="palavra fraco" @click="arquivo.click()">Trocar</button>
              <button class="palavra fraco" @click="tirarLogo">Tirar logo</button>
            </div>
          </template>
          <p v-else class="fraco text-lg">Sem logo, o nome vira a assinatura.</p>

          <div v-if="sugeridas.length" class="flex items-center gap-4">
            <span class="fraco text-lg">Da logo</span>
            <button v-for="c in sugeridas" :key="c" :aria-label="`Usar ${c}`" class="w-12 h-12 rounded-full" :style="{ background: c }" @click="escolherCor(c)" />
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
              <span class="text-4xl md:text-7xl leading-none truncate" :style="{ fontFamily: `${f.css}, sans-serif` }">{{ marca.nome }}</span>
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
      <button class="bloco h-16 md:h-20 px-8 md:px-12 text-xl md:text-2xl aberto min-w-[60%] md:min-w-[22rem] text-left flex items-center justify-between gap-6" :disabled="!pode || enviando" @click="avancar">
        <span>{{ passo < PASSOS.length - 1 ? 'Continuar' : enviando ? 'Salvando…' : editando ? 'Salvar marca' : `Criar ${marca.nome}` }}</span>
        <span aria-hidden="true">→</span>
      </button>
    </footer>
  </div>
</template>
