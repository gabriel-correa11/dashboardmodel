<script setup lang="ts">
/**
 * Cartão de medida de impacto (RF06/RF10): uma medida, uma barra por episódio.
 * As barras partem do zero e usam a mesma escala dentro do cartão, então o comprimento
 * compara os episódios diretamente. Os valores vêm prontos da camada Gold; nada é recalculado aqui.
 */
import { computed } from 'vue'

export interface LinhaMedida {
  id: string
  rotulo: string
  cor: string
  /** valor numérico para o comprimento da barra; null = sem barra */
  valor: number | null
  /** texto exibido à direita (já formatado) */
  texto: string
  /** barra aberta: a série não voltou ao pico dentro da janela */
  aberta?: boolean
  apagado?: boolean
}

const props = defineProps<{
  titulo: string
  ajuda: string
  linhas: LinhaMedida[]
  foco?: string | null
  /** true quando a medida pode ser negativa (defasagem): o zero fica no meio */
  divergente?: boolean
}>()

const maiorValorAbsoluto = computed(() => Math.max(1, ...props.linhas.map((linha) => Math.abs(linha.valor ?? 0))))
function estiloBarra(linha: LinhaMedida) {
  if (linha.valor == null) return { width: '0%' }
  const fracao = Math.abs(linha.valor) / maiorValorAbsoluto.value
  if (!props.divergente) return { left: '0%', width: `${Math.max(fracao * 100, 1.5)}%` }
  const meia = fracao * 50
  return linha.valor >= 0
    ? { left: '50%', width: `${Math.max(meia, 1.5)}%` }
    : { left: `${50 - meia}%`, width: `${Math.max(meia, 1.5)}%` }
}
</script>

<template>
  <section class="painel cartao">
    <h3 class="rotulo-painel" :title="ajuda">{{ titulo }}</h3>
    <ul>
      <li v-for="linha in linhas" :key="linha.id" :class="{ recua: foco && foco !== linha.id, apagado: linha.apagado }">
        <span class="ep">{{ linha.rotulo }}</span>
        <span class="trilho" :class="{ divergente }" aria-hidden="true">
          <span v-if="linha.valor != null" class="barra" :class="{ aberta: linha.aberta }" :style="{ ...estiloBarra(linha), '--cor': linha.cor }" />
        </span>
        <span class="valor num">{{ linha.texto }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.cartao {
  padding: var(--esp-3) var(--esp-4);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
h3 {
  margin-bottom: 6px;
  cursor: help;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 3px;
}
li {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--esp-2);
  font-size: var(--t-4);
  line-height: 1.3;
  transition: opacity var(--transicao);
}
li.recua { opacity: 1; }
.ep {
  color: var(--texto-2);
  white-space: nowrap;
}
.trilho {
  position: relative;
  height: 10px;
}
.trilho.divergente::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -3px;
  bottom: -3px;
  border-left: 1px solid var(--referencia);
}
.barra {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--cor);
  border-radius: 1px;
}
/* Não voltou ao pico na janela: barra vazada, para não se confundir com um valor medido. */
.barra.aberta {
  background: transparent;
  border: 1.5px dashed var(--cor);
}
.valor {
  min-width: 84px;
  text-align: right;
  font-weight: 600;
  color: var(--texto);
  white-space: nowrap;
}
li.apagado .valor {
  font-weight: 400;
  color: var(--texto-3);
}
</style>
