/** Converte linhas em CSV UTF-8 e inicia o download no navegador. */
export function baixarArquivoCsv(nomeArquivo: string, linhas: string[][]) {
  const escaparCampo = (campo: string) => (/[",\n]/.test(campo) ? `"${campo.replace(/"/g, '""')}"` : campo)
  const conteudoCsv = '\uFEFF' + linhas.map((linha) => linha.map(escaparCampo).join(',')).join('\r\n')
  const urlObjeto = URL.createObjectURL(new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8' }))
  const linkDownload = document.createElement('a')
  linkDownload.href = urlObjeto
  linkDownload.download = nomeArquivo
  linkDownload.click()
  setTimeout(() => URL.revokeObjectURL(urlObjeto), 1000)
}
