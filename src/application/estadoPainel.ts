import { computed, reactive, ref } from 'vue'
import type { BaseDados, Serie, ValorAlinhado } from '../domain/contrato'
import { config } from '../config'

export const base = ref<BaseDados | null>(null)

/** Filtros globais (RF08). Valem para todas as abas. Valores iniciais vêm de config/painel.json. */
export const filtros = reactive({
  grupo: 'todos' as string,
  pais: 'todos' as string,
  serieId: config.padroes.serie,
  episodios: [] as string[],
  antes: config.padroes.antes,
  depois: config.padroes.depois,
})

export const aba = ref<string>(config.abas[0].id)

/** Chamado depois de carregar os dados: seleciona todos os episódios cadastrados. */
export function iniciarFiltros(dados: BaseDados) {
  filtros.episodios = dados.episodios.map((episodio) => episodio.id)
  if (!dados.series.some((serie) => serie.id === filtros.serieId)) filtros.serieId = dados.series[0]?.id ?? ''
}

export function nomePais(idPais: string) {
  return base.value?.paises.find((pais) => pais.id === idPais)?.nome ?? idPais
}

/** O mais recente é dado em foco fora da comparação de episódios; comparações usam ardósia. */
export function corEpisodio(idEpisodio: string, focoId?: string | null) {
  if (focoId) return idEpisodio === focoId ? 'var(--dado)' : 'var(--comparacao)'
  const episodios = base.value?.episodios ?? []
  return episodios.at(-1)?.id === idEpisodio ? 'var(--dado)' : 'var(--comparacao)'
}

/** Brasil é o dado em foco; os demais países são comparações em ardósia. */
export function corPais(idPais: string) {
  return idPais === config.cores.pais_foco ? 'var(--pais-foco)' : 'var(--pais-contexto)'
}

export function paisTracejado(idPais: string) {
  return config.cores.paises_tracejados.includes(idPais)
}

export const seriesFiltradas = computed<Serie[]>(() => {
  if (!base.value) return []
  return base.value.series.filter(
    (serie) => (filtros.grupo === 'todos' || serie.grupo === filtros.grupo) && (filtros.pais === 'todos' || serie.pais === filtros.pais),
  )
})

export const serieAtual = computed<Serie | undefined>(() => base.value?.series.find((serie) => serie.id === filtros.serieId))

export const episodiosAtivos = computed(() =>
  (base.value?.episodios ?? []).filter((episodio) => filtros.episodios.includes(episodio.id)),
)

const indiceValores = computed(() => {
  const valoresPorSerieEpisodio = new Map<string, ValorAlinhado[]>()
  for (const valor of base.value?.valores ?? []) {
    const chave = `${valor.id_serie}|${valor.id_episodio}`
    let valoresDoEpisodio = valoresPorSerieEpisodio.get(chave)
    if (!valoresDoEpisodio) valoresPorSerieEpisodio.set(chave, (valoresDoEpisodio = []))
    valoresDoEpisodio.push(valor)
  }
  for (const valoresDoEpisodio of valoresPorSerieEpisodio.values()) {
    valoresDoEpisodio.sort((primeiro, segundo) => primeiro.mes_relativo - segundo.mes_relativo)
  }
  return valoresPorSerieEpisodio
})

export function valoresNaJanela(idSerie: string, idEpisodio: string): ValorAlinhado[] {
  return (indiceValores.value.get(`${idSerie}|${idEpisodio}`) ?? []).filter(
    (valor) => valor.mes_relativo >= -filtros.antes && valor.mes_relativo <= filtros.depois,
  )
}

export function resumoDe(idSerie: string, idEpisodio: string) {
  return base.value?.resumos.find((resumo) => resumo.id_serie === idSerie && resumo.id_episodio === idEpisodio)
}

export function serie(idSerie: string | null | undefined) {
  return base.value?.series.find((item) => item.id === idSerie)
}

export function nomeGrupo(idGrupo: string) {
  return base.value?.grupos.find((grupo) => grupo.id === idGrupo)?.nome ?? idGrupo
}

export function rotuloEpisodio(idEpisodio: string) {
  return base.value?.episodios.find((episodio) => episodio.id === idEpisodio)?.rotulo ?? idEpisodio
}
