// TODO: extract SplitPaneEditor when 2nd duplication bug hits OR 3rd editor variant is requested.
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CoverLetterInput } from '@/lib/zod-schemas/cover-letter.js'
import type { Locale } from '@/lib/locales.js'
import { LOCALES, LOCALE_LABELS } from '@/lib/locales.js'
import { useCoverLetterDebounce } from '../hooks/useCoverLetterDebounce.js'
import { useModalA11y } from '../hooks/useModalA11y.js'
import CoverLetterHeaderForm from './CoverLetterHeaderForm.js'
import CoverLetterRecipientForm from './CoverLetterRecipientForm.js'
import CoverLetterBodyForm from './CoverLetterBodyForm.js'
import CoverLetterClosingForm from './CoverLetterClosingForm.js'

type Tab = 'sender' | 'recipient' | 'body' | 'closing'

const TABS: { key: Tab; label: string }[] = [
  { key: 'sender', label: 'Remetente' },
  { key: 'recipient', label: 'Destinatario' },
  { key: 'body', label: 'Corpo' },
  { key: 'closing', label: 'Encerramento' },
]

interface Props {
  initialData: CoverLetterInput
  coverLetterId: string
  linkedCvTitle?: string | null
}

const LOCALE_OPTIONS = LOCALES.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))

export default function CoverLetterEditorForm({ initialData, coverLetterId, linkedCvTitle }: Props) {
  const [data, setData] = useState<CoverLetterInput>(initialData)
  const [activeTab, setActiveTab] = useState<Tab>('sender')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewError, setPreviewError] = useState(false)
  const [previewRefreshing, setPreviewRefreshing] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form')
  const [latexModalOpen, setLatexModalOpen] = useState(false)
  const [latexSource, setLatexSource] = useState(initialData.customLatex ?? '')
  const [latexLoading, setLatexLoading] = useState(false)
  const [latexPdfLoading, setLatexPdfLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const lastSaveDataRef = useRef<CoverLetterInput | null>(null)
  const isInitialRef = useRef(true)
  const closeLatexModal = useCallback(() => setLatexModalOpen(false), [])
  const latexModalRef = useModalA11y(latexModalOpen, closeLatexModal)

  const fetchPreview = useCallback(async (d: CoverLetterInput) => {
    setPreviewError(false)
    setPreviewRefreshing(true)
    try {
      const response = await fetch(`/api/cover-letter/${coverLetterId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
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
  }, [coverLetterId])

  const saveCoverLetter = useCallback(async (d: CoverLetterInput) => {
    lastSaveDataRef.current = d
    setSaveStatus('saving')
    try {
      const response = await fetch(`/api/cover-letter/${coverLetterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      })
      setSaveStatus(response.ok ? 'saved' : 'error')
    } catch {
      setSaveStatus('error')
    }
  }, [coverLetterId])

  const retrySave = useCallback(() => {
    if (lastSaveDataRef.current) {
      saveCoverLetter(lastSaveDataRef.current)
    }
  }, [saveCoverLetter])

  // Initial preview on mount
  useEffect(() => {
    fetchPreview(initialData)
    isInitialRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce: 300ms preview + 1500ms save on data change
  useCoverLetterDebounce({
    data,
    onPreview: fetchPreview,
    onSave: saveCoverLetter,
    skip: isInitialRef.current,
  })

  const downloadPdf = useCallback(async () => {
    setPdfLoading(true)
    try {
      const response = await fetch(`/api/cover-letter/${coverLetterId}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
          const body = await response.json()
          alert((body as { error?: string }).error ?? 'Falha ao gerar PDF')
        } else {
          alert('Falha ao gerar PDF')
        }
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const contentDisposition = response.headers.get('content-disposition') ?? ''
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/)
      const filename = filenameMatch?.[1] ?? 'cover_letter.pdf'
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Falha ao gerar PDF')
    } finally {
      setPdfLoading(false)
    }
  }, [coverLetterId, data])

  const openLatexEditor = useCallback(async () => {
    setLatexModalOpen(true)
    if (data.customLatex) {
      setLatexSource(data.customLatex)
      return
    }
    // customLatex is empty — nothing to load; leave textarea empty
    setLatexSource('')
    setLatexLoading(false)
  }, [data.customLatex])

  const downloadLatexPdf = useCallback(async () => {
    setLatexPdfLoading(true)
    try {
      const response = await fetch(`/api/cover-letter/${coverLetterId}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, customLatex: latexSource }),
      })
      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
          const body = await response.json()
          alert((body as { error?: string }).error ?? 'Falha ao gerar PDF a partir do codigo fonte')
        } else {
          alert('Falha ao gerar PDF a partir do codigo fonte')
        }
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const contentDisposition = response.headers.get('content-disposition') ?? ''
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/)
      const filename = filenameMatch?.[1] ?? 'cover_letter.pdf'
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Falha ao gerar PDF a partir do codigo fonte')
    } finally {
      setLatexPdfLoading(false)
    }
  }, [coverLetterId, data, latexSource])

  const saveCustomLatex = useCallback(() => {
    setData((prev) => ({ ...prev, customLatex: latexSource }))
    setLatexModalOpen(false)
  }, [latexSource])

  const deleteCoverLetter = useCallback(async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/cover-letter/${coverLetterId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        window.location.href = '/dashboard'
      } else {
        alert('Falha ao excluir carta de apresentacao')
        setDeleteConfirm(false)
      }
    } catch {
      alert('Falha ao excluir carta de apresentacao')
      setDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }, [coverLetterId])

  const statusText = (): string => {
    switch (saveStatus) {
      case 'saving': return 'Salvando...'
      case 'saved': return 'Salvo'
      case 'error': return 'Erro ao salvar — clique para tentar'
      default: return 'Tudo salvo'
    }
  }

  const statusColorClass =
    saveStatus === 'saving' ? 'text-warning'
    : saveStatus === 'saved' ? 'text-success'
    : saveStatus === 'error' ? 'text-error underline cursor-pointer'
    : 'text-text-muted'

  const renderForm = (tab: Tab) => {
    switch (tab) {
      case 'sender':
        return <CoverLetterHeaderForm data={data} onDataChange={setData} />
      case 'recipient':
        return <CoverLetterRecipientForm data={data} onDataChange={setData} />
      case 'body':
        return <CoverLetterBodyForm data={data} onDataChange={setData} />
      case 'closing':
        return <CoverLetterClosingForm data={data} onDataChange={setData} />
    }
  }

  return (
    <>
      {/* Header bar */}
      <header className="flex items-center h-12 px-2 bg-forge-850 border-b border-forge-600 gap-1 flex-shrink-0">
        <a
          href="/dashboard"
          className="flex items-center justify-center w-10 h-10 border border-forge-500 rounded-lg bg-forge-850 text-text-secondary no-underline text-base flex-shrink-0 hover:bg-forge-700 transition-colors"
          title="Painel"
          aria-label="Voltar ao Painel"
        >
          &larr;
        </a>

        {/* Title input */}
        <input
          className="ml-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder-text-muted focus:bg-forge-800 focus:border focus:border-forge-500 rounded px-2 py-1 w-40 flex-shrink-0 transition-all"
          value={data.title}
          onChange={(e) => setData({ ...data, title: e.target.value })}
          placeholder="Sem titulo"
          aria-label="Titulo da carta de apresentacao"
        />

        {/* Tabs */}
        <div
          className="flex items-center gap-0 ml-1 flex-1 min-w-0 overflow-x-auto scrollbar-none"
          role="tablist"
          aria-label="Secoes da carta de apresentacao"
        >
          {TABS.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`cl-tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls={`cl-tabpanel-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              className={`relative px-3 h-12 border-none bg-transparent text-sm cursor-pointer whitespace-nowrap flex items-center transition-colors ${
                activeTab === tab.key
                  ? 'text-ember-400 font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(e) => {
                let next = i
                if (e.key === 'ArrowRight') next = (i + 1) % TABS.length
                else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length
                else if (e.key === 'Home') next = 0
                else if (e.key === 'End') next = TABS.length - 1
                else return
                e.preventDefault()
                setActiveTab(TABS[next].key)
                document.getElementById(`cl-tab-${TABS[next].key}`)?.focus()
              }}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-ember-500"
                  layoutId="clActiveTab"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {/* Linked CV badge */}
          {linkedCvTitle && (
            <span
              className="text-xs text-text-muted border border-forge-500 rounded px-2 py-0.5 whitespace-nowrap hidden sm:block"
              title="Curriculo vinculado (somente leitura)"
            >
              CV: {linkedCvTitle}
            </span>
          )}

          {/* Locale dropdown */}
          <select
            className="bg-forge-800 border border-forge-500 rounded-lg text-xs text-text-primary px-2 py-1 cursor-pointer"
            value={data.locale}
            onChange={(e) => setData({ ...data, locale: e.target.value as Locale })}
            aria-label="Idioma da carta"
          >
            {LOCALE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Save status */}
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
            <span className={`text-xs ${statusColorClass}`} role="status" aria-live="polite">
              {statusText()}
            </span>
          )}

          {/* Edit LaTeX */}
          <button
            type="button"
            className="flex items-center justify-center px-3 py-1 border border-forge-500 rounded-lg text-xs font-semibold min-h-[36px] transition-all cursor-pointer whitespace-nowrap text-text-secondary hover:bg-forge-700"
            onClick={openLatexEditor}
            disabled={latexLoading}
            aria-label="Editar codigo fonte LaTeX"
            title="Editar codigo fonte da carta (recurso avancado)"
          >
            Codigo fonte
          </button>

          {/* Download PDF */}
          <button
            type="button"
            className={`flex items-center justify-center px-3 py-1 border border-forge-500 rounded-lg text-xs font-semibold min-h-[36px] transition-all cursor-pointer whitespace-nowrap ${
              pdfLoading
                ? 'bg-ember-500/10 text-ember-400 border-ember-500/30 animate-pulse'
                : 'text-text-secondary hover:bg-forge-700'
            }`}
            onClick={downloadPdf}
            disabled={pdfLoading}
            aria-label={pdfLoading ? 'Gerando PDF...' : 'Baixar PDF'}
            aria-busy={pdfLoading}
          >
            {pdfLoading ? 'Gerando...' : 'Baixar PDF'}
          </button>

          {/* Delete */}
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-error">Confirmar exclusao?</span>
              <button
                type="button"
                className="px-2 py-1 text-xs font-semibold text-white bg-error rounded-lg cursor-pointer border-none hover:bg-error/80 transition-colors disabled:opacity-60"
                onClick={deleteCoverLetter}
                disabled={deleting}
                aria-label="Confirmar exclusao da carta de apresentacao"
              >
                {deleting ? '...' : 'Sim'}
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs font-semibold text-text-secondary border border-forge-500 rounded-lg cursor-pointer bg-transparent hover:bg-forge-700 transition-colors"
                onClick={() => setDeleteConfirm(false)}
                aria-label="Cancelar exclusao"
              >
                Nao
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex items-center justify-center w-9 h-9 border border-forge-500 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer bg-transparent"
              onClick={() => setDeleteConfirm(true)}
              aria-label="Excluir carta de apresentacao"
              title="Excluir carta"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5h6.4L11 4" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Mobile view toggle */}
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

      {/* Split pane */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-48px)] md:h-[calc(100vh-48px)]">
        {/* Form pane */}
        <div
          className={`flex-[4] overflow-y-auto p-4 border-r border-forge-600 bg-forge-900 ${
            mobileView === 'preview' ? 'hidden md:block' : ''
          }`}
        >
          <AnimatePresence mode="wait">
            {TABS.map((tab) =>
              activeTab === tab.key ? (
                <motion.div
                  key={tab.key}
                  id={`cl-tabpanel-${tab.key}`}
                  role="tabpanel"
                  aria-labelledby={`cl-tab-${tab.key}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderForm(tab.key)}
                </motion.div>
              ) : null,
            )}
          </AnimatePresence>
        </div>

        {/* Preview pane */}
        <div
          className={`relative flex-[5] overflow-hidden bg-forge-800 flex flex-col items-center p-3 ${
            mobileView === 'form' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {previewError ? (
            <div className="flex flex-col items-center justify-center gap-3 h-full text-text-muted">
              <p>Erro ao carregar a visualizacao</p>
              <button
                type="button"
                className="px-3 py-2 text-sm font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 transition-all"
                onClick={() => fetchPreview(data)}
              >
                Tentar novamente
              </button>
            </div>
          ) : previewHtml ? (
            <iframe
              className={`w-full max-w-[8in] h-full border border-forge-600 bg-white rounded ${
                previewRefreshing ? 'opacity-50 transition-opacity' : ''
              }`}
              srcDoc={previewHtml}
              title="Visualizacao da carta de apresentacao"
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <div className="flex items-center justify-center text-text-muted h-full">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-forge-600 border-t-ember-500 rounded-full animate-spin" />
                Carregando visualizacao...
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
              aria-label="Editor de codigo fonte LaTeX"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-forge-600">
                <div>
                  <span className="text-sm font-semibold text-text-primary">Codigo fonte LaTeX</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    Edite somente se tiver conhecimento tecnico. O LaTeX customizado substitui os campos estruturados.
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
                      Carregando codigo fonte...
                    </div>
                  </div>
                ) : (
                  <textarea
                    className="w-full h-full bg-forge-900 text-text-primary font-mono text-xs leading-relaxed p-4 border-none outline-none resize-none"
                    value={latexSource}
                    onChange={(e) => setLatexSource(e.target.value)}
                    spellCheck={false}
                    aria-label="Codigo LaTeX da carta de apresentacao"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
