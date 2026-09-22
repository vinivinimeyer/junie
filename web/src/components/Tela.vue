<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Tela cheia por cima de tudo, no lugar de modais (como o Pix e a nota
 * fiscal no Logico). `cheia` inverte: fundo na cor da marca.
 * Sem cheia, o fundo é vidro: o app continua visível atrás.
 */
defineProps({ cheia: Boolean, rotulo: { type: String, required: true } })
const emit = defineEmits(['fechar'])

const tecla = (e) => e.key === 'Escape' && emit('fechar')
onMounted(() => {
  document.addEventListener('keydown', tecla)
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', tecla)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="rotulo"
      class="fixed inset-0 z-50 overflow-y-auto"
      :class="cheia ? 'bg-marca text-marca-tinta' : 'vidro-tela text-tinta'"
    >
      <button
        class="palavra vidro-pilula fixed top-5 right-5 md:top-8 md:right-10 z-10 text-lg aberto px-4 py-2"
        @click="emit('fechar')"
      >Fechar</button>
      <slot />
    </div>
  </Teleport>
</template>
