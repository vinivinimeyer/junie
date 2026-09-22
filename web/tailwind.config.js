/**
 * Duas cores, como no Logico: o chão (preto ou branco) e a tinta (cor da
 * marca ajustada para contraste). Tudo vem de variáveis definidas em
 * src/lib/theme.js, então trocar a marca troca o app inteiro sem rebuild.
 */
const v = (nome) => `rgb(var(--${nome}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        chao: v('chao'),
        tinta: v('tinta'),
        marca: { DEFAULT: v('marca'), tinta: v('marca-tinta') },
        destaque: { DEFAULT: v('destaque'), tinta: v('destaque-tinta') },
        perigo: v('perigo'),
      },
      borderRadius: { r: 'var(--raio)' },
      fontFamily: { sans: ['var(--fonte)'] },
      borderWidth: { 3: '3px' },
    },
  },
  plugins: [],
}
