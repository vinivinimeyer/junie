import { sessao, sair } from './sessao'

/** Token expirado ou revogado: limpa a sessão e volta para o login da marca. */
function sessaoExpirada() {
  const slug = sessao.tenant?.slug
  sair()
  window.location.assign(slug ? `/entrar/${slug}` : '/entrar')
}

const BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

/** Sem VITE_API_URL o app usa a API simulada (src/lib/demo) no navegador. */
export const modoDemo = !BASE

export class ApiError extends Error {
  constructor(status, mensagem, dados) {
    super(mensagem)
    this.status = status
    this.dados = dados
  }
}

function mensagemDeErro(status, corpo) {
  if (corpo?.errors?.length) return corpo.errors.map((e) => e.message).join('. ')
  if (corpo?.message) return corpo.message.replace(/^E_[A-Z_]+:\s*/, '')
  return status === 0 ? 'Sem conexão com o servidor' : `Erro ${status}`
}

async function chamar(metodo, caminho, corpo) {
  if (modoDemo) {
    const { atender } = await import('./demo/servidor.js')
    try {
      return await atender(metodo, caminho, corpo, sessao.token)
    } catch (e) {
      if (e.status === 401 && sessao.token) sessaoExpirada()
      throw e
    }
  }

  let resposta
  try {
    resposta = await fetch(BASE + caminho, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(sessao.token ? { Authorization: `Bearer ${sessao.token}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
  } catch {
    throw new ApiError(0, mensagemDeErro(0))
  }

  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    if (resposta.status === 401 && sessao.token) sessaoExpirada()
    throw new ApiError(resposta.status, mensagemDeErro(resposta.status, dados), dados)
  }
  return dados
}

export const api = {
  get: (caminho) => chamar('GET', caminho),
  post: (caminho, corpo = {}) => chamar('POST', caminho, corpo),
  put: (caminho, corpo = {}) => chamar('PUT', caminho, corpo),
  del: (caminho) => chamar('DELETE', caminho),
}
