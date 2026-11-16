<script setup lang="ts">
/**
 * Gráfico de linhas em SVG com escalas do D3.
 * Usado no gráfico de episódios alinhados (RF09) e nos pequenos múltiplos EUA × Brasil (RF07).
 * Eixo x = meses em relação ao pico; um único eixo y.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { scaleLinear } from 'd3-scale'
import { line, curveMonotoneX } from 'd3-shape'
import { extent } from 'd3-array'
import { mesAno, mesRelativo } from '../domain/formatos'
import { texto } from '../config'

export interface PontoGrafico {
  x: number
  y: number
  data: string
  original?: string
}
export interface MarcaGrafico {
  x: number
  rotulo: string
}
export interface SerieGrafico {
  id: string
  rotulo: string
  cor: string
  tracejado?: boolean
  pontos: PontoGrafico[]
  marcas?: MarcaGrafico[]
}

const props = withDefaults(
  defineProps<{
    series: SerieGrafico[]
    xMin: number
    xMax: number
    refY: number
    formatY: (valor: number) => string
    /** formato do valor na dica; se omitido usa formatY */
    formatValor?: (v: number) => string
    altura?: number
    compacto?: boolean
    descricao: string
    /**
     * Série em foco: traço mais firme e cor plena; as demais recuam (traço fino, opacidade menor).
     * null = todas com o mesmo peso.
     */
    foco?: string | null
    /** Faixa de recessão (pico ao vale do NBER), em meses relativos. */
    faixa?: { x0: number; x1: number; rotulo?: string } | null
    /** Domínio fixo do eixo y, para pequenos múltiplos que precisam da mesma escala. */
    dominioY?: [number, number] | null
  }>(),
  { altura: 380, compacto: false, foco: null, faixa: null, dominioY: null },
)
const emit = defineEmits<{ (e: 'foco', id: string | null): void }>()

/** O foco só vale se a série estiver no gráfico (ex.: o Brasil pode não ter dados no episódio). */
const focoValido = computed(() => (props.series.some((serie) => serie.id === props.foco) ? props.foco : null))
const emFoco = (id: string) => focoValido.value === id
const emContexto = (id: string) => focoValido.value != null && focoValido.value !== id
/** A série em foco é desenhada por último, por cima das outras. */
const seriesOrdenadas = computed(() =>
  [...props.series].sort((primeira, segunda) => Number(emFoco(primeira.id)) - Number(emFoco(segunda.id))),
)

const caixa = ref<HTMLDivElement | null>(null)
const largura = ref(800)
let observadorTamanho: ResizeObserver | null = null
onMounted(() => {
  observadorTamanho = new ResizeObserver(([medida]) => (largura.value = Math.max(240, medida.contentRect.width)))
  if (caixa.value) observadorTamanho.observe(caixa.value)
})
onBeforeUnmount(() => observadorTamanho?.disconnect())

const margens = computed(() =>
  props.compacto ? { t: 10, r: 8, b: 22, l: 38 } : { t: 22, r: 76, b: 42, l: 38 },
)
const larguraInterna = computed(() => largura.value - margens.value.l - margens.value.r)
const alturaInterna = computed(() => props.altura - margens.value.t - margens.value.b)

const x = computed(() => scaleLinear().domain([props.xMin, props.xMax]).range([0, larguraInterna.value]))
const y = computed(() => {
  const valoresEixoY = props.dominioY
    ? [...props.dominioY]
    : props.series.flatMap((serie) => serie.pontos.map((ponto) => ponto.y))
  const [valorMinimo, valorMaximo] = extent([...valoresEixoY, props.refY]) as [number, number]
  const folga = (valorMaximo - valorMinimo || 1) * 0.08
  return scaleLinear()
    .domain([valorMinimo - folga, valorMaximo + folga])
    .range([alturaInterna.value, 0])
    .nice(props.compacto ? 4 : 6)
})

const gerador = computed(() =>
  line<PontoGrafico>()
    .x((ponto) => x.value(ponto.x))
    .y((ponto) => y.value(ponto.y))
    .curve(curveMonotoneX),
)

const faixaVisivel = computed(() => {
  const faixaSolicitada = props.faixa
  if (!faixaSolicitada) return null
  const x0 = Math.max(faixaSolicitada.x0, props.xMin)
  const x1 = Math.min(faixaSolicitada.x1, props.xMax)
  if (x1 <= x0) return null
  return { x: x.value(x0), w: x.value(x1) - x.value(x0), rotulo: faixaSolicitada.rotulo }
})

const ticksX = computed(() => {
  const passo = props.xMax - props.xMin > 40 || props.compacto ? 12 : 6
  const marcacoes: number[] = []
  for (let valor = Math.ceil(props.xMin / passo) * passo; valor <= props.xMax; valor += passo) marcacoes.push(valor)
  return marcacoes
})
const ticksY = computed(() => y.value.ticks(props.compacto ? 4 : 6))

/** Rótulos diretos no fim de cada linha, afastados para não colidir. */
const rotulosDiretos = computed(() => {
  if (props.compacto) return []
  const itens = props.series
    .filter((serie) => serie.pontos.length)
    .map((serie) => {
      const ultimoPonto = serie.pontos[serie.pontos.length - 1]
      return { id: serie.id, rotulo: serie.rotulo, cor: serie.cor, x: x.value(ultimoPonto.x), y: y.value(ultimoPonto.y) }
    })
    .sort((primeiro, segundo) => primeiro.y - segundo.y)
  // Afasta rótulos que terminam perto no eixo y: empurra para baixo, depois devolve para cima
  // o que passou da área do gráfico, mantendo o espaçamento mínimo e a ordem.
  const espacamentoMinimo = 15
  for (let i = 1; i < itens.length; i++) {
    if (itens[i].y - itens[i - 1].y < espacamentoMinimo) {
      itens[i].y = itens[i - 1].y + espacamentoMinimo
    }
  }
  const limiteInferior = alturaInterna.value
  for (let i = itens.length - 1; i >= 0; i--) {
    const limiteAtual = i === itens.length - 1 ? limiteInferior : itens[i + 1].y - espacamentoMinimo
    if (itens[i].y > limiteAtual) itens[i].y = limiteAtual
  }
  return itens
})

const marcasVisiveis = computed(() =>
  props.series.flatMap((serie) =>
    (serie.marcas ?? []).flatMap((marca) => {
      const ponto = serie.pontos.find((item) => item.x === marca.x)
      return ponto ? [{ serie, marca, ponto }] : []
    }),
  ),
)

// ---- camada de hover / teclado ----
const mesRelativoAtivo = ref<number | null>(null)
function aoMover(eventoPonteiro: PointerEvent) {
  const limitesRetangulo = (eventoPonteiro.currentTarget as SVGRectElement).getBoundingClientRect()
  const mesRelativo = Math.round(x.value.invert(eventoPonteiro.clientX - limitesRetangulo.left))
  mesRelativoAtivo.value = Math.min(props.xMax, Math.max(props.xMin, mesRelativo))
}
function aoTeclar(eventoTeclado: KeyboardEvent) {
  if (eventoTeclado.key === 'ArrowRight' || eventoTeclado.key === 'ArrowLeft') {
    eventoTeclado.preventDefault()
    const deslocamento = eventoTeclado.key === 'ArrowRight' ? 1 : -1
    mesRelativoAtivo.value = Math.min(
      props.xMax,
      Math.max(props.xMin, (mesRelativoAtivo.value ?? 0) + deslocamento),
    )
  } else if (eventoTeclado.key === 'Escape') mesRelativoAtivo.value = null
}

const leitura = computed(() => {
  if (mesRelativoAtivo.value == null) return null
  const linhas = props.series
    .map((serie) => ({ serie, ponto: serie.pontos.find((item) => item.x === mesRelativoAtivo.value) }))
    .filter((linha): linha is { serie: SerieGrafico; ponto: PontoGrafico } => !!linha.ponto)
    .sort((primeira, segunda) => segunda.ponto.y - primeira.ponto.y)
  const posicaoX = x.value(mesRelativoAtivo.value) + margens.value.l
  const dicaDireita = posicaoX < largura.value * 0.6
  return { linhas, posicaoX, dicaDireita, mesRelativoAtivo: mesRelativoAtivo.value }
})
</script>

<template>
  <div ref="caixa" class="grafico" :class="{ compacto }" :style="{ height: `${altura}px` }">
    <svg
      :width="largura"
      :height="altura"
      role="img"
      :aria-label="descricao"
      tabindex="0"
      @keydown="aoTeclar"
      @blur="mesRelativoAtivo = null"
    >
      <g :transform="`translate(${margens.l},${margens.t})`">
        <!-- faixa de recessão (NBER) -->
        <g v-if="faixaVisivel">
          <rect :x="faixaVisivel.x" :width="faixaVisivel.w" :height="alturaInterna" class="faixa-nber" />
          <text v-if="faixaVisivel.rotulo && !compacto" :x="faixaVisivel.x + 6" y="12" class="rotulo-faixa">
            {{ faixaVisivel.rotulo }}
          </text>
        </g>
        <!-- grade e eixo y -->
        <g class="eixo-y">
          <g v-for="marcacao in ticksY" :key="`y${marcacao}`" :transform="`translate(0,${y(marcacao)})`">
            <line :x2="larguraInterna" class="grade" />
            <text :x="-margens.l" dy="0.32em" text-anchor="start">{{ formatY(marcacao) }}</text>
          </g>
        </g>
        <!-- referência (pico = 100 ou 0 p.p.) -->
        <line :x1="0" :x2="larguraInterna" :y1="y(refY)" :y2="y(refY)" class="referencia" />

        <!-- eixo x -->
        <g :transform="`translate(0,${alturaInterna})`" class="eixo-x">
          <line :x2="larguraInterna" class="base" />
          <g v-for="marcacao in ticksX" :key="`x${marcacao}`" :transform="`translate(${x(marcacao)},0)`">
            <line y2="4" class="base" />
            <text y="16" text-anchor="middle">{{ marcacao === 0 ? '0' : mesRelativo(marcacao) }}</text>
          </g>
          <text v-if="!compacto" :x="larguraInterna / 2" y="34" text-anchor="middle" class="titulo-eixo">
            {{ texto('eixo_x') }}
          </text>
        </g>

        <!-- mês do pico -->
        <g v-if="xMin <= 0 && xMax >= 0" :transform="`translate(${x(0)},0)`">
          <line :y2="alturaInterna" class="pico" />
          <text v-if="!compacto" y="-8" text-anchor="middle" class="rotulo-pico">pico</text>
        </g>

        <!-- linhas -->
        <path
          v-for="serie in seriesOrdenadas"
          :key="serie.id"
          :d="gerador(serie.pontos) ?? ''"
          class="linha"
          :class="{ tracejada: serie.tracejado, foco: emFoco(serie.id), contexto: emContexto(serie.id) }"
          :style="{ stroke: serie.cor }"
        />

        <!-- marcas (vale, reação) -->
        <circle
          v-for="itemMarca in marcasVisiveis"
          :key="`${itemMarca.serie.id}${itemMarca.marca.rotulo}`"
          :cx="x(itemMarca.marca.x)"
          :cy="y(itemMarca.ponto.y)"
          r="4.5"
          class="marca"
          :class="{ contexto: emContexto(itemMarca.serie.id) }"
          :style="{ fill: itemMarca.serie.cor }"
        >
          <title>{{ itemMarca.serie.rotulo }}: {{ itemMarca.marca.rotulo }}</title>
        </circle>

        <!-- rótulos diretos -->
        <g
          v-for="rotulo in rotulosDiretos"
          :key="`r${rotulo.id}`"
          :transform="`translate(${rotulo.x + 8},${rotulo.y})`"
          class="rotulo-grupo"
          :class="{ contexto: emContexto(rotulo.id) }"
          @pointerenter="emit('foco', rotulo.id)"
          @pointerleave="emit('foco', null)"
        >
          <line x1="-6" x2="-1" class="guia" :style="{ stroke: rotulo.cor }" />
          <text dy="0.32em" class="rotulo-direto">{{ rotulo.rotulo }}</text>
        </g>

        <!-- crosshair -->
        <g v-if="leitura">
          <line :x1="x(leitura.mesRelativoAtivo)" :x2="x(leitura.mesRelativoAtivo)" :y2="alturaInterna" class="cruz" />
          <circle
            v-for="linha in leitura.linhas"
            :key="`c${linha.serie.id}`"
            :cx="x(linha.ponto.x)"
            :cy="y(linha.ponto.y)"
            r="4"
            class="ponto-ativo"
            :style="{ fill: linha.serie.cor }"
          />
        </g>

        <rect
          :width="larguraInterna"
          :height="alturaInterna"
          fill="transparent"
          @pointermove="aoMover"
          @pointerleave="mesRelativoAtivo = null"
        />
      </g>
    </svg>

    <div
      v-if="leitura && leitura.linhas.length"
      class="dica"
      :style="{
        left: leitura.dicaDireita ? `${leitura.posicaoX + 14}px` : 'auto',
        right: leitura.dicaDireita ? 'auto' : `${largura - leitura.posicaoX + 14}px`,
        top: `${margens.t}px`,
      }"
      role="status"
    >
      <div class="dica-cab">{{ leitura.mesRelativoAtivo === 0 ? 'Mês do pico' : `${mesRelativo(leitura.mesRelativoAtivo)} meses do pico` }}</div>
      <div v-for="linha in leitura.linhas" :key="`d${linha.serie.id}`" class="dica-linha">
        <span class="chave" :class="{ tracejada: linha.serie.tracejado }" :style="{ color: linha.serie.cor }" />
        <strong class="num">{{ (formatValor ?? formatY)(linha.ponto.y) }}</strong>
        <span class="dica-serie">{{ linha.serie.rotulo }}, {{ mesAno(linha.ponto.data) }}</span>
        <span v-if="linha.ponto.original" class="dica-original num">{{ linha.ponto.original }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grafico {
  position: relative;
  width: 100%;
}
svg {
  display: block;
  overflow: visible;
}
svg:focus-visible {
  outline-offset: 4px;
}
text {
  fill: var(--texto-2);
  font-size: var(--t-5);
  font-family: var(--fonte-num);
  font-variant-numeric: tabular-nums;
}
.titulo-eixo,
.rotulo-pico {
  font-family: var(--fonte);
}
.grade {
  stroke: var(--grade);
  stroke-width: 1;
  shape-rendering: crispEdges;
}
.base {
  stroke: var(--referencia);
  shape-rendering: crispEdges;
}
.referencia {
  stroke: var(--referencia);
  stroke-width: 1.5;
}
.pico {
  stroke: var(--texto-2);
  stroke-width: 1.25;
  stroke-dasharray: 4 3;
}
.rotulo-pico {
  fill: var(--texto-2);
}
.titulo-eixo {
  fill: var(--texto-3);
}
.faixa-nber {
  fill: var(--nber);
}
.rotulo-faixa {
  fill: var(--texto-2);
  font-size: var(--t-5);
}
/* Hierarquia: foco 2.75px; contexto 1.5px e 70% de opacidade (continua acima de 3:1 sobre o papel). */
.linha {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
  transition: opacity var(--transicao), stroke-width var(--transicao);
}
.linha.foco {
  stroke-width: 2.75;
}
.linha.contexto {
  stroke-width: 1.5;
  opacity: 1;
}
/* Nos pequenos múltiplos a série de contexto precisa continuar legível para a comparação. */
.compacto .linha.contexto {
  opacity: 1;
}
.marca.contexto,
.rotulo-grupo.contexto { opacity: 1; }
.rotulo-grupo {
  cursor: default;
  transition: opacity var(--transicao);
}
.linha.tracejada {
  stroke-dasharray: 6 4;
}
.marca {
  stroke: var(--superficie);
  stroke-width: 2;
}
.ponto-ativo {
  stroke: var(--superficie);
  stroke-width: 2;
  pointer-events: none;
}
.cruz {
  stroke: var(--texto-3);
  stroke-width: 1;
  pointer-events: none;
}
.guia {
  stroke-width: 2;
}
.rotulo-direto {
  fill: var(--texto);
  font-weight: 500;
  font-size: var(--t-5);
}
.dica {
  position: absolute;
  pointer-events: none;
  background: var(--superficie);
  border: 1px solid var(--texto-3);
  border-radius: 3px;
  padding: 8px 10px;
  min-width: 200px;
  font-size: var(--t-5);
  z-index: 5;
}
.dica-cab {
  color: var(--texto-2);
  margin-bottom: 4px;
}
.dica-linha {
  display: grid;
  grid-template-columns: 24px auto 1fr;
  align-items: baseline;
  column-gap: 6px;
  padding: 2px 0;
}
.dica-linha strong {
  font-family: var(--fonte-num);
  color: var(--texto);
  font-size: var(--t-5);
}
.dica-serie {
  color: var(--texto-2);
}
.dica-original {
  grid-column: 2 / 4;
  color: var(--texto-3);
  font-size: var(--t-5);
}
</style>
