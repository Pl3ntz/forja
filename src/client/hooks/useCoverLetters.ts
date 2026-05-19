import { useState, useCallback, useEffect } from 'react'

export interface CoverLetterListItem {
  id: string
  title: string
  locale: 'pt' | 'en'
  templateId: string
  cvId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCoverLetterPayload {
  locale: 'pt' | 'en'
  title?: string
  cvId?: string | null
}

export function useCoverLetters() {
  const [items, setItems] = useState<CoverLetterListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cover-letter')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? 'Falha ao carregar cartas de apresentação')
        return
      }
      const data: CoverLetterListItem[] = await res.json()
      setItems(data)
    } catch {
      setError('Falha ao carregar cartas de apresentação')
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(
    async (payload: CreateCoverLetterPayload): Promise<string> => {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error((body as { error?: string }).error ?? 'Falha ao criar carta de apresentação')
      }
      await refresh()
      return (body as { id: string }).id
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      const res = await fetch(`/api/cover-letter/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Falha ao excluir carta de apresentação')
      }
      setItems((prev) => prev.filter((item) => item.id !== id))
    },
    [],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, error, refresh, create, remove }
}
