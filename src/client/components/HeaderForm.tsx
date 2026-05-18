import type { CvInput } from '@/lib/zod-schemas/cv.js'

interface Props {
  data: CvInput
  onDataChange: (data: CvInput) => void
  labels: Record<string, string>
}

export default function HeaderForm({ data, onDataChange, labels }: Props) {
  const header = data.header

  const update = (field: keyof CvInput['header'], value: string) => {
    onDataChange({
      ...data,
      header: { ...data.header, [field]: value },
    })
  }

  const inputClass = 'w-full px-3 py-2.5 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none transition-all'

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="header-name" className="block text-sm font-medium text-text-secondary mb-1">{labels.name ?? 'Nome completo'}</label>
        <input
          id="header-name"
          className={inputClass}
          value={header.name}
          onChange={(e) => update('name', e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label htmlFor="header-title" className="block text-sm font-medium text-text-secondary mb-1">{labels.title ?? 'Titulo (subtitulo)'}</label>
        <input
          id="header-title"
          className={inputClass}
          maxLength={200}
          value={header.title ?? ''}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Engenheiro de Software | Especialista Cloud"
        />
        <p className="text-xs text-text-muted mt-1">{labels.titleHint ?? 'Usado pelo modelo Modern'}</p>
      </div>
      <div className="mb-4">
        <label htmlFor="header-location" className="block text-sm font-medium text-text-secondary mb-1">{labels.location ?? 'Cidade / Estado'}</label>
        <input
          id="header-location"
          className={inputClass}
          value={header.location}
          onChange={(e) => update('location', e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label htmlFor="header-phone" className="block text-sm font-medium text-text-secondary mb-1">{labels.phone ?? 'Telefone'}</label>
        <input
          id="header-phone"
          className={inputClass}
          value={header.phone}
          onChange={(e) => update('phone', e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label htmlFor="header-email" className="block text-sm font-medium text-text-secondary mb-1">{labels.email ?? 'E-mail'}</label>
        <input
          id="header-email"
          className={inputClass}
          type="email"
          value={header.email}
          onChange={(e) => update('email', e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label htmlFor="header-linkedin" className="block text-sm font-medium text-text-secondary mb-1">{labels.linkedin ?? 'LinkedIn'}</label>
        <input
          id="header-linkedin"
          className={inputClass}
          value={header.linkedin}
          onChange={(e) => update('linkedin', e.target.value)}
          placeholder="linkedin.com/in/username"
        />
        <p className="text-xs text-text-muted mt-1">Ex: linkedin.com/in/seu-nome</p>
      </div>
      <div className="mb-4">
        <label htmlFor="header-github" className="block text-sm font-medium text-text-secondary mb-1">{labels.github ?? 'GitHub'}</label>
        <input
          id="header-github"
          className={inputClass}
          value={header.github}
          onChange={(e) => update('github', e.target.value)}
          placeholder="github.com/username"
        />
        <p className="text-xs text-text-muted mt-1">Ex: github.com/seu-usuario (opcional)</p>
      </div>
    </div>
  )
}
