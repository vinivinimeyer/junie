import { api, modoDemo } from './api'
import { entrar } from './sessao'
import { templateDoSegmento, payloadDoTemplate } from '../data/templates'

export const MARCA_DEMO = {
  nome: 'Café Aurora',
  segmento: 'cafeteria',
  corPrimaria: '#3F4A8C',
  corDestaque: '#FF7A2F',
  tema: 'escuro',
  fonte: 'Host Grotesk',
  cantos: 'redondo',
  chavePix: 'contato@cafeaurora.com.br',
  cidadePix: 'São Paulo',
  mensagemRecibo: 'Obrigado pela visita!',
}

/**
 * "Ver demonstração": cria uma marca de exemplo já configurada, com cardápio,
 * fichas técnicas, estoque e (no modo demo) 14 dias de vendas.
 */
export async function criarDemonstracao() {
  const sufixo = Date.now().toString(36)
  const conta = await api.post('/auth/cadastro', {
    nome: 'Equipe Aurora',
    email: `demo-${sufixo}@junie.app`,
    senha: 'demo1234',
    marca: MARCA_DEMO,
  })
  entrar(conta)
  await api.post('/setup/importar', payloadDoTemplate(templateDoSegmento('cafeteria')))
  if (modoDemo) await api.post('/demo/popular')
  const tenant = await api.put('/marca/onboarding', { cardapio: true, mesas: true, estoque: true })
  entrar({ ...conta, tenant })
  return conta
}
