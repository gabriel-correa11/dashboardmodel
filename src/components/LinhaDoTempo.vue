<script setup lang="ts">
/**
 * Linha do tempo das recessões do NBER, que também é o seletor de episódios (RF08).
 * As faixas vão do pico ao vale de cada episódio, como o FRED sombreia recessões.
 * O período mostrado vem dos dados: da década do primeiro pico até a data da edição.
 */
import { computed } from 'vue'
import { base, filtros } from '../application/estadoPainel'
import { mesAno } from '../domain/formatos'
import { texto } from '../config'

const emMeses = (anoMes: string) => {
  const [ano, mes] = anoMes.split('-').map(Number)
  return ano * 12 + (mes - 1)
}

const periodo = computed(() => {
  const dados = base.value
  if (!dados || !dados.episodios.length) return null
  const anosDePico = [...dados.episodios, ...dados.cronologia].map((episodio) => Number(episodio.pico.slice(0, 4)))
  const primeiroAno = Math.min(...anosDePico)
  const inicio = Math.floor(primeiroAno / 10) * 10 * 12
  const fim = emMeses(dados.edicao.gerado_em.slice(0, 7)) + 1
  return { inicio, fim }
})

const posicaoPercentual = (mesesAbsolutos: number) => {
  const periodoAtual = periodo.value
  if (!periodoAtual) return 0
  return ((mesesAbsolutos - periodoAtual.inicio) / (periodoAtual.fim - periodoAtual.inicio)) * 100
}

const anos = computed(() => {
  const periodoAtual = periodo.value
  if (!periodoAtual) return []
  const marcacoes: { ano: number; x: number; rotulo: boolean }[] = []
  for (let ano = periodoAtual.inicio / 12; ano * 12 <= periodoAtual.fim; ano += 5) {
    marcacoes.push({ ano, x: posicaoPercentual(ano * 12), rotulo: ano % 10 === 0 })
  }
  return marcacoes
})

const faixas = computed(() =>
  (base.value?.episodios ?? []).map((episodio) => {
    const posicaoInicio = posicaoPercentual(emMeses(episodio.pico))
    const largura = posicaoPercentual(emMeses(episodio.vale) + 1) - posicaoInicio
    const ativo = filtros.episodios.includes(episodio.id)
    return { episodio, x: posicaoInicio, largura, ativo, aDireita: posicaoInicio > 80 }
  }),
)

/** Recessões do NBER que não estão entre os episódios analisados: só contexto. */
const outras = computed(() => {
  const dados = base.value
  if (!dados) return []
  const picosAnalisados = new Set(dados.episodios.map((episodio) => episodio.pico))
  return dados.cronologia
    .filter((recessao) => !picosAnalisados.has(recessao.pico))
    .map((recessao) => ({
      recessao,
      x: posicaoPercentual(emMeses(recessao.pico)),
      largura: posicaoPercentual(emMeses(recessao.vale) + 1) - posicaoPercentual(emMeses(recessao.pico)),
    }))
})

function alternar(idEpisodio: string) {
  const indiceSelecionado = filtros.episodios.indexOf(idEpisodio)
  if (indiceSelecionado < 0) filtros.episodios.push(idEpisodio)
  else if (filtros.episodios.length > 1) filtros.episodios.splice(indiceSelecionado, 1)
}
</script>

<template>
  <section v-if="periodo" class="linha-tempo" aria-labelledby="lt-titulo">
    <p id="lt-titulo" class="explica">{{ texto('linha_tempo') }}</p>
    <div class="trilho">
      <div class="eixo" aria-hidden="true" />
      <span
        v-for="marcacaoAno in anos"
        :key="marcacaoAno.ano"
        class="ano"
        :class="{ menor: !marcacaoAno.rotulo }"
        :style="{ left: `${marcacaoAno.x}%` }"
        aria-hidden="true"
      >
        <span v-if="marcacaoAno.rotulo" class="num" :class="{ inicio: marcacaoAno.x < 1, fim: marcacaoAno.x > 99 }">{{ marcacaoAno.ano }}</span>
      </span>

      <span
        v-for="outraRecessao in outras"
        :key="outraRecessao.recessao.pico"
        class="faixa contexto"
        :style="{ left: `${outraRecessao.x}%`, width: `max(6px, ${outraRecessao.largura}%)` }"
        :title="`Recessão de ${mesAno(outraRecessao.recessao.pico)} a ${mesAno(outraRecessao.recessao.vale)}, fora da análise`"
      />

      <button
        v-for="faixa in faixas"
        :key="faixa.episodio.id"
        type="button"
        class="faixa"
        :class="{ ativo: faixa.ativo, 'a-direita': faixa.aDireita }"
        :style="{ left: `${faixa.x}%`, width: `max(12px, ${faixa.largura}%)` }"
        :aria-pressed="faixa.ativo"
        :disabled="faixa.ativo && filtros.episodios.length === 1"
        :aria-label="`${faixa.episodio.nome}, de ${mesAno(faixa.episodio.pico)} a ${mesAno(faixa.episodio.vale)}`"
        @click="alternar(faixa.episodio.id)"
      >
        <span class="rotulo">
          <span class="nome">{{ faixa.episodio.rotulo }}</span>
          <span class="datas">{{ mesAno(faixa.episodio.pico) }} a {{ mesAno(faixa.episodio.vale) }}</span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.explica {
  font-size: var(--t-5);
  color: var(--texto-2);
}
/* Sem recuo lateral: o eixo começa na mesma margem do título e dos filtros. */
.trilho {
  position: relative;
  height: 76px;
  margin-top: 2px;
}
.eixo {
  position: absolute;
  left: 0;
  right: 0;
  top: 54px;
  border-top: 1px solid var(--referencia);
}
.ano {
  position: absolute;
  top: 54px;
  height: 6px;
  border-left: 1px solid var(--referencia);
}
.ano.menor {
  height: 4px;
}
.ano .num.inicio {
  transform: none;
}
.ano .num.fim {
  transform: translateX(-100%);
}
.ano .num {
  position: absolute;
  top: 6px;
  transform: translateX(-50%);
  font-size: var(--t-5);
  color: var(--texto-3);
}
.faixa {
  position: absolute;
  top: 36px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 1px 1px 0 0;
  background: var(--nber);
  cursor: pointer;
  transition: background-color var(--transicao), outline-color var(--transicao);
}
.faixa:not(.ativo):not(.contexto) {
  background: transparent;
  border: 1px dashed var(--texto-2);
  border-bottom: 0;
}
.faixa.contexto {
  top: 45px;
  height: 9px;
  cursor: default;
  background: var(--nber);
  border-radius: 1px 1px 0 0;
}
.faixa.ativo { background: var(--texto); }
.faixa:hover:not(:disabled) {
  outline: 1px solid var(--texto);
  outline-offset: 1px;
}
.faixa:disabled {
  cursor: default;
}
.rotulo {
  position: absolute;
  bottom: calc(100% + 3px);
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  white-space: nowrap;
  line-height: 1.2;
  text-align: left;
}
.a-direita .rotulo {
  left: auto;
  right: 0;
  align-items: flex-end;
}
.nome {
  font-size: var(--t-4);
  font-weight: 600;
  color: var(--texto-3);
}
.ativo .nome {
  color: var(--texto);
}
.datas {
  font-size: var(--t-5);
  color: var(--texto-3);
}
@media (max-width: 700px) {
  .datas {
    display: none;
  }
  .trilho {
    height: 62px;
  }
  .faixa {
    top: 22px;
  }
  .faixa:not(.ativo):not(.contexto) {
  border: 1px dashed var(--texto-3);
  border-bottom: 0;
}
.faixa.contexto {
    top: 31px;
  }
  .eixo,
  .ano {
    top: 54px;
  }
}
</style>
