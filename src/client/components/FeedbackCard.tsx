import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  readonly variant: 'card' | 'modal'
  readonly onClose?: () => void
}

const STAR_COUNT = 5

export default function FeedbackCard({ variant, onClose }: Props) {
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [type, setType] = useState<'user' | 'recruiter'>('user')
  const [message, setMessage] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleStarClick = (star: number) => {
    setRating(star)
    if (!expanded) setExpanded(true)
  }

  const handleSubmit = async () => {
    if (rating === 0) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          rating,
          message,
          contactEmail: contactEmail || undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Falha ao enviar feedback')
        return
      }

      setDone(true)
      localStorage.setItem('cv_feedback_done', '1')
    } catch {
      setError('Falha ao enviar feedback. Verifique sua conexao.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className={`bg-forge-800 border border-forge-600 rounded-xl p-6 ${variant === 'modal' ? 'max-w-md w-full mx-auto' : ''}`}>
        <div className="text-center">
          <div className="text-2xl mb-2">Obrigado!</div>
          <p className="text-sm text-text-secondary">Seu feedback nos ajuda a melhorar o Forja.</p>
          {variant === 'modal' && onClose && (
            <button
              type="button"
              className="mt-4 px-4 py-2 text-sm font-medium text-text-secondary border border-forge-500 rounded-lg hover:bg-forge-700 hover:text-text-primary transition-all"
              onClick={onClose}
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-forge-800 border border-forge-600 rounded-xl p-6 ${variant === 'modal' ? 'max-w-md w-full mx-auto' : ''}`}>
      <h3 className="text-sm font-semibold text-text-primary mb-3">Ajude-nos a melhorar</h3>

      {/* Stars */}
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            className="p-0.5 transition-transform hover:scale-110 cursor-pointer bg-transparent border-none"
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleStarClick(star)}
            aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={star <= (hoveredStar || rating) ? '#f59e0b' : 'none'}
              stroke={star <= (hoveredStar || rating) ? '#f59e0b' : '#6b7280'}
              strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        ))}
      </div>

      {/* Expanded form */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Eu sou</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer border ${
                      type === 'user'
                        ? 'bg-ember-500/15 text-ember-400 border-ember-500/30'
                        : 'bg-forge-700 text-text-secondary border-forge-600 hover:bg-forge-600'
                    }`}
                    onClick={() => setType('user')}
                  >
                    Candidato
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer border ${
                      type === 'recruiter'
                        ? 'bg-ember-500/15 text-ember-400 border-ember-500/30'
                        : 'bg-forge-700 text-text-secondary border-forge-600 hover:bg-forge-600'
                    }`}
                    onClick={() => setType('recruiter')}
                  >
                    Recrutador
                  </button>
                </div>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="feedback-msg" className="block text-xs font-medium text-text-muted mb-1.5">Mensagem (opcional)</label>
                <textarea
                  id="feedback-msg"
                  className="w-full px-3 py-2 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary focus:border-ember-500 focus:outline-none resize-none"
                  rows={3}
                  maxLength={2000}
                  placeholder="O que podemos melhorar?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="feedback-email" className="block text-xs font-medium text-text-muted mb-1.5">E-mail de contato (opcional)</label>
                <input
                  id="feedback-email"
                  type="email"
                  className="w-full px-3 py-2 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary focus:border-ember-500 focus:outline-none"
                  placeholder="seu@email.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-xs text-error">{error}</p>
              )}

              {/* Submit */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-ember-500 text-white text-sm font-medium rounded-lg hover:bg-ember-400 transition-all shadow-lg shadow-ember-500/20 disabled:opacity-50"
                  disabled={submitting || rating === 0}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Enviando...' : 'Enviar Feedback'}
                </button>
                {variant === 'modal' && onClose && (
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                    onClick={onClose}
                  >
                    Pular
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
