import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { sessao, onboardingCompleto } from './lib/sessao'
import { aplicarTema, MARCA_JUNIE } from './lib/theme'
import './index.css'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: () => import('./views/Inicio.vue'), meta: { temaJunie: true } },
    { path: '/comecar', component: () => import('./views/onboarding/Marca.vue'), meta: { temaProprio: true } },
    { path: '/entrar/:slug?', component: () => import('./views/Entrar.vue'), meta: { temaProprio: true } },
    { path: '/configurar', component: () => import('./views/onboarding/Operacao.vue'), meta: { logado: true } },
    { path: '/marca', component: () => import('./views/onboarding/Marca.vue'), props: { editando: true }, meta: { logado: true, temaProprio: true } },
    {
      path: '/app',
      component: () => import('./views/app/Layout.vue'),
      meta: { logado: true },
      children: [
        { path: '', component: () => import('./views/app/Vender.vue') },
        { path: 'mesas', component: () => import('./views/app/Mesas.vue') },
        { path: 'cozinha', component: () => import('./views/app/Cozinha.vue') },
        { path: 'estoque', component: () => import('./views/app/Estoque.vue') },
        { path: 'caixa', component: () => import('./views/app/Caixa.vue') },
        { path: 'cardapio', component: () => import('./views/app/Cardapio.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  if (to.meta.logado && !sessao.token) return '/entrar'
  // Primeiro acesso depois de criar a marca: termina a configuração antes do PDV.
  if (to.path.startsWith('/app') && sessao.tenant && !onboardingCompleto() && !sessionStorage.getItem('junie-pulou-setup')) {
    return '/configurar'
  }
})

router.afterEach((to) => {
  if (to.meta.temaProprio) return
  aplicarTema(to.meta.temaJunie || !sessao.tenant ? MARCA_JUNIE : sessao.tenant)
})

createApp(App).use(router).mount('#app')
