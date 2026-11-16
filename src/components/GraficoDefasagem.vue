<script setup lang="ts">
/**
 * Defasagem EUA → Brasil por par de séries e episódio (fato_comparacao).
 * É a visão da hipótese H1: um ponto por episódio, na mesma régua de meses.
 * Pontos com o mesmo valor são empilhados na vertical para não se esconderem.
 */
import { computed } from 'vue'
import { base, episodiosAtivos, serie, filtros, corEpisodio } from '../application/estadoPainel'
import { defasagemCurta } from '../application/manchetes'
import { texto } from '../config'

const linhas = computed(() => {
  const comparacoesFiltradas = (base.value?.comparacoes ?? []).filter((comparacao) => {
    const serieEua = serie(comparacao.id_serie_eua)
    return serieEua && (filtros.grupo === 'todos' || serieEua.grupo === filtros.grupo)
  })
  const idsSeriesEua = [...new Set(comparacoesFiltradas.map((comparacao) => comparacao.id_serie_eua))]
  return idsSeriesEua.flatMap((idSerieEua) => {
    const serieEua = serie(idSerieEua)
    if (!serieEua) return []

    const serieBrasil = serie(serieEua.id_serie_par)
    const comparacoesPorEpisodio = new Map(
      comparacoesFiltradas
        .filter((comparacao) => comparacao.id_serie_eua === idSerieEua)
        .map((comparacao) => [comparacao.id_episodio, comparacao]),
    )
    const pontos = episodiosAtivos.value.map((episodio) => ({
      episodio,
      defasagem: comparacoesPorEpisodio.get(episodio.id)?.defasagem_meses ?? null,
    }))
    const episodiosSemDados = pontos.filter((ponto) => ponto.defasagem == null).map((ponto) => ponto.episodio.rotulo)
    return [{
      id: idSerieEua,
      nome: serieEua.nome === serieBrasil?.nome ? serieEua.nome : `${serieEua.nome} × ${serieBrasil?.nome ?? ''}`,
      pontos,
      episodiosSemDados,
    }]
  })
})

const limite = computed(() => {
  const defasagensAbsolutas = linhas.value.flatMap((linha) =>
    linha.pontos.map((ponto) => Math.abs(ponto.defasagem ?? 0)),
  )
  return Math.max(3, ...defasagensAbsolutas) + 1
})
const ticks = computed(() => {
  const marcacoes: number[] = []
  for (let valor = -limite.value; valor <= limite.value; valor++) marcacoes.push(valor)
  return marcacoes
})
const posicaoPercentual = (defasagem: number) => ((defasagem + limite.value) / (2 * limite.value)) * 100

/** Deslocamento vertical para pontos coincidentes na mesma linha. */
function desvioVertical(pontos: { defasagem: number | null }[], indice: number) {
  const defasagem = pontos[indice].defasagem
  const indicesCoincidentes = pontos
    .map((ponto, indicePonto) => (ponto.defasagem === defasagem ? indicePonto : -1))
    .filter((indicePonto) => indicePonto >= 0)
  if (indicesCoincidentes.length < 2) return 0
  return (indicesCoincidentes.indexOf(indice) - (indicesCoincidentes.length - 1) / 2) * 11
}
</script>

<template>
  <section v-if="linhas.length" class="painel graf-defasagem">
    <header>
      <h2>{{ texto('titulo_defasagem') }}</h2>
      <p class="nota">{{ texto('sub_defasagem') }}</p>
    </header>
    <ul class="legenda">
      <li v-for="episodio in episodiosAtivos" :key="episodio.id"><span class="bola" :style="{ background: corEpisodio(episodio.id) }" />{{ episodio.rotulo }}</li>
    </ul>
    <div class="grafico" role="img" :aria-label="texto('titulo_defasagem')">
      <div class="lados nota" aria-hidden="true">
        <span />
        <span class="regua"><span>← Brasil reagiu antes</span><span>Brasil reagiu depois →</span></span>
      </div>
      <div v-for="linha in linhas" :key="linha.id" class="linha">
        <span class="nome">
          {{ linha.nome }}
          <span v-if="linha.episodiosSemDados.length" class="nota">sem dados no Brasil em {{ linha.episodiosSemDados.join(' e ') }}</span>
        </span>
        <span class="regua">
          <span class="fio" />
          <span class="zero" />
          <span
            v-for="(ponto, indice) in linha.pontos"
            v-show="ponto.defasagem != null"
            :key="ponto.episodio.id"
            class="ponto"
            :style="{ left: `${posicaoPercentual(ponto.defasagem ?? 0)}%`, marginTop: `${desvioVertical(linha.pontos, indice)}px`, '--cor': corEpisodio(ponto.episodio.id) }"
            :title="`${ponto.episodio.rotulo}: ${defasagemCurta(ponto.defasagem)}`"
          ><span class="ponto-rotulo" :class="{ esquerda: (ponto.defasagem ?? 0) > limite * 0.55 }">{{ ponto.episodio.rotulo }}</span></span>
        </span>
      </div>
      <div class="linha eixo" aria-hidden="true">
        <span />
        <span class="regua">
          <span v-for="marcacao in ticks" :key="marcacao" class="tick num" :style="{ left: `${posicaoPercentual(marcacao)}%` }">{{ marcacao > 0 ? `+${marcacao}` : marcacao < 0 ? `−${-marcacao}` : '0' }}</span>
        </span>
      </div>
      <p class="nota titulo-eixo">Meses (0 = reagiram no mesmo mês)</p>
    </div>
    <p class="nota">Fonte: fato_comparacao, edição {{ base?.edicao.id_edicao }}. Passe o mouse num ponto para ver o valor.</p>
  </section>
</template>

<style scoped>
header p {
  margin-top: 2px;
  max-width: 110ch;
}
.legenda {
  list-style: none;
  display: flex;
  gap: var(--esp-6);
  margin: var(--esp-3) 0 var(--esp-2);
  padding: 0;
  font-size: var(--t-5);
}
.bola,
.ponto {
  background: var(--cor);
}
.ponto-rotulo {
  position: absolute;
  left: 10px;
  top: -3px;
  white-space: nowrap;
  font-size: var(--t-5);
  color: var(--texto-2);
  font-variant-numeric: tabular-nums;
}
.ponto-rotulo.esquerda {
  left: auto;
  right: 10px;
  text-align: right;
}
.ponto {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.bola {
  display: inline-block;
  margin-right: 6px;
  vertical-align: -1px;
}
.linha,
.lados {
  display: grid;
  grid-template-columns: minmax(180px, 300px) minmax(0, 1fr);
  column-gap: var(--esp-6);
  align-items: center;
}
.linha {
  min-height: 40px;
  border-top: 1px solid var(--grade);
}
.linha.eixo {
  min-height: 22px;
  border-top: 1px solid var(--referencia);
}
.nome {
  font-size: var(--t-4);
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.regua {
  position: relative;
  height: 100%;
  min-height: 22px;
  margin: 0 12px;
}
.lados .regua {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}
.fio {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px solid var(--grade);
}
.zero {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  border-left: 1.5px solid var(--referencia);
}
.ponto {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid var(--superficie);
  box-sizing: content-box;
}
.tick {
  position: absolute;
  top: 4px;
  transform: translateX(-50%);
  font-size: var(--t-5);
  color: var(--texto-3);
}
.titulo-eixo {
  text-align: center;
  padding-left: 300px;
  margin-top: 2px;
}
.grafico + .nota {
  margin-top: var(--esp-2);
}
</style>
