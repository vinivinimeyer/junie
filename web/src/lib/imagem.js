import { rgbParaHex, contraste } from './theme'

/**
 * Lê a logo enviada e reduz para no máximo 480px (PNG, mantém transparência),
 * para caber no banco sem precisar de storage no protótipo. SVG passa direto.
 */
export function lerLogo(arquivo, max = 480) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo'))
    leitor.onload = () => {
      if (arquivo.type === 'image/svg+xml') return resolve(leitor.result)
      const img = new Image()
      img.onerror = () => reject(new Error('Formato de imagem não suportado'))
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = leitor.result
    }
    leitor.readAsDataURL(arquivo)
  })
}

/**
 * Sugere cores a partir da logo: agrupa os pixels em "baldes" de cor,
 * ignora transparente, quase-branco e cinzas, e devolve as mais frequentes
 * que sejam visivelmente diferentes entre si.
 */
export function coresDaLogo(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onerror = () => resolve([])
    img.onload = () => {
      const lado = 64
      const canvas = document.createElement('canvas')
      canvas.width = lado
      canvas.height = lado
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, lado, lado)
      const { data } = ctx.getImageData(0, 0, lado, lado)

      const baldes = new Map()
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
        if (a < 200) continue
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        if (max > 240 && min > 225) continue // quase branco
        const chave = [r, g, b].map((c) => Math.round(c / 24)).join(',')
        const balde = baldes.get(chave) ?? { soma: [0, 0, 0], n: 0, saturacao: max - min }
        balde.soma = balde.soma.map((s, j) => s + [r, g, b][j])
        balde.n++
        baldes.set(chave, balde)
      }

      const candidatas = [...baldes.values()]
        .map((b) => ({ hex: rgbParaHex(b.soma.map((s) => s / b.n)), peso: b.n * (b.saturacao > 30 ? 1.6 : 1) }))
        .sort((a, b) => b.peso - a.peso)

      const escolhidas = []
      for (const c of candidatas) {
        if (escolhidas.every((e) => contraste(e, c.hex) > 1.6)) escolhidas.push(c.hex)
        if (escolhidas.length === 4) break
      }
      resolve(escolhidas)
    }
    img.src = dataUrl
  })
}
