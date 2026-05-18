import type { CoverLetterInput } from '@/lib/zod-schemas/cover-letter.js'

interface Props {
  data: CoverLetterInput
  onDataChange: (data: CoverLetterInput) => void
}

const inputClass =
  'w-full px-3 py-2.5 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none transition-all'

export default function CoverLetterHeaderForm({ data, onDataChange }: Props) {
  const sender = data.sender

  const update = (field: keyof typeof sender, value: string) => {
    onDataChange({
      ...data,
      sender: { ...sender, [field]: value },
    })
  }

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="cl-sender-name" className="block text-sm font-medium text-text-secondary mb-1">
          Nome completo
        </label>
        <input
          id="cl-sender-name"
          className={inputClass}
          value={sender.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Jane Doe"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="cl-sender-title" className="block text-sm font-medium text-text-secondary mb-1">
          Cargo / Titulo <span className="text-text-muted font-normal">(opcional)</span>
        </label>
        <input
          id="cl-sender-title"
          className={inputClass}
          value={sender.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Software Engineer"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="cl-sender-location" className="block text-sm font-medium text-text-secondary mb-1">
          Cidade / Estado
        </label>
        <input
          id="cl-sender-location"
          className={inputClass}
          value={sender.location}
          onChange={(e) => update('location', e.target.value)}
          placeholder="Sao Paulo, SP"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="cl-sender-email" className="block text-sm font-medium text-text-secondary mb-1">
          E-mail
        </label>
        <input
          id="cl-sender-email"
          className={inputClass}
          type="email"
          value={sender.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="jane@example.com"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="cl-sender-phone" className="block text-sm font-medium text-text-secondary mb-1">
          Telefone
        </label>
        <input
          id="cl-sender-phone"
          className={inputClass}
          value={sender.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="+55 11 99999-0000"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="cl-sender-linkedin" className="block text-sm font-medium text-text-secondary mb-1">
          LinkedIn
        </label>
        <input
          id="cl-sender-linkedin"
          className={inputClass}
          value={sender.linkedin}
          onChange={(e) => update('linkedin', e.target.value)}
          placeholder="linkedin.com/in/username"
        />
        <p className="text-xs text-text-muted mt-1">Ex: linkedin.com/in/seu-nome</p>
      </div>
    </div>
  )
}
