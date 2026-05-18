import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth.js'
import CoverLetterEditorForm from '../components/CoverLetterEditorForm.js'
import { isValidUuid } from '@/lib/validation.js'
import type { CoverLetterInput } from '@/lib/zod-schemas/cover-letter.js'
import type { CoverLetterData } from '@/types/cover-letter.js'

export default function CoverLetterEditorPage() {
  const { coverLetterId } = useParams<{ coverLetterId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [coverLetterData, setCoverLetterData] = useState<CoverLetterData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!coverLetterId || !isValidUuid(coverLetterId)) {
      navigate('/dashboard')
      return
    }

    fetch(`/api/cover-letter/${coverLetterId}`)
      .then((res) => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then((data) => setCoverLetterData(data as CoverLetterData))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [coverLetterId, navigate])

  if (loading || !coverLetterData || !coverLetterId || !user) {
    return (
      <div className="h-screen bg-forge-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-forge-600 border-t-ember-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Build CoverLetterInput by stripping server-only fields from CoverLetterData
  const {
    id: _id,
    userId: _userId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...input
  } = coverLetterData

  const initialData = input as CoverLetterInput

  return (
    <CoverLetterEditorForm
      initialData={initialData}
      coverLetterId={coverLetterId}
      linkedCvTitle={null}
    />
  )
}
