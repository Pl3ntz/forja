import { describe, it, expect } from 'vitest'
import {
  DANGEROUS_LATEX,
  DangerousLatexError,
  validateUserLatex,
} from '../../src/lib/latex-validation.js'

const DANGEROUS_COMMANDS = [
  '\\input{file}',
  '\\include{chapter}',
  '\\write18{rm -rf}',
  '\\immediate\\write18{cmd}',
  '\\openout16=file.tex',
  '\\openin15=file.tex',
  '\\catcode`@=11',
  '\\def\\foo{bar}',
  '\\let\\foo\\bar',
  '\\expandafter\\foo',
  '\\csname foo\\endcsname',
  '\\read15 to\\line',
  '\\usepackage{geometry}',
  '\\RequirePackage{amsmath}',
]

const SAFE_LATEX = [
  'Hello World',
  '\\textbf{bold}',
  '\\textit{italic}',
  '\\section{Introduction}',
  '\\begin{document}',
  '\\end{document}',
  '\\item First item',
  '\\LaTeX',
  '\\newcommand{\\name}{John}',
  '\\hspace{1cm}',
  '\\vspace{2mm}',
  '\\linebreak',
]

describe('DANGEROUS_LATEX regex', () => {
  it.each(DANGEROUS_COMMANDS)('matches dangerous command: %s', (cmd) => {
    expect(DANGEROUS_LATEX.test(cmd)).toBe(true)
  })

  it.each(SAFE_LATEX)('does not match safe latex: %s', (safe) => {
    expect(DANGEROUS_LATEX.test(safe)).toBe(false)
  })
})

describe('DangerousLatexError', () => {
  it('is an instance of Error', () => {
    const err = new DangerousLatexError()
    expect(err).toBeInstanceOf(Error)
  })

  it('has the expected message', () => {
    const err = new DangerousLatexError()
    expect(err.message).toBe('LaTeX source contains potentially unsafe commands.')
  })
})

describe('validateUserLatex', () => {
  it('does not throw for safe LaTeX', () => {
    expect(() => validateUserLatex('\\textbf{Hello}')).not.toThrow()
    expect(() => validateUserLatex('')).not.toThrow()
    expect(() => validateUserLatex('\\section{Intro}\n\\textit{text}')).not.toThrow()
  })

  it.each(DANGEROUS_COMMANDS)('throws DangerousLatexError for: %s', (cmd) => {
    expect(() => validateUserLatex(cmd)).toThrow(DangerousLatexError)
  })

  it('throws with DangerousLatexError instance (not plain Error)', () => {
    try {
      validateUserLatex('\\write18{rm -rf /}')
      expect(true).toBe(false) // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(DangerousLatexError)
      expect(err).toBeInstanceOf(Error)
    }
  })
})

// Fix 4: missing commands and case-insensitive flag
const NEWLY_ADDED_COMMANDS = [
  '\\directlua{os.execute("rm -rf /")}',
  '\\latelua{dangerous}',
  '\\verbatiminput{/etc/passwd}',
  '\\special{src:/etc/passwd}',
  '\\newread\\myfile',
  '\\newwrite\\myfile',
  '\\closeout16',
  '\\closein15',
]

const NEWLY_ADDED_COMMANDS_UPPERCASE = [
  '\\DIRECTLUA{code}',
  '\\LATELUA{code}',
  '\\VERBATIMINPUT{file}',
  '\\SPECIAL{src:x}',
  '\\NEWREAD\\f',
  '\\NEWWRITE\\f',
  '\\CLOSEOUT16',
  '\\CLOSEIN15',
]

describe('DANGEROUS_LATEX regex — Fix 4 newly-added commands', () => {
  it.each(NEWLY_ADDED_COMMANDS)('matches newly-added dangerous command: %s', (cmd) => {
    expect(DANGEROUS_LATEX.test(cmd)).toBe(true)
  })

  it.each(NEWLY_ADDED_COMMANDS_UPPERCASE)('matches uppercase variant (case-insensitive): %s', (cmd) => {
    expect(DANGEROUS_LATEX.test(cmd)).toBe(true)
  })

  it('existing commands still match uppercase due to /i flag', () => {
    expect(DANGEROUS_LATEX.test('\\INPUT{file}')).toBe(true)
    expect(DANGEROUS_LATEX.test('\\USEPACKAGE{pkg}')).toBe(true)
    expect(DANGEROUS_LATEX.test('\\WRITE18{cmd}')).toBe(true)
  })
})
