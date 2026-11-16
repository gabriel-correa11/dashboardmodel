<script setup lang="ts">
import { computed, ref } from 'vue'
import GraficoLinhas, { type SerieGrafico } from './GraficoLinhas.vue'
import CartaoMedida, { type LinhaMedida } from './CartaoMedida.vue'
import { base, filtros, serieAtual, episodiosAtivos, valoresNaJanela, resumoDe, nomePais, corEpisodio } from '../application/estadoPainel'
import { mesAno, meses, numero, comSinal, variacao, valorPainel, mesRelativo } from '../domain/formatos'
import { mancheteEpisodios, textoRecuperacao, episodioExtremo } from '../application/manchetes'
import { config, texto } from '../config'

const serieSelecionada = computed(() => serieAtual.value)

const formatadorEixo = computed(() => (valor: number) =>
  serieSelecionada.value?.metodo.tipo === 'indice' ? numero(valor, 0) : comSinal(valor, 1),
)
const formatadorValor = (valor: number) => valorPainel(valor, serieSelecionada.value)

/** Foco: o episódio citado no título; passar o mouse na legenda ou num rótulo troca o foco. */
const focoHover = ref<string | null>(null)
const foco = computed(() => {
  if (focoHover.value) return focoHover.value
  const serieEmAnalise = serieSelecionada.value
  if (!serieEmAnalise) return null
  const ids = episodiosAtivos.value
    .filter((episodio) => valoresNaJanela(serieEmAnalise.id, episodio.id).length)
    .map((episodio) => episodio.id)
  if (ids.length === 1) return ids[0]
  if (!ids.length) return null
  return episodioExtremo(serieEmAnalise, ids)
})

const manchete = computed(() =>
  serieSelecionada.value ? mancheteEpisodios(serieSelecionada.value, filtros.episodios) : '',
)

const seriesGrafico = computed<SerieGrafico[]>(() => {
  const serieEmAnalise = serieSelecionada.value
  if (!serieEmAnalise) return []
  return episodiosAtivos.value
    .map((episodio) => {
      const resumo = resumoDe(serieEmAnalise.id, episodio.id)
      return {
        id: episodio.id,
        rotulo: episodio.rotulo,
        cor: corEpisodio(episodio.id, foco.value),
        tracejado:
          episodio.id !== foco.value && episodiosAtivos.value.filter((item) => item.id !== foco.value).at(-1)?.id === episodio.id,
        pontos: valoresNaJanela(serieEmAnalise.id, episodio.id).map((valor) => ({
          x: valor.mes_relativo,
          y: valor.valor_painel,
          data: valor.data_referencia,
          original: `${numero(valor.valor_original, 2)} ${serieEmAnalise.unidade_original}`,
        })),
        marcas: resumo?.meses_ate_vale != null
          ? [{ x: resumo.meses_ate_vale, rotulo: `ponto extremo, ${mesRelativo(resumo.meses_ate_vale)} meses` }]
          : [],
      }
    })
    .filter((item) => item.pontos.length)
})

const episodiosSemDados = computed(() =>
  episodiosAtivos.value.filter((episodio) => serieSelecionada.value?.episodios_sem_dados.includes(episodio.id)),
)

const linhas = computed(() =>
  episodiosAtivos.value.map((episodio) => ({
    episodio,
    resumo: serieSelecionada.value ? resumoDe(serieSelecionada.value.id, episodio.id) : undefined,
  })),
)

/** Faixa de recessão do episódio em foco: do pico (mês 0) ao vale do NBER. */
const emMeses = (ym: string) => {
  const [a, m] = ym.split('-').map(Number)
  return a * 12 + (m - 1)
}
const faixa = computed(() => {
  const idEpisodio = foco.value ?? seriesGrafico.value[0]?.id
  const episodio = episodiosAtivos.value.find((item) => item.id === idEpisodio)
  if (!episodio) return null
  return {
    x0: 0,
    x1: emMeses(episodio.vale) - emMeses(episodio.pico),
    rotulo: `recessão ${episodio.rotulo} (NBER)`,
  }
})

/** Cartões das quatro medidas do RF06, uma barra por episódio. Valores prontos da camada Gold. */
const janela = computed(() => base.value?.edicao.janela_medidas_meses ?? 48)
function linhaBase(episodio: { id: string; rotulo: string }): Pick<LinhaMedida, 'id' | 'rotulo' | 'cor'> {
  return { id: episodio.id, rotulo: episodio.rotulo, cor: corEpisodio(episodio.id, foco.value) }
}
const linhaSemDados = (episodio: { id: string; rotulo: string }): LinhaMedida => ({
  ...linhaBase(episodio), valor: null, texto: 'sem dados', apagado: true,
})
const cartoes = computed(() => {
  const serieEmAnalise = serieSelecionada.value
  if (!serieEmAnalise) return []
  const linhasValidas = linhas.value.map((linha) => ({
    ...linha,
    dadosValidos: !!linha.resumo && linha.resumo.situacao_recuperacao !== 'sem_dados',
  }))
  const comparacaoDoEpisodio = (idEpisodio: string) =>
    base.value?.comparacoes.find(
      (comparacao) =>
        comparacao.id_episodio === idEpisodio &&
        (comparacao.id_serie_eua === serieEmAnalise.id || comparacao.id_serie_br === serieEmAnalise.id),
    )
  const temPar = !!serieEmAnalise.id_serie_par
  return [
    {
      titulo: `Maior ${config.textos.sentido[serieEmAnalise.sentido_crise]} desde o pico`,
      ajuda: 'Maior desvio da série em relação ao mês de pico, dentro da janela de cálculo.',
      divergente: false,
      linhas: linhasValidas.map((linha): LinhaMedida => {
        const resumo = linha.resumo
        if (!linha.dadosValidos || !resumo || resumo.variacao_pico_vale == null) return linhaSemDados(linha.episodio)
        return {
          ...linhaBase(linha.episodio),
          valor: Math.abs(resumo.variacao_pico_vale),
          texto: variacao(resumo.variacao_pico_vale, serieEmAnalise),
        }
      }),
    },
    {
      titulo: 'Meses até o ponto extremo',
      ajuda: 'Meses entre o pico do NBER e o ponto de maior desvio da série.',
      divergente: false,
      linhas: linhasValidas.map((linha): LinhaMedida => {
        const resumo = linha.resumo
        if (!linha.dadosValidos || !resumo || resumo.meses_ate_vale == null) return linhaSemDados(linha.episodio)
        return { ...linhaBase(linha.episodio), valor: resumo.meses_ate_vale, texto: meses(resumo.meses_ate_vale) }
      }),
    },
    {
      titulo: 'Meses até voltar ao nível do pico',
      ajuda: 'Meses entre o pico e o primeiro mês, depois do ponto extremo, em que a série volta ao nível do pico. Barra tracejada: não voltou dentro da janela de cálculo.',
      divergente: false,
      linhas: linhasValidas.map((linha): LinhaMedida => {
        if (!linha.dadosValidos || !linha.resumo) return linhaSemDados(linha.episodio)
        const resumo = linha.resumo
        if (resumo.situacao_recuperacao === 'recuperado')
          return { ...linhaBase(linha.episodio), valor: resumo.meses_ate_recuperacao, texto: meses(resumo.meses_ate_recuperacao) }
        if (resumo.situacao_recuperacao === 'nao_recuperado')
          return { ...linhaBase(linha.episodio), valor: janela.value, texto: `> ${janela.value} meses`, aberta: true }
        return { ...linhaBase(linha.episodio), valor: null, texto: texto('nao_se_aplica'), apagado: true }
      }),
    },
    {
      titulo: 'Defasagem EUA → Brasil',
      ajuda: 'Mês da primeira reação no Brasil menos o mês da primeira reação nos EUA. Positivo: o Brasil reagiu depois.',
      divergente: true,
      linhas: episodiosAtivos.value.map((episodio): LinhaMedida => {
        const defasagem = temPar ? comparacaoDoEpisodio(episodio.id)?.defasagem_meses : undefined
        if (defasagem == null) {
          return { ...linhaBase(episodio), valor: null, texto: temPar ? 'sem dados' : 'sem série equivalente', apagado: true }
        }
        return {
          ...linhaBase(episodio),
          valor: defasagem,
          texto: defasagem === 0 ? 'mesmo mês' : `${defasagem > 0 ? '+' : '−'}${meses(Math.abs(defasagem))}`,
        }
      }),
    },
  ]
})

const coleta = computed(() => {
  const serieEmAnalise = serieSelecionada.value
  if (!serieEmAnalise) return ''
  const datas = new Set(
    episodiosAtivos.value.flatMap((episodio) =>
      valoresNaJanela(serieEmAnalise.id, episodio.id).map((valor) => valor.data_coleta),
    ),
  )
  return [...datas].sort().join(', ')
})

const mesesTabela = computed(() => {
  const mesesRelativos: number[] = []
  for (let mes = -filtros.antes; mes <= filtros.depois; mes++) mesesRelativos.push(mes)
  return mesesRelativos
})
function valorMes(idEpisodio: string, mesRelativoAtual: number) {
  const serieEmAnalise = serieSelecionada.value
  const valorEncontrado = serieEmAnalise
    ? valoresNaJanela(serieEmAnalise.id, idEpisodio).find((valor) => valor.mes_relativo === mesRelativoAtual)
    : undefined
  return valorEncontrado && serieEmAnalise
    ? valorPainel(valorEncontrado.valor_painel, serieEmAnalise)
    : '—'
}
</script>

<template>
  <section v-if="serieSelecionada && base" class="visao">
    <div class="quadro">
      <div class="painel bloco-grafico">
        <header>
          <h2>{{ manchete }}</h2>
          <p class="nota">{{ serieSelecionada.unidade_painel }}. {{ serieSelecionada.descricao }}</p>
        </header>

        <ul class="legenda" aria-label="Legenda">
          <li
            v-for="sg in seriesGrafico"
            :key="sg.id"
            :class="{ recua: foco && foco !== sg.id }"
            tabindex="0"
            @pointerenter="focoHover = sg.id"
            @pointerleave="focoHover = null"
            @focus="focoHover = sg.id"
            @blur="focoHover = null"
          >
            <span class="chave" :style="{ color: sg.cor }" />{{ sg.rotulo }}
          </li>
          <li class="marca-legenda"><span class="ponto" /> ponto extremo</li>
          <li class="marca-legenda"><span class="amostra-faixa" /> recessão nos EUA (pico ao vale)</li>
        </ul>

        <p v-if="episodiosSemDados.length" class="sem-dados">
          {{ texto('sem_dados_ep', { indicador: serieSelecionada.nome, pais: nomePais(serieSelecionada.pais), episodios: episodiosSemDados.map((episodio) => episodio.rotulo).join(' e '), inicio: mesAno(serieSelecionada.periodo_inicio) }) }}
          <template v-if="serieSelecionada.mudancas_metodologia.length">{{ serieSelecionada.mudancas_metodologia[0].descricao }}</template>
        </p>

        <GraficoLinhas
          v-if="seriesGrafico.length"
          :series="seriesGrafico"
          :x-min="-filtros.antes"
          :x-max="filtros.depois"
          :ref-y="serieSelecionada.metodo.tipo === 'indice' ? 100 : 0"
          :format-y="formatadorEixo"
          :format-valor="formatadorValor"
          :altura="episodiosSemDados.length ? 268 : 300"
          :descricao="manchete"
          :foco="foco"
          :faixa="faixa"
          @foco="focoHover = $event"
        />

        <p class="nota fonte">
          Fonte: {{ serieSelecionada.fonte.portal }} ({{ serieSelecionada.fonte.produtor }}), série {{ serieSelecionada.codigo }}. {{ serieSelecionada.metodo.descricao }}.
          Coleta: {{ coleta }}. Edição {{ base.edicao.id_edicao }}.
        </p>
      </div>

      <div class="cartoes" aria-label="Medidas de impacto">
        <CartaoMedida v-for="c in cartoes" :key="c.titulo" v-bind="c" :foco="foco" />
      </div>
    </div>
    <p class="nota apos-quadro">
      Medidas calculadas nos {{ base.edicao.janela_medidas_meses }} meses após o pico, qualquer que seja a janela exibida no gráfico.
      Unidade original da série: {{ serieSelecionada.unidade_original }}.
    </p>

    <details class="valores">
      <summary>Tabela das medidas</summary>
      <div class="rolagem-x">
        <table class="tabela medidas">
          <thead>
            <tr>
              <th>Episódio</th>
              <th>Pico e vale (NBER)</th>
              <th class="n">Maior {{ config.textos.sentido[serieSelecionada.sentido_crise] }}</th>
              <th class="n">Meses até o extremo</th>
              <th class="n">Volta ao nível do pico</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="linha in linhas" :key="linha.episodio.id">
              <td><span class="chave" :style="{ color: corEpisodio(linha.episodio.id) }" />{{ linha.episodio.nome }}</td>
              <td class="secundario">{{ mesAno(linha.episodio.pico) }} a {{ mesAno(linha.episodio.vale) }}</td>
              <template v-if="linha.resumo && linha.resumo.situacao_recuperacao !== 'sem_dados'">
                <td class="n forte">{{ variacao(linha.resumo.variacao_pico_vale, serieSelecionada) }}</td>
                <td class="n">{{ meses(linha.resumo.meses_ate_vale) }}</td>
                <td class="n">{{ textoRecuperacao(linha.resumo.situacao_recuperacao, linha.resumo.meses_ate_recuperacao) }}</td>
              </template>
              <td v-else colspan="3" class="n vazio">sem dados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>

    <details class="valores">
      <summary>Valores mês a mês</summary>
      <div class="rolagem">
        <table class="tabela">
          <thead>
            <tr>
              <th>Mês</th>
              <th v-for="episodio in episodiosAtivos" :key="episodio.id" class="n">{{ episodio.rotulo }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mes in mesesTabela" :key="mes">
              <td>{{ mesRelativo(mes) }}</td>
              <td v-for="episodio in episodiosAtivos" :key="episodio.id" class="n">{{ valorMes(episodio.id, mes) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>

<style scoped>
/*
 * Primeira dobra em formato de painel: o gráfico ocupa a coluna larga e as quatro medidas
 * do RF06 ficam ao lado, uma por cartão. As tabelas ficam recolhidas logo abaixo.
 */
.quadro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 348px;
  gap: var(--esp-3);
  align-items: stretch;
}
.cartoes {
  display: grid;
  grid-auto-rows: 1fr;
  gap: var(--esp-2);
}
header p {
  margin-top: 2px;
}
.legenda {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1) var(--esp-4);
  margin: var(--esp-2) 0 0;
  padding: 0;
  font-size: var(--t-5);
}
.legenda li {
  cursor: default;
  transition: opacity var(--transicao);
}
.legenda li.recua {
  opacity: 1;
}
.marca-legenda {
  color: var(--texto-2);
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
.sem-dados {
  font-size: var(--t-5);
  color: var(--texto-2);
  margin: var(--esp-2) 0 0;
}
.fonte {
  margin-top: 2px;
}
.apos-quadro {
  margin-top: var(--esp-2);
}
.rolagem-x {
  overflow-x: auto;
  margin-top: var(--esp-2);
  max-width: 1000px;
}
.medidas td,
.medidas th {
  white-space: nowrap;
}
.medidas .forte {
  font-weight: 600;
}
.valores {
  margin-top: var(--esp-3);
}
summary {
  cursor: pointer;
  font-size: var(--t-4);
  color: var(--texto-2);
  transition: color var(--transicao);
}
summary:hover {
  color: var(--texto);
}
.rolagem {
  max-height: 320px;
  overflow: auto;
  margin-top: var(--esp-2);
  max-width: 520px;
}
@media (max-width: 1100px) {
  .quadro {
    grid-template-columns: 1fr;
  }
  .cartoes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .cartoes {
    grid-template-columns: 1fr;
  }
}
</style>
