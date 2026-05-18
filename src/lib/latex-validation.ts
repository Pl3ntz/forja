export const DANGEROUS_LATEX =
  /\\(input|include|write18|directlua|latelua|immediate|openout|openin|closeout|closein|catcode|def|let|expandafter|csname|endcsname|read|usepackage|RequirePackage|verbatiminput|special|newread|newwrite)(\d|\b)/i

export class DangerousLatexError extends Error {
  constructor() {
    super('LaTeX source contains potentially unsafe commands.')
    this.name = 'DangerousLatexError'
  }
}

export function validateUserLatex(latex: string): void {
  if (DANGEROUS_LATEX.test(latex)) throw new DangerousLatexError()
}
