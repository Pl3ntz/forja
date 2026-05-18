import type { CvInput } from '@/lib/zod-schemas/cv.js'

type CertificationsData = NonNullable<CvInput['certifications']>

interface Props {
  data: CertificationsData
  onChange: (updated: CertificationsData) => void
  labels: Record<string, string>
}

export default function CertificationsForm({ data, onChange, labels }: Props) {
  const inputClass = 'w-full px-3 py-2.5 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none transition-all'

  const updateTitle = (value: string) => {
    onChange({ ...data, title: value })
  }

  const updateItem = (index: number, field: string, value: string) => {
    const items = data.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    )
    onChange({ ...data, items })
  }

  const addItem = () => {
    onChange({ ...data, items: [...data.items, { name: '', issuer: '', year: '' }] })
  }

  const removeItem = (index: number) => {
    onChange({ ...data, items: data.items.filter((_, i) => i !== index) })
  }

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="cert-title" className="block text-sm font-medium text-text-secondary mb-1">{labels.sectionTitle ?? 'Titulo da Secao'}</label>
        <input
          id="cert-title"
          className={inputClass}
          value={data.title}
          onChange={(e) => updateTitle(e.target.value)}
        />
      </div>

      {data.items.length === 0 && (
        <p className="text-sm text-text-muted mb-4">{labels.empty ?? 'Nenhuma certificacao ainda — adicione uma para comecar.'}</p>
      )}

      {data.items.map((item, index) => (
        <div className="border border-forge-600 rounded-lg p-4 mb-3 bg-forge-800/50" key={index}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm text-text-primary">{item.name || `#${index + 1}`}</span>
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center border border-forge-500 rounded-lg text-text-muted hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors text-xs cursor-pointer"
              onClick={() => removeItem(index)}
              aria-label={`Remover ${item.name || `item ${index + 1}`}`}
            >
              x
            </button>
          </div>
          <div className="mb-4">
            <label htmlFor={`cert-${index}-name`} className="block text-sm font-medium text-text-secondary mb-1">{labels.name ?? 'Nome da Certificacao'}</label>
            <input
              id={`cert-${index}-name`}
              className={inputClass}
              value={item.name}
              onChange={(e) => updateItem(index, 'name', e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label htmlFor={`cert-${index}-issuer`} className="block text-sm font-medium text-text-secondary mb-1">{labels.issuer ?? 'Emissor (opcional)'}</label>
            <input
              id={`cert-${index}-issuer`}
              className={inputClass}
              value={item.issuer ?? ''}
              onChange={(e) => updateItem(index, 'issuer', e.target.value)}
            />
          </div>
          <div className="mb-2">
            <label htmlFor={`cert-${index}-year`} className="block text-sm font-medium text-text-secondary mb-1">{labels.year ?? 'Ano (opcional)'}</label>
            <input
              id={`cert-${index}-year`}
              className={inputClass}
              value={item.year ?? ''}
              onChange={(e) => updateItem(index, 'year', e.target.value)}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        className="px-4 py-2.5 text-sm font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 transition-all"
        onClick={addItem}
      >
        + {labels.addItem ?? 'Adicionar Certificacao'}
      </button>
    </div>
  )
}
