import type { CoverLetterInput } from '@/lib/zod-schemas/cover-letter.js'

interface Props {
  data: CoverLetterInput
  onDataChange: (data: CoverLetterInput) => void
}

const inputClass =
  'w-full px-3 py-2.5 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none transition-all'

export default function CoverLetterClosingForm({ data, onDataChange }: Props) {
  return (
    <div>
      <div className="mb-4">
        <label htmlFor="cl-closing-phrase" className="block text-sm font-medium text-text-secondary mb-1">
          Frase de encerramento
        </label>
        <input
          id="cl-closing-phrase"
          className={inputClass}
          value={data.closingPhrase}
          onChange={(e) => onDataChange({ ...data, closingPhrase: e.target.value })}
          placeholder="Sincerely,"
        />
        <p className="text-xs text-text-muted mt-1">
          Ex: Sincerely, / Atenciosamente, / Best regards,
        </p>
      </div>
      <div className="mb-4">
        <label htmlFor="cl-signature" className="block text-sm font-medium text-text-secondary mb-1">
          Assinatura
        </label>
        <input
          id="cl-signature"
          className={inputClass}
          value={data.signature}
          onChange={(e) => onDataChange({ ...data, signature: e.target.value })}
          placeholder={data.sender.name || 'Seu nome'}
        />
        <p className="text-xs text-text-muted mt-1">
          Geralmente o mesmo que o nome do remetente
        </p>
      </div>
    </div>
  )
}
