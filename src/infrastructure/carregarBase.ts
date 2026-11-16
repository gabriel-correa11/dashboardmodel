import type {
  BaseDados,
  Comparacao,
  Edicao,
  Episodio,
  Execucao,
  Grupo,
  PaisDim,
  RecessaoNber,
  ResumoEpisodio,
  Serie,
  ValorAlinhado,
} from '../domain/contrato'

declare global {
  interface Window {
    /** Dados embutidos pelo build em arquivo único. */
    __DADOS__?: Record<string, unknown>
  }
}

async function lerArquivo<T>(nomeArquivo: string): Promise<T> {
  const dadoEmbutido = window.__DADOS__?.[nomeArquivo]
  if (dadoEmbutido !== undefined) return dadoEmbutido as T

  const resposta = await fetch(`${import.meta.env.BASE_URL}data/${nomeArquivo}`)
  if (!resposta.ok) throw new Error(`Não foi possível ler ${nomeArquivo} (HTTP ${resposta.status})`)
  return resposta.json() as Promise<T>
}

/** Carrega os arquivos JSON publicados pela camada Gold. */
export async function carregarBase(): Promise<BaseDados> {
  const [edicao, episodios, grupos, paises, cronologia, series, valores, resumos, comparacoes, execucoes] = await Promise.all([
    lerArquivo<Edicao>('edicao.json'),
    lerArquivo<Episodio[]>('dim_episodio.json'),
    lerArquivo<Grupo[]>('dim_grupo.json'),
    lerArquivo<PaisDim[]>('dim_pais.json'),
    // A cronologia histórica é complementar; sem ela, a linha do tempo continua exibindo os episódios analisados.
    lerArquivo<RecessaoNber[]>('cronologia_nber.json').catch((): RecessaoNber[] => []),
    lerArquivo<Serie[]>('dim_serie.json'),
    lerArquivo<ValorAlinhado[]>('fato_valor_alinhado.json'),
    lerArquivo<ResumoEpisodio[]>('fato_resumo_episodio.json'),
    lerArquivo<Comparacao[]>('fato_comparacao.json'),
    lerArquivo<Execucao[]>('execucoes.json'),
  ])

  return { edicao, episodios, grupos, paises, cronologia, series, valores, resumos, comparacoes, execucoes }
}
