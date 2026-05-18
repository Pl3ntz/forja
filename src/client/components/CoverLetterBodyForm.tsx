import type { CoverLetterInput } from '@/lib/zod-schemas/cover-letter.js'

interface Props {
  data: CoverLetterInput
  onDataChange: (data: CoverLetterInput) => void
}

const MAX_PARAGRAPHS = 6

const inputClass =
  'w-full px-3 py-2.5 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none transition-all'

export default function CoverLetterBodyForm({ data, onDataChange }: Props) {
  const body = data.body

  const updateItem = (index: number, field: 'label' | 'content', value: string) => {
    const next = body.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    )
    onDataChange({ ...data, body: next })
  }

  const addParagraph = () => {
    if (body.length >= MAX_PARAGRAPHS) return
    onDataChange({ ...data, body: [...body, { label: '', content: '' }] })
  }

  const removeParagraph = (index: number) => {
    onDataChange({ ...data, body: body.filter((_, i) => i !== index) })
  }

  const moveParagraph = (index: number, direction: 'up' | 'down') => {
    const next = [...body]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onDataChange({ ...data, body: next })
  }

  return (
    <div>
      {body.length === 0 && (
        <p className="text-sm text-text-muted mb-4">
          Nenhum paragrafo adicionado. Clique em "Adicionar paragrafo" para comecar.
        </p>
      )}

      {body.map((item, index) => (
        <div
          key={index}
          className="mb-6 rounded-xl border border-forge-600 bg-forge-800/50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Paragrafo {index + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-forge-600 transition-colors disabled:opacity-30 cursor-pointer border-none bg-transparent"
                onClick={() => moveParagraph(index, 'up')}
                disabled={index === 0}
                aria-label={`Mover paragrafo ${index + 1} para cima`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2v8M3 5l3-3 3 3" />
                </svg>
              </button>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-forge-600 transition-colors disabled:opacity-30 cursor-pointer border-none bg-transparent"
                onClick={() => moveParagraph(index, 'down')}
                disabled={index === body.length - 1}
                aria-label={`Mover paragrafo ${index + 1} para baixo`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 10V2M3 7l3 3 3-3" />
                </svg>
              </button>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer border-none bg-transparent"
                onClick={() => removeParagraph(index)}
                aria-label={`Remover paragrafo ${index + 1}`}
                title="Remover paragrafo"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label
              htmlFor={`cl-body-label-${index}`}
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              Titulo do paragrafo <span className="text-text-muted font-normal">(opcional)</span>
            </label>
            <input
              id={`cl-body-label-${index}`}
              className={inputClass}
              value={item.label}
              onChange={(e) => updateItem(index, 'label', e.target.value)}
              placeholder="Apresentacao / Introduction / Por que esta empresa"
            />
          </div>

          <div>
            <label
              htmlFor={`cl-body-content-${index}`}
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              Conteudo
            </label>
            <textarea
              id={`cl-body-content-${index}`}
              className={`${inputClass} resize-y min-h-[120px]`}
              rows={6}
              value={item.content}
              maxLength={3000}
              onChange={(e) => updateItem(index, 'content', e.target.value)}
              placeholder="Escreva o conteudo deste paragrafo..."
            />
            <p className="text-xs text-text-muted mt-1 text-right">
              {item.content.length}/3000
            </p>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="w-full py-2.5 rounded-lg border border-dashed border-forge-500 text-sm text-text-muted hover:text-ember-400 hover:border-ember-500/50 transition-colors cursor-pointer bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={addParagraph}
        disabled={body.length >= MAX_PARAGRAPHS}
        aria-label="Adicionar paragrafo"
      >
        + Adicionar paragrafo {body.length < MAX_PARAGRAPHS ? `(${body.length}/${MAX_PARAGRAPHS})` : `(maximo atingido)`}
      </button>
    </div>
  )
}
