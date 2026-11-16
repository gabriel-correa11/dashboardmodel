<script setup lang="ts">
import { computed } from 'vue'
import { base, seriesFiltradas, episodiosAtivos, resumoDe, serie, nomeGrupo, filtros, nomePais, corEpisodio } from '../application/estadoPainel'
import { variacao } from '../domain/formatos'
import { defasagemCurta } from '../application/manchetes'
import { texto } from '../config'

const grupos = computed(() => {
  const idsGrupos = [...new Set(seriesFiltradas.value.map((serie) => serie.grupo))]
  return idsGrupos.map((idGrupo) => ({
    id: idGrupo,
    nome: nomeGrupo(idGrupo),
    series: seriesFiltradas.value.filter((serie) => serie.grupo === idGrupo),
  }))
})

const comparacoes = computed(() =>
  (base.value?.comparacoes ?? []).filter((comparacao) => {
    const serieEua = serie(comparacao.id_serie_eua)
    return serieEua && (filtros.grupo === 'todos' || serieEua.grupo === filtros.grupo)
  }),
)
const defasagensPorPar = computed(
  () => new Map(comparacoes.value.map((comparacao) => [`${comparacao.id_serie_eua}|${comparacao.id_episodio}`, comparacao])),
)
/** Na tabela a unidade (meses) está no cabeçalho, para a tabela caber em 1366 px sem rolagem. */
function voltaCurta(situacao: string, quantidadeMeses: number | null | undefined): string {
  if (situacao === 'recuperado') return String(quantidadeMeses ?? '—')
  if (situacao === 'nao_recuperado') return `> ${base.value?.edicao.janela_medidas_meses ?? ''}`
  if (situacao === 'nao_se_aplica') return 'n.a.'
  return '—'
}
const pares = computed(() =>
  [...new Set(comparacoes.value.map((comparacao) => comparacao.id_serie_eua))].map((idSerieEua) => {
    const serieEua = serie(idSerieEua)
    const serieBrasil = serie(serieEua?.id_serie_par)
    return {
      id: idSerieEua,
      nome: `${serieEua?.nome ?? idSerieEua} × ${serieBrasil?.nome ?? ''}`,
    }
  }),
)
</script>

<template>
  <section v-if="base" class="visao">
    <p class="secundario intro">{{ texto('intro_medidas') }}</p>

    <div class="painel rolagem-x">
      <table class="tabela resumo">
        <thead>
          <tr>
            <th rowspan="2">Indicador</th>
            <th rowspan="2">País</th>
            <th v-for="episodio in episodiosAtivos" :key="episodio.id" colspan="3" class="ep">
              <span class="chave" :style="{ color: corEpisodio(episodio.id) }" />{{ episodio.rotulo }}
            </th>
          </tr>
          <tr>
            <template v-for="episodio in episodiosAtivos" :key="`s${episodio.id}`">
              <th class="n inicio">Variação</th>
              <th class="n">Extremo<br />(meses)</th>
              <th class="n">Volta ao pico<br />(meses)</th>
            </template>
          </tr>
        </thead>
        <tbody v-for="grupo in grupos" :key="grupo.id">
          <tr class="grupo">
            <th :colspan="2 + episodiosAtivos.length * 3" scope="colgroup">{{ grupo.nome }}</th>
          </tr>
          <tr v-for="serieAtual in grupo.series" :key="serieAtual.id">
            <td>{{ serieAtual.nome }}</td>
            <td class="secundario">{{ nomePais(serieAtual.pais) }}</td>
            <template v-for="episodio in episodiosAtivos" :key="`${serieAtual.id}${episodio.id}`">
              <template v-for="resumo in [resumoDe(serieAtual.id, episodio.id)]" :key="`r${episodio.id}`">
                <td v-if="!resumo || resumo.situacao_recuperacao === 'sem_dados'" colspan="3" class="n vazio inicio">sem dados</td>
                <template v-else>
                  <td class="n inicio forte">{{ variacao(resumo.variacao_pico_vale, serieAtual) }}</td>
                  <td class="n">{{ resumo.meses_ate_vale ?? '—' }}</td>
                  <td class="n" :class="{ vazio: resumo.situacao_recuperacao === 'nao_se_aplica' }">{{ voltaCurta(resumo.situacao_recuperacao, resumo.meses_ate_recuperacao) }}</td>
                </template>
              </template>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="nota">Fonte: fato_resumo_episodio, edição {{ base.edicao.id_edicao }}. “&gt; {{ base.edicao.janela_medidas_meses }}”: não voltou ao nível do pico na janela de cálculo. “n.a.” (não se aplica): juros e inflação não têm um nível “normal” a recuperar.</p>

    <div class="painel bloco-defas">
    <h2 class="sub">Defasagem entre EUA e Brasil</h2>
    <table class="tabela defas">
      <thead>
        <tr>
          <th>Par de séries</th>
          <th v-for="episodio in episodiosAtivos" :key="episodio.id"><span class="chave" :style="{ color: corEpisodio(episodio.id) }" />{{ episodio.rotulo }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="par in pares" :key="par.id">
          <td>{{ par.nome }}</td>
          <td
            v-for="episodio in episodiosAtivos"
            :key="episodio.id"
            :class="{ vazio: defasagensPorPar.get(`${par.id}|${episodio.id}`)?.defasagem_meses == null }"
          >
            {{ defasagemCurta(defasagensPorPar.get(`${par.id}|${episodio.id}`)?.defasagem_meses) }}
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  </section>
</template>

<style scoped>
.intro {
  max-width: 120ch;
  font-size: var(--t-4);
  margin-bottom: var(--esp-3);
}
.bloco-defas {
  margin-top: var(--esp-3);
}
.rolagem-x {
  overflow-x: auto;
}
.resumo .ep {
  color: var(--texto);
  font-size: var(--t-5);
}
/* Cada episódio é um grupo de três colunas, separado por um respiro à esquerda. */
.inicio {
  padding-left: var(--esp-4) !important;
}
.resumo thead tr:first-child th {
  border-bottom: 1px solid var(--linha);
}
.resumo thead tr:first-child th.ep {
  padding-left: var(--esp-6);
}
.resumo thead tr:first-child th[rowspan] {
  border-bottom: 1px solid var(--texto);
}
tr.grupo th {
  padding-top: var(--esp-4);
  font-size: var(--t-5);
  font-weight: 600;
  color: var(--texto);
  border-bottom-color: var(--texto-3);
}
.resumo td,
.resumo th {
  white-space: nowrap;
}
.resumo td:first-child {
  white-space: normal;
  min-width: 170px;
}
.resumo thead th.n {
  white-space: normal;
}
.forte {
  font-weight: 600;
}
.rolagem-x + .nota {
  margin-top: var(--esp-2);
}
.sub {
  margin: 0 0 var(--esp-2);
}
.defas {
  max-width: 900px;
}
.defas td {
  white-space: nowrap;
}
</style>
