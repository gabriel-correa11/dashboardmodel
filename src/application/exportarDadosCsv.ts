import { base, filtros, seriesFiltradas, serieAtual, valoresNaJanela, aba, nomePais } from './estadoPainel'

type AdaptadorDownloadCsv = (nomeArquivo: string, linhas: string[][]) => void

/** Exporta em CSV os dados visíveis, respeitando os filtros globais. */
export function exportarDadosCsv(baixarArquivo: AdaptadorDownloadCsv) {
  const dados = base.value
  if (!dados) return

  const seriesExportadas = aba.value === 'episodios' && serieAtual.value ? [serieAtual.value] : seriesFiltradas.value
  const cabecalho = [
    'serie_id', 'serie_codigo', 'serie_nome', 'pais', 'episodio', 'mes_relativo', 'data_referencia',
    'valor_original', 'unidade_original', 'valor_painel', 'unidade_painel', 'metodo', 'versao_metodo',
    'fonte', 'produtor', 'data_coleta', 'id_edicao',
  ]
  const linhasCsv: string[][] = [cabecalho]
  const episodiosSelecionados = dados.episodios.filter((episodio) => filtros.episodios.includes(episodio.id))

  for (const serie of seriesExportadas) {
    for (const episodio of episodiosSelecionados) {
      for (const valor of valoresNaJanela(serie.id, episodio.id)) {
        linhasCsv.push([
          serie.id,
          serie.codigo,
          serie.nome,
          nomePais(serie.pais),
          episodio.rotulo,
          String(valor.mes_relativo),
          valor.data_referencia,
          String(valor.valor_original),
          serie.unidade_original,
          String(valor.valor_painel),
          serie.unidade_painel,
          serie.metodo.tipo,
          serie.metodo.versao,
          serie.fonte.portal,
          serie.fonte.produtor,
          valor.data_coleta,
          valor.id_edicao,
        ])
      }
    }
  }

  baixarArquivo(`painel-recessoes_${aba.value}_${dados.edicao.id_edicao}.csv`, linhasCsv)
}
