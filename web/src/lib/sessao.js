import { reactive } from 'vue'
import { aplicarTema } from './theme'

const CHAVE = 'junie-sessao'

function ler() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) ?? {}
  } catch {
    return {}
  }
}

export const sessao = reactive({ token: null, user: null, tenant: null, ...ler() })

function gravar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ token: sessao.token, user: sessao.user, tenant: sessao.tenant }))
  } catch {
    // modo privado: a sessão só vive até recarregar
  }
}

export function entrar({ token, user, tenant }) {
  Object.assign(sessao, { token, user, tenant })
  gravar()
  aplicarTema(tenant)
}

export function atualizarTenant(tenant) {
  sessao.tenant = tenant
  gravar()
  aplicarTema(tenant)
}

/** O tema volta ao padrão pela navegação (router.afterEach), não aqui: o login com marca aplica o próprio. */
export function sair() {
  Object.assign(sessao, { token: null, user: null, tenant: null })
  gravar()
}

export const onboardingCompleto = (t = sessao.tenant) =>
  Boolean(t?.onboarding?.cardapio && t?.onboarding?.mesas && t?.onboarding?.estoque)
