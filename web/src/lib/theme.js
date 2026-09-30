/**
 * Motor de white label. A interface é quieta: chão preto (ou branco), texto
 * neutro em dois níveis e superfícies em pílula. A cor da marca mora nos
 * orbes, no brilho do horizonte atrás do painel e nas telas cheias (Pix).
 */

export const FONTES = [
  { nome: 'Host Grotesk', css: "'Host Grotesk'", google: 'Host+Grotesk:wght@400;500;600' },
  // DIN 2014 vem do kit Adobe do Logico (index.html); Barlow é o substituto aberto mais próximo.
  { nome: 'DIN 2014', css: "'din-2014', 'Barlow'", google: 'Barlow:wght@400;500;600' },
  { nome: 'Archivo', css: "'Archivo'", google: 'Archivo:wght@400;500;600' },
  { nome: 'Space Grotesk', css: "'Space Grotesk'", google: 'Space+Grotesk:wght@400;500;600' },
  { nome: 'IBM Plex Mono', css: "'IBM Plex Mono'", google: 'IBM+Plex+Mono:wght@400;500;600' },
  { nome: 'Fraunces', css: "'Fraunces'", google: 'Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600' },
]

export const CANTOS = { reto: '0px', suave: '14px', redondo: '999px' }

export const CORES = ['#0000FF', '#FF4F1F', '#0B6E4F', '#6B2E1F', '#C2185B', '#111111', '#7A5CFF', '#E0A400']

export const MARCA_JUNIE = {
  nome: 'Junie',
  corPrimaria: '#3B4BD8',
  corDestaque: '#FF6A2B',
  tema: 'escuro',
  fonte: 'Host Grotesk',
  cantos: 'redondo',
  logo: null,
  logoEscala: 1,
  logoX: 0,
  logoY: 0,
}

// ---------- cor ----------

export function hexParaRgb(hex) {
  const h = (hex || '#000000').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbParaHex([r, g, b]) {
  return '#' + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function luminancia([r, g, b]) {
  const canal = (c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

export function contraste(a, b) {
  const [l1, l2] = [luminancia(hexParaRgb(a)), luminancia(hexParaRgb(b))].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

export function misturar(a, b, peso) {
  const [x, y] = [hexParaRgb(a), hexParaRgb(b)]
  return rgbParaHex(x.map((c, i) => c + (y[i] - c) * peso))
}

/** Branco ou preto, o que tiver mais contraste com o fundo. */
export function tintaPara(fundo) {
  return contraste(fundo, '#FFFFFF') >= contraste(fundo, '#000000') ? '#FFFFFF' : '#000000'
}

/** Aproxima a cor do branco/preto até ter contraste mínimo sobre o fundo. */
export function legivelSobre(cor, fundo, minimo = 4.5) {
  const alvo = tintaPara(fundo)
  let resultado = cor
  for (let passo = 0.05; contraste(resultado, fundo) < minimo && passo <= 1; passo += 0.05) {
    resultado = misturar(cor, alvo, passo)
  }
  return resultado
}

const trio = (hex) => hexParaRgb(hex).join(' ')

// ---------- tema ----------

export function paleta(marca) {
  const m = { ...MARCA_JUNIE, ...marca }
  const escuro = m.tema === 'escuro'
  const chao = escuro ? '#000000' : '#FFFFFF'
  return { chao, tinta: escuro ? '#F2F2F3' : '#111113', marca: m.corPrimaria, destaque: legivelSobre(m.corDestaque, chao, 3) }
}

export function variaveisDoTema(marca) {
  const m = { ...MARCA_JUNIE, ...marca }
  const p = paleta(m)
  const fonte = FONTES.find((f) => f.nome === m.fonte) ?? FONTES[0]
  return {
    '--chao': trio(p.chao),
    '--tinta': trio(p.tinta),
    '--marca': trio(p.marca),
    '--marca-tinta': trio(tintaPara(p.marca)),
    '--destaque': trio(p.destaque),
    '--destaque-tinta': trio(tintaPara(p.destaque)),
    '--perigo': trio(m.tema === 'escuro' ? '#FF5A4E' : '#D11A0A'),
    '--raio': CANTOS[m.cantos] ?? CANTOS.redondo,
    '--fonte': `${fonte.css}, 'Host Grotesk', system-ui, sans-serif`,
  }
}

const carregadas = new Set()

export function carregarFonte(nome) {
  const fonte = FONTES.find((f) => f.nome === nome) ?? FONTES[0]
  if (carregadas.has(fonte.nome)) return
  carregadas.add(fonte.nome)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fonte.google}&display=swap`
  document.head.appendChild(link)
}

/** Aplica a marca na página inteira: variáveis, fonte, título, favicon e theme-color. */
export function aplicarTema(marca) {
  const m = { ...MARCA_JUNIE, ...marca }
  const raiz = document.documentElement
  for (const [chave, valor] of Object.entries(variaveisDoTema(m))) raiz.style.setProperty(chave, valor)
  raiz.style.colorScheme = m.tema === 'escuro' ? 'dark' : 'light'
  carregarFonte(m.fonte)
  document.title = m.nome
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paleta(m).chao)
  const favicon = document.getElementById('favicon')
  if (favicon) favicon.href = m.logo || faviconOrbe(m)
}

export function iniciais(nome = '') {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  return ((palavras[0]?.[0] ?? 'J') + (palavras[1]?.[0] ?? '')).toUpperCase()
}

function faviconOrbe(m) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="g" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="${misturar(m.corPrimaria, '#FFFFFF', 0.5)}"/><stop offset=".6" stop-color="${m.corPrimaria}"/><stop offset="1" stop-color="${m.corDestaque}"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="url(#g)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
