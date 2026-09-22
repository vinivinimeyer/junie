import { ref } from 'vue'
import { api } from './api'

/** Quantos insumos estão em alerta (badge do menu Estoque). */
export const alertasEstoque = ref(0)
let ultimos = new Set()

/**
 * Atualiza o badge e devolve os insumos que ENTRARAM em alerta desde a última
 * consulta, para o PDV avisar logo depois da venda.
 */
export async function atualizarAlertas() {
  try {
    const { resumo, itens } = await api.get('/estoque/visao')
    alertasEstoque.value = resumo.emAlerta
    const agora = itens.filter((i) => i.status !== 'ok')
    const novos = agora.filter((i) => !ultimos.has(i.id))
    ultimos = new Set(agora.map((i) => i.id))
    return novos
  } catch {
    return []
  }
}

export function zerarAlertas() {
  ultimos = new Set()
  alertasEstoque.value = 0
}
