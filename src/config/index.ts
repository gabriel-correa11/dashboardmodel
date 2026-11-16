/**
 * Configuração do painel: textos, opções dos filtros, cores e glossário ficam em painel.json,
 * fora dos componentes. Para mudar um texto ou acrescentar uma janela, edite o JSON.
 */
import configuracaoOriginal from './painel.json'

export interface ConfigPainel {
  titulo: string
  subtitulo: string
  aviso_ilustrativo: string
  padroes: { serie: string; antes: number; depois: number }
  janelas: { antes: number[]; depois: number[] }
  cores: { pais_foco: string; paises_tracejados: string[] }
  abas: { id: string; nome: string }[]
  textos: Record<string, string> & { sentido: Record<string, string> }
  glossario: [string, string][]
}

export const config = configuracaoOriginal as unknown as ConfigPainel

/** Preenche {chaves} de um modelo de texto do painel.json. */
export function texto(chave: string, variaveis: Record<string, string | number> = {}): string {
  const modelo = config.textos[chave]
  if (typeof modelo !== 'string') return chave
  return preencher(modelo, variaveis)
}

export function preencher(modelo: string, variaveis: Record<string, string | number>): string {
  return modelo.replace(/\{(\w+)\}/g, (_, chave: string) =>
    chave in variaveis ? String(variaveis[chave]) : `{${chave}}`,
  )
}
