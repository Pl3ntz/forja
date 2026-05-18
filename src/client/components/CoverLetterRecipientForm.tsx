import type { CoverLetterInput } from '@/lib/zod-schemas/cover-letter.js'

interface Props {
  data: CoverLetterInput
  onDataChange: (data: CoverLetterInput) => void
}

const inputClass =
  'w-full px-3 py-2.5 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none transition-all'

export default function CoverLetterRecipientForm({ data, onDataChange }: Props) {
  const recipient = data.recipient

  const updateRecipient = (field: keyof typeof recipient, value: string) => {
    onDataChange({
      ...data,
      recipient: { ...recipient, [field]: value },
    })
  }

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="cl-letter-date" className="block text-sm font-medium text-text-secondary mb-1">
          Data
        </label>
        <input
          id="cl-letter-date"
          className={inputClass}
          value={data.letterDate}
          onChange={(e) => onDataChange({ ...data, letterDate: e.target.value })}
          placeholder="January 15, 2025"
        />
        <p className="text-xs text-text-muted mt-1">Texto livre — ex: 15 de janeiro de 2025</p>
      </div>
      <div className="mb-4">
        <label htmlFor="cl-recipient-salutation" className="block text-sm font-medium text-text-secondary mb-1">
          Saudacao
        </label>
        <input
          id="cl-recipient-salutation"
          className={inputClass}
          value={recipient.salutation}
          onChange={(e) => updateRecipient('salutation', e.target.value)}
          placeholder="Dear Hiring Manager"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="cl-recipient-name" className="block text-sm font-medium text-text-secondary mb-1">
          Nome do destinatario <span className="text-text-muted font-normal">(opcional)</span>
        </label>
        <input
          id="cl-recipient-name"
          className={inputClass}
          value={recipient.name}
          onChange={(e) => updateRecipient('name', e.target.value)}
          placeholder="John Smith"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="cl-recipient-company" className="block text-sm font-medium text-text-secondary mb-1">
          Empresa
        </label>
        <input
          id="cl-recipient-company"
          className={inputClass}
          value={recipient.company}
          onChange={(e) => updateRecipient('company', e.target.value)}
          placeholder="Acme Corp"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="cl-recipient-address" className="block text-sm font-medium text-text-secondary mb-1">
          Endereco <span className="text-text-muted font-normal">(opcional)</span>
        </label>
        <input
          id="cl-recipient-address"
          className={inputClass}
          value={recipient.address}
          onChange={(e) => updateRecipient('address', e.target.value)}
          placeholder="123 Main St, New York, NY 10001"
        />
      </div>
    </div>
  )
}
