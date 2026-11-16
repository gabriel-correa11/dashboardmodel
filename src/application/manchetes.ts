/**
 * Títulos que dizem a conclusão do gráfico, montados a partir das medidas da camada Gold.
 * Os modelos de frase ficam em config/painel.json.
 */
import { config, texto } from '../config'
import type { Comparacao, ResumoEpisodio, Serie, SituacaoRecuperacao } from '../domain/contrato'
import { variacao, meses } from '../domain/formatos'
import { base, nomePais, resumoDe, rotuloEpisodio } from './estadoPainel'

type EpisodioComVariacao = {
  idEpisodio: string
  resumo: ResumoEpisodio & { variacao_pico_vale: number }
}
type EpisodioRecuperado = EpisodioComVariacao & {
  resumo: EpisodioComVariacao['resumo'] & { situacao_recuperacao: 'recuperado'; meses_ate_recuperacao: number }
}

/** Episódio com o maior desvio em relação ao pico: é o que o título cita e o que o gráfico destaca. */
export function episodioExtremo(serie: Serie, idsEpisodios: string[]): string | null {
  let idComMaiorVariacao: string | null = null
  let maiorVariacaoAbsoluta = -Infinity
  for (const idEpisodio of idsEpisodios) {
    const variacaoPicoVale = resumoDe(serie.id, idEpisodio)?.variacao_pico_vale
    if (variacaoPicoVale != null && Math.abs(variacaoPicoVale) > maiorVariacaoAbsoluta) {
      maiorVariacaoAbsoluta = Math.abs(variacaoPicoVale)
      idComMaiorVariacao = idEpisodio
    }
  }
  return idComMaiorVariacao
}

export function mancheteEpisodios(serie: Serie, idsEpisodios: string[]): string {
  const sentido = config.textos.sentido[serie.sentido_crise] ?? serie.sentido_crise
  const contexto = { indicador: serie.nome, pais: nomePais(serie.pais), sentido }
  const episodiosComDados = idsEpisodios
    .map((idEpisodio) => ({ idEpisodio, resumo: resumoDe(serie.id, idEpisodio) }))
    .filter((item): item is EpisodioComVariacao => item.resumo?.variacao_pico_vale != null)

  if (!episodiosComDados.length) return texto('manchete_vazia', contexto)
  if (episodiosComDados.length === 1) {
    const { idEpisodio, resumo } = episodiosComDados[0]
    return texto('manchete_um', {
      ...contexto,
      ep: rotuloEpisodio(idEpisodio),
      valor: variacao(resumo.variacao_pico_vale, serie),
    })
  }

  const episodioMaisExtremo = episodiosComDados.reduce((atual, candidato) =>
    Math.abs(candidato.resumo.variacao_pico_vale) > Math.abs(atual.resumo.variacao_pico_vale) ? candidato : atual,
  )
  let manchete = texto('manchete_varios', {
    ...contexto,
    ep_extremo: rotuloEpisodio(episodioMaisExtremo.idEpisodio),
    valor_extremo: variacao(episodioMaisExtremo.resumo.variacao_pico_vale, serie),
  })

  const episodiosRecuperados = episodiosComDados.filter(
    (item): item is EpisodioRecuperado =>
      item.resumo.situacao_recuperacao === 'recuperado' && item.resumo.meses_ate_recuperacao != null,
  )
  if (episodiosRecuperados.length >= 2) {
    const recuperacaoMaisRapida = episodiosRecuperados.reduce((atual, candidato) =>
      candidato.resumo.meses_ate_recuperacao < atual.resumo.meses_ate_recuperacao ? candidato : atual,
    )
    manchete += texto('manchete_recuperacao', {
      ep_rec: rotuloEpisodio(recuperacaoMaisRapida.idEpisodio),
      meses_rec: meses(recuperacaoMaisRapida.resumo.meses_ate_recuperacao),
    })
  }
  return manchete
}

export function manchetePar(idSerieEua: string, idsEpisodios: string[]): string {
  const comparacoesValidas = (base.value?.comparacoes ?? []).filter(
    (comparacao): comparacao is Comparacao & { defasagem_meses: number } =>
      comparacao.id_serie_eua === idSerieEua &&
      idsEpisodios.includes(comparacao.id_episodio) &&
      comparacao.defasagem_meses != null,
  )
  if (!comparacoesValidas.length) return texto('manchete_par_vazia')
  const quantidadeValida = comparacoesValidas.length
  return texto('manchete_par', {
    depois: comparacoesValidas.filter((comparacao) => comparacao.defasagem_meses > 0).length,
    validos:
      quantidadeValida === 1
        ? '1 episódio com dados nos dois países'
        : `${quantidadeValida} episódios com dados nos dois países`,
  })
}

export function textoDefasagem(defasagem: number | null | undefined): string {
  if (defasagem == null) return texto('defasagem_sem')
  if (defasagem === 0) return texto('defasagem_igual')
  return texto(defasagem > 0 ? 'defasagem_depois' : 'defasagem_antes', { n: meses(Math.abs(defasagem)) })
}

export function textoRecuperacao(
  situacao: SituacaoRecuperacao,
  quantidadeMeses: number | null | undefined,
  curta = false,
): string {
  if (situacao === 'recuperado') return texto('recuperado', { n: meses(quantidadeMeses) })
  if (situacao === 'nao_recuperado') {
    return texto(curta ? 'nao_recuperado_curto' : 'nao_recuperado', {
      n: base.value?.edicao.janela_medidas_meses ?? '',
    })
  }
  if (situacao === 'nao_se_aplica') return texto('nao_se_aplica')
  return '—'
}

/** Versão curta para tabelas: sinal + meses. */
export function defasagemCurta(defasagem: number | null | undefined): string {
  if (defasagem == null) return texto('defasagem_curta_sem')
  if (defasagem === 0) return texto('defasagem_curta_igual')
  return texto(
    defasagem > 0 ? 'defasagem_curta_depois' : 'defasagem_curta_antes',
    { n: meses(Math.abs(defasagem)) },
  )
}
