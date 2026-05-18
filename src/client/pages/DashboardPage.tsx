import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { LOCALE_LABELS, type Locale } from '@/lib/locales.js'
import { TEMPLATES, isValidTemplateId, DEFAULT_CV_TEMPLATE_ID } from '@/lib/templates.js'
import FeedbackCard from '../components/FeedbackCard.js'
import { useCoverLetters } from '../hooks/useCoverLetters.js'

interface CvListItem {
  id: string
  title: string
  locale: string
  name: string
  updatedAt: string
  templateId: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cvList, setCvList] = useState<CvListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createLocale, setCreateLocale] = useState('pt')
  const [showLocaleSelect, setShowLocaleSelect] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importSeconds, setImportSeconds] = useState(0)
  const importRef = useRef<HTMLInputElement | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [feedbackDone, setFeedbackDone] = useState(() => {
    try { return localStorage.getItem('cv_feedback_done') === '1' } catch { return false }
  })

  // Cover letter state
  const { items: coverLetters, loading: clLoading, create: createCoverLetter, remove: removeCoverLetter } = useCoverLetters()
  const [clOpenMenuId, setClOpenMenuId] = useState<string | null>(null)
  const [clDeletingId, setClDeletingId] = useState<string | null>(null)
  const [showNewClForm, setShowNewClForm] = useState(false)
  const [clCreating, setClCreating] = useState(false)
  const [clFormLocale, setClFormLocale] = useState<'pt' | 'en'>('pt')
  const [clFormTitle, setClFormTitle] = useState('')
  const [clFormCvId, setClFormCvId] = useState<string>('')

  useEffect(() => {
    fetch('/api/cv')
      .then((res) => res.json())
      .then((data) => setCvList(data))
      .catch(() => showToast('Falha ao carregar currículos', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 6000)
  }, [])

  useEffect(() => {
    const handleClick = () => {
      setOpenMenuId(null)
      setClOpenMenuId(null)
      setShowNewClForm(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null)
        setClOpenMenuId(null)
        setShowNewClForm(false)
      }
    }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Create blank CV → navigate to editor
  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: createLocale }),
      })
      const body = await res.json()
      if (!res.ok) {
        showToast(body.error ?? 'Falha ao criar currículo', 'error')
        return
      }
      navigate(`/editor/${body.id}`)
    } catch {
      showToast('Falha ao criar currículo', 'error')
    } finally {
      setCreating(false)
    }
  }

  // One-click import: select PDF → auto-detect locale → create + save → open editor
  const handleImportFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Arquivo muito grande. Tamanho máximo: 5MB.', 'error')
      return
    }

    setImporting(true)
    setImportSeconds(0)
    const timer = setInterval(() => setImportSeconds((s) => s + 1), 1000)

    try {
      const form = new FormData()
      form.append('pdf', file)
      const res = await fetch('/api/cv/import-pdf', { method: 'POST', body: form })
      const body = await res.json()

      if (!res.ok) {
        showToast(body.error ?? 'Falha ao importar PDF', 'error')
        return
      }

      navigate(`/editor/${body.id}`)
    } catch {
      showToast('Falha ao importar PDF. Verifique sua conexão.', 'error')
    } finally {
      clearInterval(timer)
      setImporting(false)
    }
  }

  const handleDelete = async (cvId: string) => {
    const confirmed = confirm('Tem certeza que deseja excluir este currículo? Esta ação não pode ser desfeita.')
    if (!confirmed) return

    setDeletingId(cvId)
    setOpenMenuId(null)
    try {
      const res = await fetch(`/api/cv/${cvId}`, { method: 'DELETE' })
      if (res.ok) {
        setCvList((prev) => prev.filter((cv) => cv.id !== cvId))
        showToast('Currículo excluído', 'success')
      } else {
        showToast('Falha ao excluir currículo', 'error')
      }
    } catch {
      showToast('Falha ao excluir currículo', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleClone = async (cvId: string, currentLocale: string) => {
    const targetLocale = currentLocale === 'pt' ? 'en' : 'pt'
    setCloningId(cvId)
    setOpenMenuId(null)
    try {
      const res = await fetch(`/api/cv/${cvId}/clone-translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLocale }),
      })
      const body = await res.json()
      if (res.ok) {
        setCvList((prev) => [{
          id: body.id,
          title: '',
          locale: body.locale,
          name: prev.find(c => c.id === cvId)?.name ?? '',
          updatedAt: new Date().toISOString(),
          templateId: prev.find(c => c.id === cvId)?.templateId ?? DEFAULT_CV_TEMPLATE_ID,
        }, ...prev])
        const langName = targetLocale === 'pt' ? 'Português' : 'Inglês'
        showToast(
          body.translated
            ? `Currículo traduzido e clonado em ${langName}`
            : `Currículo clonado em ${langName} (sem tradução — edite manualmente)`,
          'success',
        )
      } else {
        showToast(body.error ?? 'Falha ao clonar currículo', 'error')
      }
    } catch {
      showToast('Falha ao clonar currículo. Verifique sua conexão.', 'error')
    } finally {
      setCloningId(null)
    }
  }

  const handleCreateCoverLetter = async () => {
    setClCreating(true)
    try {
      const id = await createCoverLetter({
        locale: clFormLocale,
        title: clFormTitle.trim() || undefined,
        cvId: clFormCvId || null,
      })
      setShowNewClForm(false)
      setClFormTitle('')
      setClFormCvId('')
      navigate(`/cover-letter/${id}`)
    } catch {
      showToast('Falha ao criar carta de apresentação', 'error')
    } finally {
      setClCreating(false)
    }
  }

  const handleDeleteCoverLetter = async (id: string) => {
    const confirmed = confirm('Tem certeza que deseja excluir esta carta de apresentação? Esta ação não pode ser desfeita.')
    if (!confirmed) return

    setClDeletingId(id)
    setClOpenMenuId(null)
    try {
      await removeCoverLetter(id)
      showToast('Carta de apresentação excluída', 'success')
    } catch {
      showToast('Falha ao excluir carta de apresentação', 'error')
    } finally {
      setClDeletingId(null)
    }
  }

  const userId = user?.id ?? ''

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-forge-600 border-t-ember-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Meus Currículos</h1>
        <div className="flex items-center gap-2">
          {/* Import PDF — one click */}
          <button
            type="button"
            className="px-4 py-2.5 text-sm font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 hover:text-text-primary transition-all disabled:opacity-50"
            onClick={() => importRef.current?.click()}
            disabled={importing}
            title="Envie um PDF de currículo existente para preencher automaticamente"
          >
            {importing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-forge-400 border-t-ember-500 rounded-full animate-spin" />
                Importando... {importSeconds}s
              </span>
            ) : (
              'Importar PDF'
            )}
          </button>
          <input
            type="file"
            accept=".pdf"
            ref={importRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = ''
            }}
          />

          {/* Create new CV */}
          <div className="relative">
            <button
              type="button"
              className="px-4 py-2.5 bg-ember-500 text-white text-sm font-medium rounded-lg hover:bg-ember-400 transition-all shadow-lg shadow-ember-500/20 disabled:opacity-50"
              onClick={() => setShowLocaleSelect(!showLocaleSelect)}
              disabled={creating}
            >
              {creating ? 'Criando...' : 'Novo Currículo'}
            </button>
            {showLocaleSelect && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-forge-800 border border-forge-600 rounded-xl shadow-xl shadow-black/30 z-20 p-4" onClick={(e) => e.stopPropagation()}>
                <label htmlFor="cv-locale" className="block text-xs font-medium text-text-muted mb-1.5">Idioma do currículo</label>
                <select
                  id="cv-locale"
                  className="w-full px-3 py-2 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary focus:border-ember-500 focus:outline-none mb-1"
                  value={createLocale}
                  onChange={(e) => setCreateLocale(e.target.value)}
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                </select>
                <div className="mb-3" />
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-ember-500 text-white text-sm font-medium rounded-lg hover:bg-ember-400 transition-all"
                  onClick={() => { setShowLocaleSelect(false); handleCreate() }}
                >
                  Criar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className={`rounded-lg p-3 px-4 text-sm mb-4 ${
              toast.type === 'error'
                ? 'bg-error/10 border border-error/30 text-error'
                : 'bg-success/10 border border-success/30 text-success'
            }`}
            role="alert"
            aria-live="polite"
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback + Support cards */}
      {!feedbackDone && (
        <div className="mb-4">
          <FeedbackCard variant="card" onClose={() => setFeedbackDone(true)} />
        </div>
      )}

      <div className="bg-forge-800 border border-forge-600 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-text-primary">Apoie o Forja</span>
          <span className="text-sm text-text-secondary ml-2">O projeto e open-source e gratuito.</span>
        </div>
        <Link
          to="/apoie"
          className="flex-shrink-0 ml-4 px-4 py-2 text-sm font-medium text-ember-400 border border-ember-500/30 rounded-lg hover:bg-ember-500/10 transition-all no-underline"
        >
          Apoiar
        </Link>
      </div>

      {/* Import overlay */}
      <AnimatePresence>
        {importing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-forge-800 border border-ember-500/30 rounded-xl p-6 mb-6 text-center">
              <div className="w-10 h-10 mx-auto mb-3 border-3 border-forge-600 border-t-ember-500 rounded-full animate-spin" />
              <p className="text-sm text-text-primary font-medium">Extraindo dados do PDF com IA...</p>
              <p className="text-xs text-text-muted mt-1">Detectando idioma e preenchendo campos automaticamente ({importSeconds}s)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CV list */}
      {cvList.length === 0 ? (
        <div className="text-center py-16 bg-forge-800 border border-forge-600 rounded-xl">
          <svg className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-text-muted mb-4">Você ainda não criou nenhum currículo.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="px-4 py-2.5 bg-ember-500 text-white text-sm font-medium rounded-lg hover:bg-ember-400 transition-all shadow-lg shadow-ember-500/20"
              onClick={() => setShowLocaleSelect(true)}
            >
              Criar do Zero
            </button>
            <button
              type="button"
              className="px-4 py-2.5 text-sm font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 hover:text-text-primary transition-all"
              onClick={() => importRef.current?.click()}
              disabled={importing}
            >
              Importar PDF
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2" role="list">
          {cvList.map((cv) => {
            const displayName = cv.name || cv.title || 'Sem título'
            const localeBadge = LOCALE_LABELS[cv.locale as Locale] ?? cv.locale.toUpperCase()
            const templateName = isValidTemplateId(cv.templateId)
              ? TEMPLATES[cv.templateId].name
              : "Jake's Resume"
            const dateStr = new Date(cv.updatedAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })

            return (
              <li
                key={cv.id}
                className="group bg-forge-800 border border-forge-600 rounded-xl hover:border-molten-500/30 transition-all duration-200 cursor-pointer"
                onClick={() => navigate(`/editor/${cv.id}`)}
              >
                <div className="flex items-center px-5 py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-semibold text-sm text-text-primary truncate">{displayName}</span>
                    <span className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full bg-molten-500/10 text-molten-400 border border-molten-500/20 leading-none">{localeBadge}</span>
                    <span className="flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded-full bg-forge-700 text-text-secondary leading-none">{templateName}</span>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap mr-3 flex-shrink-0">
                    {dateStr}
                  </span>
                  <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center border border-forge-500 rounded-lg bg-forge-800 text-text-muted hover:bg-forge-700 hover:text-text-primary transition-colors text-sm cursor-pointer"
                      onClick={() => setOpenMenuId(openMenuId === cv.id ? null : cv.id)}
                      aria-label="Mais ações"
                      aria-haspopup="true"
                      aria-expanded={openMenuId === cv.id}
                    >
                      ...
                    </button>
                    {openMenuId === cv.id && (
                      <div
                        className="absolute right-0 top-full mt-1 min-w-[160px] bg-forge-700 border border-forge-600 rounded-lg shadow-xl shadow-black/30 z-10 py-1"
                        role="menu"
                      >
                        <a
                          href={`/cv/${userId}/${cv.id}`}
                          target="_blank"
                          className="flex items-center w-full px-3 py-2 text-sm text-text-secondary hover:bg-forge-600 hover:text-text-primary transition-colors min-h-[44px] no-underline"
                          role="menuitem"
                          rel="noreferrer"
                          title="Abrir o currículo como os recrutadores verão"
                        >
                          Ver link público
                        </a>
                        <button
                          type="button"
                          className="flex items-center w-full px-3 py-2 text-sm text-text-secondary hover:bg-forge-600 hover:text-text-primary transition-colors min-h-[44px] border-none bg-transparent cursor-pointer disabled:opacity-50"
                          role="menuitem"
                          disabled={cloningId === cv.id}
                          onClick={() => handleClone(cv.id, cv.locale)}
                        >
                          {cloningId === cv.id
                            ? 'Clonando...'
                            : cv.locale === 'pt' ? 'Clonar em Inglês' : 'Clonar em Português'}
                        </button>
                        <button
                          type="button"
                          className="flex items-center w-full px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors min-h-[44px] border-none bg-transparent cursor-pointer"
                          role="menuitem"
                          disabled={deletingId === cv.id}
                          onClick={() => handleDelete(cv.id)}
                        >
                          {deletingId === cv.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* ── Cover Letters section ── */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">Cartas de Apresentação</h2>
          <div className="relative">
            <button
              type="button"
              className="px-4 py-2.5 bg-ember-500 text-white text-sm font-medium rounded-lg hover:bg-ember-400 transition-all shadow-lg shadow-ember-500/20 disabled:opacity-50"
              onClick={() => setShowNewClForm(!showNewClForm)}
              disabled={clCreating}
            >
              {clCreating ? 'Criando...' : 'Nova Carta'}
            </button>
            {showNewClForm && (
              <div
                className="absolute right-0 top-full mt-2 w-72 bg-forge-800 border border-forge-600 rounded-xl shadow-xl shadow-black/30 z-20 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3">
                  <label htmlFor="cl-title" className="block text-xs font-medium text-text-muted mb-1.5">Título (opcional)</label>
                  <input
                    id="cl-title"
                    type="text"
                    placeholder="Sem título"
                    className="w-full px-3 py-2 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-ember-500 focus:outline-none"
                    value={clFormTitle}
                    onChange={(e) => setClFormTitle(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="cl-locale" className="block text-xs font-medium text-text-muted mb-1.5">Idioma</label>
                  <select
                    id="cl-locale"
                    className="w-full px-3 py-2 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary focus:border-ember-500 focus:outline-none"
                    value={clFormLocale}
                    onChange={(e) => setClFormLocale(e.target.value as 'pt' | 'en')}
                  >
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                  </select>
                </div>
                {cvList.length > 0 && (
                  <div className="mb-3">
                    <label htmlFor="cl-cv" className="block text-xs font-medium text-text-muted mb-1.5">Vincular a um currículo (opcional)</label>
                    <select
                      id="cl-cv"
                      className="w-full px-3 py-2 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary focus:border-ember-500 focus:outline-none"
                      value={clFormCvId}
                      onChange={(e) => setClFormCvId(e.target.value)}
                    >
                      <option value="">Nenhum</option>
                      {cvList.map((cv) => (
                        <option key={cv.id} value={cv.id}>
                          {cv.name || cv.title || 'Sem título'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-ember-500 text-white text-sm font-medium rounded-lg hover:bg-ember-400 transition-all disabled:opacity-50"
                  onClick={handleCreateCoverLetter}
                  disabled={clCreating}
                >
                  {clCreating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            )}
          </div>
        </div>

        {clLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-forge-600 border-t-ember-500 rounded-full animate-spin" />
          </div>
        ) : coverLetters.length === 0 ? (
          <div className="text-center py-12 bg-forge-800 border border-forge-600 rounded-xl">
            <p className="text-text-muted mb-3">Você ainda não criou nenhuma carta de apresentação.</p>
            <button
              type="button"
              className="px-4 py-2.5 bg-ember-500 text-white text-sm font-medium rounded-lg hover:bg-ember-400 transition-all shadow-lg shadow-ember-500/20"
              onClick={() => setShowNewClForm(true)}
            >
              Criar Nova Carta
            </button>
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {coverLetters.map((cl) => {
              const displayTitle = cl.title || 'Sem título'
              const localeBadge = cl.locale === 'pt' ? 'PT' : 'EN'
              const linkedCv = cl.cvId ? cvList.find((cv) => cv.id === cl.cvId) : null
              const createdAt = new Date(cl.createdAt)
              const now = Date.now()
              const diffMs = now - createdAt.getTime()
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
              const relativeDate =
                diffDays === 0
                  ? 'Hoje'
                  : diffDays === 1
                    ? '1 dia atrás'
                    : diffDays < 30
                      ? `${diffDays} dias atrás`
                      : createdAt.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })

              return (
                <li
                  key={cl.id}
                  className="group bg-forge-800 border border-forge-600 rounded-xl hover:border-molten-500/30 transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/cover-letter/${cl.id}`)}
                >
                  <div className="flex items-center px-5 py-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="font-semibold text-sm text-text-primary truncate">{displayTitle}</span>
                      <span className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full bg-molten-500/10 text-molten-400 border border-molten-500/20 leading-none">{localeBadge}</span>
                      {linkedCv && (
                        <span className="flex-shrink-0 text-xs text-text-muted truncate max-w-[160px]">
                          Vinculado: {linkedCv.name || linkedCv.title || 'Sem título'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap mr-3 flex-shrink-0">
                      {relativeDate}
                    </span>
                    <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="w-10 h-10 flex items-center justify-center border border-forge-500 rounded-lg bg-forge-800 text-text-muted hover:bg-forge-700 hover:text-text-primary transition-colors text-sm cursor-pointer"
                        onClick={() => setClOpenMenuId(clOpenMenuId === cl.id ? null : cl.id)}
                        aria-label="Mais ações"
                        aria-haspopup="true"
                        aria-expanded={clOpenMenuId === cl.id}
                      >
                        ...
                      </button>
                      {clOpenMenuId === cl.id && (
                        <div
                          className="absolute right-0 top-full mt-1 min-w-[160px] bg-forge-700 border border-forge-600 rounded-lg shadow-xl shadow-black/30 z-10 py-1"
                          role="menu"
                        >
                          <button
                            type="button"
                            className="flex items-center w-full px-3 py-2 text-sm text-text-secondary hover:bg-forge-600 hover:text-text-primary transition-colors min-h-[44px] border-none bg-transparent cursor-pointer"
                            role="menuitem"
                            onClick={() => { setClOpenMenuId(null); navigate(`/cover-letter/${cl.id}`) }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="flex items-center w-full px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors min-h-[44px] border-none bg-transparent cursor-pointer disabled:opacity-50"
                            role="menuitem"
                            disabled={clDeletingId === cl.id}
                            onClick={() => handleDeleteCoverLetter(cl.id)}
                          >
                            {clDeletingId === cl.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </motion.div>
  )
}
