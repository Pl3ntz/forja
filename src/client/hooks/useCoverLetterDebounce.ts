import { useRef, useEffect } from 'react'
import type { CoverLetterInput } from '@/lib/zod-schemas/cover-letter.js'

interface UseCoverLetterDebounceOptions {
  data: CoverLetterInput
  onPreview: (data: CoverLetterInput) => void
  onSave: (data: CoverLetterInput) => void
  /**
   * Skip the first render (initial mount) so we don't double-fetch
   * on page load when the parent already calls onPreview once.
   */
  skip?: boolean
}

/**
 * Fires `onPreview` after 300ms and `onSave` after 1500ms whenever `data`
 * changes. Mirrors the debounce pattern in CvEditorForm.tsx but extracted
 * into a reusable hook for the cover letter editor.
 */
export function useCoverLetterDebounce({
  data,
  onPreview,
  onSave,
  skip = false,
}: UseCoverLetterDebounceOptions): void {
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipRef = useRef(skip)

  // Update skipRef when skip changes (initial-mount guard)
  useEffect(() => {
    skipRef.current = skip
  }, [skip])

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false
      return
    }

    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => onPreview(data), 300)

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onSave(data), 1500)

    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current)
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])
}
