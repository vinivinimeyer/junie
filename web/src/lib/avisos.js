import { reactive } from 'vue'

export const avisos = reactive([])
let seq = 0

/** tipo: 'ok' | 'erro' | 'alerta' */
export function avisar(texto, tipo = 'ok', ms = 3800) {
  const id = ++seq
  avisos.push({ id, texto, tipo })
  setTimeout(() => {
    const i = avisos.findIndex((a) => a.id === id)
    if (i >= 0) avisos.splice(i, 1)
  }, ms)
}

export const avisarErro = (e) => avisar(e?.message || 'Algo deu errado', 'erro', 5000)
