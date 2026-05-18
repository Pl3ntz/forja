import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CvInput } from '@/lib/zod-schemas/cv.js'
import type { AtsScoreResponse } from '@/lib/zod-schemas/ats-score.js'
import { getTranslations } from '@/lib/i18n/index.js'
import { getFormDefaults } from '@/lib/form-defaults.js'
import type { Locale } from '@/lib/locales.js'
import { CV_TEMPLATE_IDS, CV_TEMPLATES } from '@/lib/templates.js'
import type { CvTemplateId } from '@/lib/templates.js'
import FeedbackModal from './FeedbackModal.js'
import HeaderForm from './HeaderForm.js'
import SummaryForm from './SummaryForm.js'
import EducationForm from './EducationForm.js'
import ExperienceForm from './ExperienceForm.js'
import ProjectsForm from './ProjectsForm.js'
import SkillsForm from './SkillsForm.js'
import LanguagesForm from './LanguagesForm.js'
import CertificationsForm from './CertificationsForm.js'
import CustomSectionForm from './CustomSectionForm.js'
import UserMenu from './UserMenu.js'
import { useModalA11y } from '../hooks/useModalA11y.js'

interface UserInfo {
  readonly name: string
  readonly email: string
  readonly isAdmin: boolean
}

interface LocaleOption { value: string; label: string }

interface Props {
  initialData: CvInput
  cvId: string
  locale: string
  labels: Record<string, Record<string, string>>
  localeOptions: LocaleOption[]
  user: UserInfo
}

type BuiltInSectionKey = 'summary' | 'education' | 'experience' | 'projects' | 'skills' | 'languages' | 'certifications'
type Tab = 'header' | string

const ALL_BUILTIN_SECTIONS: BuiltInSectionKey[] = ['summary', 'education', 'experience', 'projects', 'skills', 'languages', 'certifications']
const DEFAULT_SECTION_ORDER: string[] = ['summary', 'education', 'experience', 'projects', 'skills', 'languages', 'certifications']

const BUILTIN_TAB_LABELS: Record<string, string> = {
  header: 'Dados',
  summary: 'Resumo',
  education: 'Formação',
  experience: 'Experiência',
  projects: 'Projetos',
  skills: 'Habilidades',
  languages: 'Idiomas',
  certifications: 'Certificações',
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  return '#ef4444'
}

// SVG icon components for ATS suggestion priorities
function CriticalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
      <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.5" fill="#ef4444" fillOpacity="0.15" />
      <path d="M7 4v3.5M7 9.5v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function RecommendedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
      <circle cx="7" cy="7" r="6" stroke="#eab308" strokeWidth="1.5" fill="#eab308" fillOpacity="0.15" />
      <path d="M7 4v3.5M7 9.5v.5" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function OptionalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
      <circle cx="7" cy="7" r="6" stroke="#22c55e" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.15" />
      <path d="M4.5 7l1.5 1.5 3-3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const PRIORITY_ICON: Record<string, () => ReactNode> = {
  critical: CriticalIcon,
  recommended: RecommendedIcon,
  optional: OptionalIcon,
}

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-error/10 border-error/30',
  recommended: 'bg-warning/10 border-warning/30',
  optional: 'bg-success/10 border-success/30',
}

interface AtsSuggestion {
  text: string
  priority: string
  section?: string
}

function AtsSuggestions({ suggestions }: { suggestions: AtsSuggestion[] }) {
  if (suggestions.length === 0) return null

  const grouped: Record<string, AtsSuggestion[]> = { critical: [], recommended: [], optional: [] }
  for (const s of suggestions) {
    if (grouped[s.priority]) grouped[s.priority].push(s)
  }

  return (
    <div className="mb-4 space-y-2">
      {(['critical', 'recommended', 'optional'] as const).map(priority => {
        const items = grouped[priority]
        if (!items || items.length === 0) return null
        const Icon = PRIORITY_ICON[priority]
        return (
          <div key={priority} className={`rounded-lg p-2.5 border ${PRIORITY_STYLE[priority]}`}>
            {items.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary mb-1 last:mb-0">
                <Icon />
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function CvEditorForm({ initialData, cvId, locale, labels, localeOptions, user }: Props) {
  const importKey = `cv-import-${cvId}`
  const resolvedInitialData = (() => {
    if (typeof window === 'undefined') return initialData
    const importedRaw = sessionStorage.getItem(importKey)
    if (!importedRaw) return initialData
    try {
      return JSON.parse(importedRaw) as CvInput
    } catch {
      sessionStorage.removeItem(importKey)
      return initialData
    }
  })()

  const wasImported = useRef(resolvedInitialData !== initialData)
  const [data, setData] = useState<CvInput>(resolvedInitialData)
  const [currentLocale, setCurrentLocale] = useState(locale)
  const [currentLabels, setCurrentLabels] = useState(labels)
  const [activeTab, setActiveTab] = useState<Tab>('header')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [previewHtml, setPreviewHtml] = useState('')
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialRef = useRef(true)
  const lastSaveDataRef = useRef<CvInput | null>(null)

  const [atsScore, setAtsScore] = useState<AtsScoreResponse | null>(null)
  const [atsStatus, setAtsStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [atsErrorMsg, setAtsErrorMsg] = useState('')
  const atsElapsedRef = useRef(0)
  const atsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [atsElapsed, setAtsElapsed] = useState(0)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [previewRefreshing, setPreviewRefreshing] = useState(false)
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form')
  const [reorderOpen, setReorderOpen] = useState(false)
  const [latexModalOpen, setLatexModalOpen] = useState(false)
  const [latexSource, setLatexSource] = useState('')
  const [latexLoading, setLatexLoading] = useState(false)
  const [latexPdfLoading, setLatexPdfLoading] = useState(false)
  const [atsDropdownOpen, setAtsDropdownOpen] = useState(false)
  const [ghostVisible, setGhostVisible] = useState(true)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const closeLatexModal = useCallback(() => setLatexModalOpen(false), [])
  const latexModalRef = useModalA11y(latexModalOpen, closeLatexModal)

  // Derive section order from data (with runtime safety)
  const rawOrder = data.sectionOrder as string[] | undefined
  const sectionOrder: string[] = (rawOrder && rawOrder.length <= 16 && new Set(rawOrder).size === rawOrder.length)
    ? rawOrder
    : DEFAULT_SECTION_ORDER
  const tabs: Tab[] = ['header', ...sectionOrder]

  // Helper to get tab label (built-in or custom section title)
  const getTabLabel = (tab: Tab): string => {
    if (tab === 'certifications') return data.certifications?.title || BUILTIN_TAB_LABELS.certifications
    if (BUILTIN_TAB_LABELS[tab]) return BUILTIN_TAB_LABELS[tab]
    const cs = data.customSections?.find(s => s.id === tab)
    return cs?.title || 'Seção personalizada'
  }

  const clearAtsTimer = useCallback(() => {
    if (atsTimerRef.current) {
      clearInterval(atsTimerRef.current)
      atsTimerRef.current = null
    }
  }, [])

  useEffect(() => clearAtsTimer, [clearAtsTimer])

  const analyzeAts = useCallback(async () => {
    setAtsStatus('loading')
    setAtsScore(null)
    setAtsErrorMsg('')
    setAtsElapsed(0)
    atsElapsedRef.current = 0

    clearAtsTimer()
    atsTimerRef.current = setInterval(() => {
      atsElapsedRef.current += 1
      setAtsElapsed(atsElapsedRef.current)
    }, 1000)

    try {
      const response = await fetch(`/api/cv/${cvId}/ats-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, locale: currentLocale }),
      })

      clearAtsTimer()

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: '' }))
        setAtsErrorMsg((errorBody as { error?: string }).error ?? '')
        setAtsStatus('error')
        return
      }

      const result = await response.json() as AtsScoreResponse
      setAtsScore(result)
      setAtsStatus('done')
    } catch {
      clearAtsTimer()
      setAtsStatus('error')
    }
  }, [cvId, data, currentLocale, clearAtsTimer])

  const fetchPreview = useCallback(async (cvData: CvInput) => {
    setPreviewError(false)
    setPreviewRefreshing(true)
    try {
      const ghostParam = ghostVisible ? '?ghost=1' : ''
      const response = await fetch(`/api/cv/${cvId}/preview${ghostParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cvData, locale: currentLocale }),
      })
      if (response.ok) {
        setPreviewHtml(await response.text())
      } else {
        setPreviewError(true)
      }
    } catch {
      setPreviewError(true)
    } finally {
      setPreviewRefreshing(false)
    }
  }, [cvId, currentLocale, ghostVisible])

  const saveCv = useCallback(async (cvData: CvInput) => {
    lastSaveDataRef.current = cvData
    setSaveStatus('saving')
    try {
      const response = await fetch(`/api/cv/${cvId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cvData, locale: currentLocale }),
      })
      setSaveStatus(response.ok ? 'saved' : 'error')
    } catch {
      setSaveStatus('error')
    }
  }, [cvId, currentLocale])

  const retrySave = useCallback(() => {
    if (lastSaveDataRef.current) {
      saveCv(lastSaveDataRef.current)
    }
  }, [saveCv])

  const downloadPdf = useCallback(async () => {
    setPdfLoading(true)
    try {
      const response = await fetch(`/api/cv/${cvId}/pdf`, {
        method: 'POST',
      })
      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
          const body = await response.json()
          alert(body.error ?? 'Falha ao gerar PDF')
        } else {
          alert('Falha ao gerar PDF')
        }
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `curriculo-${currentLocale}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      // Show feedback modal once after first successful download
      if (!localStorage.getItem('cv_feedback_done')) {
        setShowFeedbackModal(true)
      }
    } catch {
      alert('Falha ao gerar PDF')
    } finally {
      setPdfLoading(false)
    }
  }, [cvId, currentLocale])

  // Open LaTeX editor modal
  const openLatexEditor = useCallback(async () => {
    setLatexModalOpen(true)

    // If we have a customLatex already, use it
    if (data.customLatex) {
      setLatexSource(data.customLatex)
      return
    }

    // Otherwise generate from current data
    setLatexLoading(true)
    try {
      const response = await fetch(`/api/cv/${cvId}/latex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, locale: currentLocale }),
      })
      if (response.ok) {
        setLatexSource(await response.text())
      }
    } catch {
      // keep empty
    } finally {
      setLatexLoading(false)
    }
  }, [cvId, data, currentLocale])

  // Generate PDF from custom LaTeX
  const downloadLatexPdf = useCallback(async () => {
    setLatexPdfLoading(true)
    try {
      const response = await fetch(`/api/cv/${cvId}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customLatex: latexSource }),
      })
      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
          const body = await response.json()
          alert(body.error ?? 'Falha ao gerar PDF a partir do código fonte')
        } else {
          alert('Falha ao gerar PDF a partir do código fonte')
        }
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `curriculo-${currentLocale}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Falha ao gerar PDF a partir do código fonte')
    } finally {
      setLatexPdfLoading(false)
    }
  }, [cvId, latexSource, currentLocale])

  // Restore original LaTeX
  const restoreOriginalLatex = useCallback(async () => {
    setLatexLoading(true)
    try {
      const response = await fetch(`/api/cv/${cvId}/latex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, locale: currentLocale }),
      })
      if (response.ok) {
        const tex = await response.text()
        setLatexSource(tex)
        setData({ ...data, customLatex: undefined })
      }
    } catch {
      // keep current
    } finally {
      setLatexLoading(false)
    }
  }, [cvId, data, currentLocale])

  // Save custom LaTeX to data
  const saveCustomLatex = useCallback(() => {
    setData({ ...data, customLatex: latexSource })
    setLatexModalOpen(false)
  }, [data, latexSource])


  useEffect(() => {
    if (isInitialRef.current) {
      isInitialRef.current = false
      fetchPreview(resolvedInitialData)
      if (wasImported.current) {
        wasImported.current = false
        saveTimerRef.current = setTimeout(async () => {
          await saveCv(resolvedInitialData)
          sessionStorage.removeItem(importKey)
        }, 3000)
      }
      return
    }

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => fetchPreview(data), 300)

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveCv(data), 1500)

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [data, currentLocale])

  // Re-fetch preview when ghost visibility changes
  useEffect(() => {
    if (!isInitialRef.current) {
      fetchPreview(data)
    }
  }, [ghostVisible])

  // Post highlight message to iframe when active tab changes
  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: 'highlight-section', section: activeTab },
        '*',
      )
    }
  }, [activeTab, previewHtml])

  const statusText = (): string => {
    switch (saveStatus) {
      case 'saving': return 'Salvando...'
      case 'saved': return 'Salvo'
      case 'error': return 'Erro ao salvar — clique para tentar'
      default: return 'Tudo salvo'
    }
  }

  const statusColorClass = saveStatus === 'saving' ? 'text-warning'
    : saveStatus === 'saved' ? 'text-success'
    : saveStatus === 'error' ? 'text-error underline cursor-pointer'
    : 'text-text-muted'

  // Section reorder helpers
  const moveSectionUp = (index: number) => {
    if (index <= 0) return
    const newOrder = [...sectionOrder]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setData({ ...data, sectionOrder: newOrder })
  }

  const moveSectionDown = (index: number) => {
    if (index >= sectionOrder.length - 1) return
    const newOrder = [...sectionOrder]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setData({ ...data, sectionOrder: newOrder })
  }

  // Toggle section visibility (add/remove from sectionOrder)
  const toggleSection = (key: string) => {
    if (sectionOrder.includes(key)) {
      // Remove from order (disable)
      const newOrder = sectionOrder.filter(k => k !== key)
      setData({ ...data, sectionOrder: newOrder })
      // If active tab was this section, go to header
      if (activeTab === key) setActiveTab('header')
    } else {
      // Add back to order (enable) at end
      setData({ ...data, sectionOrder: [...sectionOrder, key] })
    }
  }

  // Add custom section
  const addCustomSection = () => {
    const id = `custom-${Date.now()}`
    const customSections = [...(data.customSections ?? []), { id, title: '', items: [] }]
    const newOrder = [...sectionOrder, id]
    setData({ ...data, customSections, sectionOrder: newOrder })
    setActiveTab(id)
    setReorderOpen(false)
  }

  // Remove custom section
  const removeCustomSection = (id: string) => {
    const customSections = (data.customSections ?? []).filter(s => s.id !== id)
    const newOrder = sectionOrder.filter(k => k !== id)
    setData({ ...data, customSections, sectionOrder: newOrder })
    if (activeTab === id) setActiveTab('header')
  }

  // ATS helpers
  const getCategoryScore = (tab: Tab): number | undefined => {
    if (!atsScore) return undefined
    const sectionMap: Record<string, string[]> = {
      header: ['Contact Info', 'Informações de Contato', 'Contato'],
      summary: ['Professional Summary', 'Resumo Profissional', 'Summary', 'Resumo'],
      education: ['Education', 'Educação', 'Formação'],
      experience: ['Experience', 'Experiência', 'Work Experience'],
      projects: ['Projects', 'Projetos'],
      skills: ['Skills', 'Habilidades', 'Technical Skills'],
      languages: ['Languages', 'Idiomas'],
    }
    const aliases = sectionMap[tab] ?? []
    // First try by section field
    const bySection = atsScore.categories.find((c: Record<string, unknown>) => (c as { section?: string }).section === tab)
    if (bySection) return bySection.score
    // Fallback: match by name
    const byName = atsScore.categories.find(c => aliases.some(a => c.name.toLowerCase().includes(a.toLowerCase())))
    return byName?.score
  }

  const getSuggestionsForTab = (tab: Tab): AtsSuggestion[] => {
    if (!atsScore) return []
    return (atsScore.suggestions as AtsSuggestion[]).filter(s => s.section === tab)
  }

  // Render form for a given tab
  const renderForm = (tab: Tab) => {
    if (tab.startsWith('custom-')) {
      return <CustomSectionForm sectionId={tab} data={data} onDataChange={setData} />
    }
    switch (tab) {
      case 'header': return <HeaderForm data={data} onDataChange={setData} labels={currentLabels.header ?? {}} />
      case 'summary': return <SummaryForm data={data} onDataChange={setData} labels={currentLabels.summary ?? {}} />
      case 'education': return <EducationForm data={data} onDataChange={setData} labels={currentLabels.education ?? {}} />
      case 'experience': return <ExperienceForm data={data} onDataChange={setData} labels={currentLabels.experience ?? {}} />
      case 'projects': return <ProjectsForm data={data} onDataChange={setData} labels={currentLabels.projects ?? {}} />
      case 'skills': return <SkillsForm data={data} onDataChange={setData} labels={currentLabels.skills ?? {}} />
      case 'languages': return <LanguagesForm data={data} onDataChange={setData} labels={currentLabels.languages ?? {}} />
      case 'certifications': {
        const certData = data.certifications ?? { title: 'Certificações', items: [] }
        return (
          <CertificationsForm
            data={certData}
            onChange={(updated) => setData({ ...data, certifications: updated })}
            labels={currentLabels.certifications ?? {}}
          />
        )
      }
    }
  }

  return (
    <>
      <header className="flex items-center h-12 px-2 bg-forge-850 border-b border-forge-600 gap-0 flex-shrink-0">
        <a href="/dashboard" className="flex items-center justify-center w-10 h-10 border border-forge-500 rounded-lg bg-forge-850 text-text-secondary no-underline text-base flex-shrink-0 hover:bg-forge-700 transition-colors" title="Painel" aria-label="Voltar ao Painel">
          &larr;
        </a>

        {/* Reorder button */}
        <div className="relative ml-1 flex-shrink-0">
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 border border-forge-500 rounded-lg bg-forge-850 text-text-secondary hover:bg-forge-700 transition-colors cursor-pointer"
            onClick={() => setReorderOpen(!reorderOpen)}
            aria-label="Reordenar seções"
            title="Reordenar seções"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="2" y1="8" x2="14" y2="8" />
              <line x1="2" y1="12" x2="14" y2="12" />
            </svg>
          </button>
          {reorderOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setReorderOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-64 bg-forge-800 border border-forge-600 rounded-xl shadow-xl shadow-black/30 z-30 p-2">
                <div className="text-xs font-semibold text-text-muted mb-2 px-2">Ordem das seções</div>
                {/* Active sections with reorder controls */}
                {sectionOrder.map((key, i) => (
                  <div key={key} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-forge-700 text-sm text-text-primary">
                    <button
                      type="button"
                      className="w-5 h-5 flex items-center justify-center rounded border border-forge-500 bg-ember-500/20 text-ember-400 cursor-pointer flex-shrink-0"
                      onClick={() => toggleSection(key)}
                      title="Ocultar seção"
                      aria-label={`Ocultar ${getTabLabel(key)}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 5h6" /><path d="M5 2v6" /></svg>
                    </button>
                    <span className="flex-1 truncate">{getTabLabel(key)}</span>
                    {key.startsWith('custom-') && (
                      <button
                        type="button"
                        className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer border-none bg-transparent flex-shrink-0"
                        onClick={() => removeCustomSection(key)}
                        title="Excluir seção"
                        aria-label={`Excluir ${getTabLabel(key)}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l6 6M8 2l-6 6" /></svg>
                      </button>
                    )}
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-forge-600 transition-colors disabled:opacity-30 cursor-pointer border-none bg-transparent"
                      onClick={() => moveSectionUp(i)}
                      disabled={i === 0}
                      aria-label={`Mover ${getTabLabel(key)} para cima`}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2v8M3 5l3-3 3 3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-forge-600 transition-colors disabled:opacity-30 cursor-pointer border-none bg-transparent"
                      onClick={() => moveSectionDown(i)}
                      disabled={i === sectionOrder.length - 1}
                      aria-label={`Mover ${getTabLabel(key)} para baixo`}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 10V2M3 7l3 3 3-3" />
                      </svg>
                    </button>
                  </div>
                ))}
                {/* Disabled built-in sections */}
                {ALL_BUILTIN_SECTIONS.filter(k => !sectionOrder.includes(k)).map(key => (
                  <div key={key} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-forge-700 text-sm text-text-muted opacity-50">
                    <button
                      type="button"
                      className="w-5 h-5 flex items-center justify-center rounded border border-forge-500 bg-transparent text-text-muted cursor-pointer flex-shrink-0"
                      onClick={() => toggleSection(key)}
                      title="Mostrar seção"
                      aria-label={`Mostrar ${BUILTIN_TAB_LABELS[key]}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 5h6" /></svg>
                    </button>
                    <span className="flex-1">{BUILTIN_TAB_LABELS[key]}</span>
                  </div>
                ))}
                {/* Add custom section */}
                <div className="border-t border-forge-600 mt-2 pt-2">
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-forge-700 text-sm text-ember-400 cursor-pointer border-none bg-transparent"
                    onClick={addCustomSection}
                  >
                    + Seção personalizada
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-0 ml-1 flex-1 min-w-0 overflow-x-auto scrollbar-none" role="tablist" aria-label="Seções do currículo">
          {tabs.map((tab, i) => {
            const catScore = getCategoryScore(tab)
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`tab-${tab}`}
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                className={`relative px-3 h-12 border-none bg-transparent text-sm cursor-pointer whitespace-nowrap flex items-center transition-colors ${
                  activeTab === tab
                    ? 'text-ember-400 font-medium'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(e) => {
                  let next = i
                  if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
                  else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
                  else if (e.key === 'Home') next = 0
                  else if (e.key === 'End') next = tabs.length - 1
                  else return
                  e.preventDefault()
                  setActiveTab(tabs[next])
                  document.getElementById(`tab-${tabs[next]}`)?.focus()
                }}
              >
                {getTabLabel(tab)}
                {atsScore && catScore !== undefined && (
                  <span
                    className="ml-1.5 text-[10px] font-bold rounded-full px-1.5"
                    style={{ color: getScoreColor(catScore) }}
                    title="Nota da avaliação automática para esta seção"
                  >
                    {catScore}/100
                  </span>
                )}
                {activeTab === tab && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-ember-500"
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <select
            className="bg-forge-800 border border-forge-500 rounded-lg text-xs text-text-primary px-2 py-1 cursor-pointer"
            value={data.templateId ?? 'jake'}
            aria-label={currentLabels.editor?.template ?? 'Modelo'}
            title={currentLabels.editor?.template ?? 'Modelo'}
            onChange={(e) => {
              setData({ ...data, templateId: e.target.value as CvTemplateId })
            }}
          >
            {CV_TEMPLATE_IDS.map(id => (
              <option key={id} value={id}>{CV_TEMPLATES[id].name}</option>
            ))}
          </select>
          <select
            className="bg-forge-800 border border-forge-500 rounded-lg text-xs text-text-primary px-2 py-1 cursor-pointer"
            value={currentLocale}
            onChange={(e) => {
              const newLocale = e.target.value as Locale
              setCurrentLocale(newLocale)
              setCurrentLabels(getTranslations(newLocale))
              const defaults = getFormDefaults(newLocale)
              setData(prev => ({
                ...prev,
                summary: { ...prev.summary, title: defaults.summary.title },
                education: { ...prev.education, title: defaults.education.title },
                experience: { ...prev.experience, title: defaults.experience.title },
                projects: { ...prev.projects, title: defaults.projects.title },
                skills: { ...prev.skills, title: defaults.skills.title },
                languages: { ...prev.languages, title: defaults.languages.title },
                certifications: prev.certifications
                  ? { ...prev.certifications, title: defaults.certifications?.title ?? prev.certifications.title }
                  : prev.certifications,
              }))
            }}
          >
            {localeOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {saveStatus === 'error' ? (
            <button
              type="button"
              className={`text-xs border-none bg-transparent px-2 py-1 rounded ${statusColorClass}`}
              onClick={retrySave}
              aria-label="Erro ao salvar. Clique para tentar de novo"
            >
              {statusText()}
            </button>
          ) : (
            <span
              className={`text-xs ${statusColorClass}`}
              role="status"
              aria-live="polite"
            >
              {statusText()}
            </span>
          )}
          <div className="relative">
            <button
              type="button"
              className={`flex items-center justify-center px-3 py-1 border rounded-lg text-xs font-semibold min-h-[36px] transition-all cursor-pointer whitespace-nowrap ${
                atsStatus === 'loading'
                  ? 'bg-ember-500/10 text-ember-400 border-ember-500/30 animate-pulse'
                  : atsStatus === 'done' && atsScore
                    ? 'border-forge-500 text-text-secondary hover:bg-forge-700'
                    : 'border-forge-500 text-text-secondary hover:bg-forge-700'
              }`}
              onClick={atsStatus === 'done' && atsScore ? () => setAtsDropdownOpen(!atsDropdownOpen) : analyzeAts}
              disabled={atsStatus === 'loading'}
              title="Avalia seu currículo com base em critérios usados por sistemas automáticos de recrutamento (ATS)"
              aria-label={atsStatus === 'loading'
                ? `Avaliando currículo... ${atsElapsed}s`
                : atsStatus === 'done' && atsScore
                  ? `Avaliação ${atsScore.overallScore}/100 — clique para ver detalhes`
                  : 'Avaliar currículo'}
              aria-busy={atsStatus === 'loading'}
            >
              {atsStatus === 'loading'
                ? <><span className="w-3 h-3 border-2 border-forge-600 border-t-ember-500 rounded-full animate-spin mr-1" />{atsElapsed}s</>
                : atsStatus === 'done' && atsScore
                  ? <span style={{ color: getScoreColor(atsScore.overallScore) }}>Avaliação {atsScore.overallScore}/100</span>
                  : <><span>Avaliar</span><span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-forge-600 text-[9px] text-text-muted leading-none pointer-events-none">?</span></>}
            </button>
            {atsDropdownOpen && atsScore && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setAtsDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-64 bg-forge-800 border border-forge-600 rounded-xl shadow-xl shadow-black/30 z-30 p-3">
                  <div className="text-xs font-semibold text-text-muted mb-2">Pontuação por seção</div>
                  {atsScore.categories.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="text-text-secondary">{cat.name}</span>
                      <span className="font-semibold" style={{ color: getScoreColor(cat.score) }}>{cat.score}/100</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-1.5 mt-1 border-t border-forge-600 text-xs">
                    <span className="text-text-primary font-semibold">Total</span>
                    <span className="font-bold" style={{ color: getScoreColor(atsScore.overallScore) }}>{atsScore.overallScore}/100</span>
                  </div>
                  <button
                    type="button"
                    className="w-full mt-2 px-3 py-2 text-xs font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 transition-all cursor-pointer"
                    onClick={() => { setAtsDropdownOpen(false); analyzeAts() }}
                  >
                    Reavaliar
                  </button>
                  <button
                    type="button"
                    className="w-full mt-1 px-3 py-2 text-xs font-medium text-ember-400 border border-ember-500/30 rounded-lg hover:bg-ember-500/10 transition-all cursor-pointer"
                    onClick={() => { setAtsDropdownOpen(false); setGhostVisible(!ghostVisible) }}
                  >
                    {ghostVisible ? 'Ocultar exemplo' : 'Ver exemplo ideal'}
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className="flex items-center justify-center px-3 py-1 border border-forge-500 rounded-lg text-xs font-semibold min-h-[36px] transition-all cursor-pointer whitespace-nowrap text-text-secondary hover:bg-forge-700"
            onClick={openLatexEditor}
            title="Editar o código fonte do currículo (recurso avançado)"
            aria-label="Código fonte"
          >
            Código fonte
            <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-forge-600 text-[9px] text-text-muted leading-none pointer-events-none">?</span>
          </button>
          <button
            type="button"
            className={`flex items-center justify-center px-3 py-1 border border-forge-500 rounded-lg text-xs font-semibold min-h-[36px] transition-all cursor-pointer whitespace-nowrap ${
              pdfLoading
                ? 'bg-ember-500/10 text-ember-400 border-ember-500/30 animate-pulse'
                : 'text-text-secondary hover:bg-forge-700'
            }`}
            onClick={downloadPdf}
            disabled={pdfLoading}
            title="Gerar e baixar seu currículo em formato PDF"
            aria-label={pdfLoading ? 'Gerando PDF...' : 'Baixar PDF'}
            aria-busy={pdfLoading}
          >
            {pdfLoading ? 'Gerando...' : 'Baixar PDF'}
          </button>
          <UserMenu
            userName={user.name}
            userEmail={user.email}
            isAdmin={user.isAdmin}
          />
        </div>
      </header>

      <div className="md:hidden flex bg-forge-850 border-b border-forge-600 p-1 gap-1">
        <button
          type="button"
          className={`flex-1 py-2 rounded-lg text-sm font-medium min-h-[44px] border-none cursor-pointer transition-colors ${
            mobileView === 'form'
              ? 'bg-ember-500/10 text-ember-400 font-semibold'
              : 'bg-transparent text-text-muted'
          }`}
          onClick={() => setMobileView('form')}
        >
          Editar
        </button>
        <button
          type="button"
          className={`flex-1 py-2 rounded-lg text-sm font-medium min-h-[44px] border-none cursor-pointer transition-colors ${
            mobileView === 'preview'
              ? 'bg-ember-500/10 text-ember-400 font-semibold'
              : 'bg-transparent text-text-muted'
          }`}
          onClick={() => setMobileView('preview')}
        >
          Visualizar
        </button>
      </div>

      <div className="flex flex-col md:flex-row h-[calc(100vh-48px)] md:h-[calc(100vh-48px)]">
        <div className={`flex-[4] overflow-y-auto p-4 border-r border-forge-600 bg-forge-900 ${mobileView === 'preview' ? 'hidden md:block' : ''}`}>
          <AnimatePresence mode="wait">
            {tabs.map((tab) => (
              activeTab === tab && (
                <motion.div
                  key={tab}
                  id={`tabpanel-${tab}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${tab}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <AtsSuggestions suggestions={getSuggestionsForTab(tab)} />
                  {renderForm(tab)}
                </motion.div>
              )
            ))}
          </AnimatePresence>
        </div>

        <div className={`relative flex-[5] overflow-hidden bg-forge-800 flex flex-col items-center p-3 ${mobileView === 'form' ? 'hidden md:flex' : 'flex'}`}>
          {previewError ? (
            <div className="flex flex-col items-center justify-center gap-3 h-full text-text-muted">
              <p>Erro ao carregar a visualização</p>
              <button type="button" className="px-3 py-2 text-sm font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 transition-all" onClick={() => fetchPreview(data)}>
                Tentar novamente
              </button>
            </div>
          ) : previewHtml ? (
            <iframe
              ref={iframeRef}
              className={`w-full max-w-[8in] h-full border border-forge-600 bg-white rounded ${previewRefreshing ? 'opacity-50 transition-opacity' : ''}`}
              srcDoc={previewHtml}
              title="Visualização do currículo"
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <div className="flex items-center justify-center text-text-muted h-full">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-forge-600 border-t-ember-500 rounded-full animate-spin" />
                Carregando visualização...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LaTeX Editor Modal */}
      <AnimatePresence>
        {latexModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              ref={latexModalRef}
              className="bg-forge-850 border border-forge-600 rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label="Editor de código fonte"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-forge-600">
                <div>
                  <span className="text-sm font-semibold text-text-primary">Editor de código fonte</span>
                  <p className="text-xs text-text-muted mt-0.5">Este é o código fonte do seu currículo. Edite somente se tiver conhecimento técnico.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 transition-all cursor-pointer"
                    onClick={restoreOriginalLatex}
                    disabled={latexLoading}
                  >
                    Restaurar original
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      latexPdfLoading
                        ? 'bg-ember-500/10 text-ember-400 border border-ember-500/30 animate-pulse'
                        : 'bg-ember-500 text-white hover:bg-ember-400'
                    }`}
                    onClick={downloadLatexPdf}
                    disabled={latexPdfLoading || !latexSource}
                  >
                    {latexPdfLoading ? 'Gerando...' : 'Gerar PDF'}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 transition-all cursor-pointer"
                    onClick={saveCustomLatex}
                  >
                    Salvar e fechar
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center border border-forge-500 rounded-lg text-text-muted hover:bg-forge-700 hover:text-text-primary transition-colors text-sm cursor-pointer"
                    onClick={closeLatexModal}
                    aria-label="Fechar"
                  >
                    X
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-0">
                {latexLoading ? (
                  <div className="flex items-center justify-center h-full text-text-muted">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-forge-600 border-t-ember-500 rounded-full animate-spin" />
                      Carregando código fonte...
                    </div>
                  </div>
                ) : (
                  <textarea
                    className="w-full h-full bg-forge-900 text-text-primary font-mono text-xs leading-relaxed p-4 border-none outline-none resize-none"
                    value={latexSource}
                    onChange={(e) => setLatexSource(e.target.value)}
                    spellCheck={false}
                    aria-label="Código LaTeX do currículo"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback modal (shown once after PDF download) */}
      <AnimatePresence>
        {showFeedbackModal && (
          <FeedbackModal onClose={() => setShowFeedbackModal(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
