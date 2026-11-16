<script setup lang="ts">
import { computed } from 'vue'
import GraficoLinhas, { type SerieGrafico } from './GraficoLinhas.vue'
import GraficoDefasagem from './GraficoDefasagem.vue'
import {
  base, filtros, episodiosAtivos, valoresNaJanela, resumoDe, serie, nomePais, corPais, paisTracejado, corEpisodio,
} from '../application/estadoPainel'
import { numero, comSinal, variacao, mesRelativo, valorPainel } from '../domain/formatos'
import { manchetePar, textoDefasagem } from '../application/manchetes'
import { texto } from '../config'
import type { Serie } from '../domain/contrato'

/** Pares de séries equivalentes (fato_comparacao) dentro do grupo filtrado. */
const pares = computed(() => {
  const paresPorSerieEua = new Map<string, { eua: Serie; brasil: Serie }>()
  for (const comparacao of base.value?.comparacoes ?? []) {
    const serieEua = serie(comparacao.id_serie_eua)
    const serieBrasil = serie(comparacao.id_serie_br)
    if (!serieEua || !serieBrasil) continue
    if (filtros.grupo !== 'todos' && serieEua.grupo !== filtros.grupo) continue
    paresPorSerieEua.set(serieEua.id, { eua: serieEua, brasil: serieBrasil })
  }
  return [...paresPorSerieEua.values()]
})

const paisesLegenda = computed(() => {
  const primeiroPar = pares.value[0]
  return primeiroPar ? [primeiroPar.eua.pais, primeiroPar.brasil.pais] : []
})

function celula(serieEua: Serie, serieBrasil: Serie, idEpisodio: string) {
  const seriesGrafico: SerieGrafico[] = []
  for (const serieAtual of [serieEua, serieBrasil]) {
    const valores = valoresNaJanela(serieAtual.id, idEpisodio)
    if (!valores.length) continue
    const resumo = resumoDe(serieAtual.id, idEpisodio)
    seriesGrafico.push({
      id: serieAtual.id,
      rotulo: nomePais(serieAtual.pais),
      cor: corPais(serieAtual.pais),
      tracejado: paisTracejado(serieAtual.pais),
      pontos: valores.map((valor) => ({ x: valor.mes_relativo, y: valor.valor_painel, data: valor.data_referencia })),
      marcas: resumo?.mes_reacao != null
        ? [{ x: resumo.mes_reacao, rotulo: `primeira reação, ${mesRelativo(resumo.mes_reacao)} meses` }]
        : [],
    })
  }
  const comparacao = base.value?.comparacoes.find(
    (item) => item.id_episodio === idEpisodio && item.id_serie_eua === serieEua.id,
  )
  return {
    seriesGrafico,
    comparacao,
    resumoEua: resumoDe(serieEua.id, idEpisodio),
    resumoBrasil: resumoDe(serieBrasil.id, idEpisodio),
  }
}

/** Mesma escala vertical nos episódios de um mesmo par: é o que permite comparar a intensidade. */
function dominio(serieEua: Serie, serieBrasil: Serie): [number, number] | null {
  const valoresPainel = episodiosAtivos.value.flatMap((episodio) =>
    [serieEua, serieBrasil].flatMap((serieAtual) =>
      valoresNaJanela(serieAtual.id, episodio.id).map((valor) => valor.valor_painel),
    ),
  )
  return valoresPainel.length ? [Math.min(...valoresPainel), Math.max(...valoresPainel)] : null
}
const emMeses = (anoMes: string) => {
  const [ano, mes] = anoMes.split('-').map(Number)
  return ano * 12 + (mes - 1)
}
const titulo = (serieEua: Serie, serieBrasil: Serie) =>
  serieEua.nome === serieBrasil.nome ? serieEua.nome : `${serieEua.nome} × ${serieBrasil.nome}`

const formatadorEixo = (serie: Serie) => (valor: number) =>
  serie.metodo.tipo === 'indice' ? numero(valor, 0) : comSinal(valor, 1)
</script>

<template>
  <section v-if="base" class="visao">
    <p class="secundario intro">{{ texto('intro_paises') }}</p>
    <ul class="legenda">
      <li v-for="p in paisesLegenda" :key="p">
        <span class="chave" :class="{ tracejada: paisTracejado(p) }" :style="{ color: corPais(p) }" />{{ nomePais(p) }}
      </li>
      <li class="secundario"><span class="ponto" /> primeira reação</li>
      <li class="secundario"><span class="amostra-faixa" /> recessão nos EUA (pico ao vale)</li>
    </ul>
    <p v-if="filtros.pais !== 'todos'" class="nota">{{ texto('aviso_pais_paises') }}</p>
    <p v-if="!pares.length" class="secundario vazio">{{ texto('paises_vazio') }}</p>

    <GraficoDefasagem class="bloco" />

    <article v-for="par in pares" :key="par.eua.id" class="painel par">
      <h2>{{ titulo(par.eua, par.brasil) }}</h2>
      <p class="nota">{{ manchetePar(par.eua.id, filtros.episodios) }}. {{ par.eua.unidade_painel }}.</p>

      <div class="grade" :style="{ gridTemplateColumns: `repeat(${episodiosAtivos.length}, minmax(0, 1fr))` }">
        <div v-for="episodio in episodiosAtivos" :key="episodio.id">
          <template v-for="celulaGrafico in [celula(par.eua, par.brasil, episodio.id)]" :key="episodio.id">
            <h3 class="ep"><span class="chave" :style="{ color: corEpisodio(episodio.id) }" />{{ episodio.rotulo }}</h3>
            <GraficoLinhas
              v-if="celulaGrafico.seriesGrafico.length"
              :series="celulaGrafico.seriesGrafico"
              :x-min="-filtros.antes"
              :x-max="filtros.depois"
              :ref-y="par.eua.metodo.tipo === 'indice' ? 100 : 0"
              :format-y="formatadorEixo(par.eua)"
              :format-valor="(valor: number) => valorPainel(valor, par.eua)"
              :altura="170"
              compacto
              :foco="par.brasil.id"
              :dominio-y="dominio(par.eua, par.brasil)"
              :faixa="{ x0: 0, x1: emMeses(episodio.vale) - emMeses(episodio.pico) }"
              :descricao="`${par.eua.nome} e ${par.brasil.nome}, ${episodio.rotulo}`"
            />
            <p class="defasagem" :class="{ vazio: celulaGrafico.comparacao?.defasagem_meses == null }">{{ textoDefasagem(celulaGrafico.comparacao?.defasagem_meses) }}</p>
            <p class="nota num">
              Variação: {{ nomePais(par.eua.pais) }} {{ variacao(celulaGrafico.resumoEua?.variacao_pico_vale, par.eua) }};
              {{ nomePais(par.brasil.pais) }} {{ celulaGrafico.resumoBrasil?.situacao_recuperacao === 'sem_dados' ? 'sem dados' : variacao(celulaGrafico.resumoBrasil?.variacao_pico_vale, par.brasil) }}
            </p>
          </template>
        </div>
      </div>
    </article>
    <p class="nota">
      Defasagem = mês da primeira reação no Brasil menos o mês da primeira reação nos EUA (fato_comparacao).
      Edição {{ base.edicao.id_edicao }}.
    </p>
  </section>
</template>

<style scoped>
.intro {
  max-width: 120ch;
  font-size: var(--t-4);
}
.legenda {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1) var(--esp-6);
  margin: var(--esp-2) 0 0;
  padding: 0;
  font-size: var(--t-5);
}
.ponto {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--texto-2);
  margin-right: 6px;
  vertical-align: 1px;
}
.amostra-faixa {
  display: inline-block;
  width: 14px;
  height: 10px;
  background: var(--nber);
  border: 1px solid var(--linha);
  margin-right: 6px;
  vertical-align: -1px;
}
.bloco,
.par {
  margin-top: var(--esp-3);
}
.par > p {
  margin-top: 2px;
}
.grade {
  display: grid;
  gap: var(--esp-6);
  margin-top: var(--esp-3);
}
.ep {
  font-size: var(--t-5);
  font-weight: 600;
  margin-bottom: var(--esp-1);
}
.defasagem {
  margin-top: var(--esp-1);
  font-weight: 600;
  font-size: var(--t-5);
}
.defasagem + .nota {
  margin-top: 2px;
}
.defasagem.vazio,
.vazio {
  font-weight: 400;
  color: var(--texto-3);
}
.visao > .nota:last-child {
  margin-top: var(--esp-4);
}
@media (max-width: 800px) {
  .grade {
    grid-template-columns: 1fr !important;
  }
}
</style>
