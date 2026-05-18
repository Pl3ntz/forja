import type { CvInput } from '@/lib/zod-schemas/cv.js'

interface Props {
  data: CvInput
  onDataChange: (data: CvInput) => void
  labels: Record<string, string>
}

export default function ExperienceForm({ data, onDataChange, labels }: Props) {
  const experience = data.experience

  const updateTitle = (value: string) => {
    onDataChange({
      ...data,
      experience: { ...data.experience, title: value },
    })
  }

  const updateItem = (index: number, field: string, value: string) => {
    const items = experience.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    )
    onDataChange({
      ...data,
      experience: { ...data.experience, items },
    })
  }

  const addItem = () => {
    onDataChange({
      ...data,
      experience: {
        ...data.experience,
        items: [
          ...experience.items,
          { company: '', role: '', date: '', location: '', highlights: [], intro: '', skills: '' },
        ],
      },
    })
  }

  const removeItem = (index: number) => {
    onDataChange({
      ...data,
      experience: {
        ...data.experience,
        items: experience.items.filter((_, i) => i !== index),
      },
    })
  }

  const updateHighlight = (itemIndex: number, hlIndex: number, value: string) => {
    const items = experience.items.map((item, i) => {
      if (i !== itemIndex) return item
      const highlights = item.highlights.map((h, j) => (j === hlIndex ? value : h))
      return { ...item, highlights }
    })
    onDataChange({
      ...data,
      experience: { ...data.experience, items },
    })
  }

  const addHighlight = (itemIndex: number) => {
    const items = experience.items.map((item, i) =>
      i === itemIndex ? { ...item, highlights: [...item.highlights, ''] } : item,
    )
    onDataChange({
      ...data,
      experience: { ...data.experience, items },
    })
  }

  const removeHighlight = (itemIndex: number, hlIndex: number) => {
    const items = experience.items.map((item, i) =>
      i === itemIndex
        ? { ...item, highlights: item.highlights.filter((_, j) => j !== hlIndex) }
        : item,
    )
    onDataChange({
      ...data,
      experience: { ...data.experience, items },
    })
  }

  const inputClass = 'w-full px-3 py-2.5 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none transition-all'

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="exp-title" className="block text-sm font-medium text-text-secondary mb-1">{labels.sectionTitle ?? 'Título da seção'}</label>
        <input id="exp-title" className={inputClass} value={experience.title} onChange={(e) => updateTitle(e.target.value)} />
      </div>

      {experience.items.map((item, index) => (
        <div className="border border-forge-600 rounded-lg p-4 mb-3 bg-forge-800/50" key={index}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm text-text-primary">{item.company || `#${index + 1}`}</span>
            <button type="button" className="w-10 h-10 flex items-center justify-center border border-forge-500 rounded-lg text-text-muted hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors text-xs cursor-pointer" onClick={() => removeItem(index)} aria-label={`Remover ${item.company || `item ${index + 1}`}`}>x</button>
          </div>
          <div className="mb-4">
            <label htmlFor={`exp-${index}-company`} className="block text-sm font-medium text-text-secondary mb-1">{labels.company ?? 'Empresa'}</label>
            <input id={`exp-${index}-company`} className={inputClass} value={item.company} onChange={(e) => updateItem(index, 'company', e.target.value)} />
          </div>
          <div className="mb-4">
            <label htmlFor={`exp-${index}-role`} className="block text-sm font-medium text-text-secondary mb-1">{labels.role ?? 'Cargo'}</label>
            <input id={`exp-${index}-role`} className={inputClass} value={item.role} onChange={(e) => updateItem(index, 'role', e.target.value)} />
          </div>
          <div className="mb-4">
            <label htmlFor={`exp-${index}-date`} className="block text-sm font-medium text-text-secondary mb-1">{labels.date ?? 'Período'}</label>
            <input id={`exp-${index}-date`} className={inputClass} value={item.date} onChange={(e) => updateItem(index, 'date', e.target.value)} />
            <p className="text-xs text-text-muted mt-1">Ex: Jan 2022 - Presente</p>
          </div>
          <div className="mb-4">
            <label htmlFor={`exp-${index}-location`} className="block text-sm font-medium text-text-secondary mb-1">{labels.location ?? 'Local'}</label>
            <input id={`exp-${index}-location`} className={inputClass} value={item.location} onChange={(e) => updateItem(index, 'location', e.target.value)} />
          </div>
          <div className="mb-4">
            <label htmlFor={`exp-${index}-intro`} className="block text-sm font-medium text-text-secondary mb-1">{labels.intro ?? 'Paragrafo introdutorio'}</label>
            <textarea
              id={`exp-${index}-intro`}
              className={`${inputClass} resize-none`}
              rows={2}
              maxLength={2000}
              value={item.intro ?? ''}
              placeholder="I led a cross-functional team in the Logistics Tribe..."
              onChange={(e) => updateItem(index, 'intro', e.target.value)}
            />
            <p className="text-xs text-text-muted mt-1">{labels.introHint ?? 'Usado pelo modelo Modern'}</p>
          </div>
          <div className="mb-4">
            <label htmlFor={`exp-${index}-skills`} className="block text-sm font-medium text-text-secondary mb-1">{labels.skills ?? 'Linha de habilidades'}</label>
            <input
              id={`exp-${index}-skills`}
              className={inputClass}
              maxLength={500}
              value={item.skills ?? ''}
              placeholder="Python, Scala, Spark, AWS"
              onChange={(e) => updateItem(index, 'skills', e.target.value)}
            />
            <p className="text-xs text-text-muted mt-1">{labels.skillsHint ?? 'Usado pelo modelo Modern'}</p>
          </div>
          <div className="mb-4">
            <label id={`exp-${index}-highlights-label`} className="block text-sm font-medium text-text-secondary mb-1">{labels.highlights ?? 'Principais realizações'}</label>
            <p className="text-xs text-text-muted mb-1">Liste conquistas, resultados ou responsabilidades. Uma por linha.</p>
            <div className="flex flex-col gap-2" role="group" aria-labelledby={`exp-${index}-highlights-label`}>
              {item.highlights.map((h, hlIndex) => (
                <div className="flex gap-2" key={hlIndex}>
                  <input className={`${inputClass} flex-1`} value={h} aria-label={`${labels.highlights ?? 'Realização'} ${hlIndex + 1}`} onChange={(e) => updateHighlight(index, hlIndex, e.target.value)} />
                  <button type="button" className="w-10 h-10 flex items-center justify-center border border-forge-500 rounded-lg text-text-muted hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors text-xs cursor-pointer flex-shrink-0" onClick={() => removeHighlight(index, hlIndex)} aria-label={`Remover realização ${hlIndex + 1}`}>x</button>
                </div>
              ))}
              <button type="button" className="px-3 py-2 text-sm font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 transition-all self-start" onClick={() => addHighlight(index)}>
                + {labels.addHighlight ?? 'Adicionar realização'}
              </button>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="px-4 py-2.5 text-sm font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 transition-all" onClick={addItem}>
        + {labels.addItem ?? 'Adicionar Experiência'}
      </button>
    </div>
  )
}
