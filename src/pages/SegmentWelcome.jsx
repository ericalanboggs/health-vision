import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Autorenew } from '@mui/icons-material'
import { Button, Card } from '@summit/design-system'
import { getCurrentUser, getProfile } from '../services/authService'
import { saveJourney, loadJourney } from '../services/journeyService'
import { getSegment } from '../data/onboardingSegments'
import { EMPTY_VISION_FORM } from '../data/visionFormDefaults'
import { trackEvent } from '../lib/posthog'

// Segment-aware welcome screen, shown between profile-setup and the Vision flow
// for users acquired through a tailored marketing landing page. Acknowledges why
// they came, then captures the change they want and why — seeding both the Vision
// flow and the AI habit suggestions. Organic / unknown-source users never reach
// here (Home routes them straight to /start).
export default function SegmentWelcome() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEditing = searchParams.get('edit') === '1'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [segment, setSegment] = useState(null)
  const [existingForm, setExistingForm] = useState(null)
  const [reason, setReason] = useState('')
  const [why, setWhy] = useState('')

  useEffect(() => {
    const init = async () => {
      const { user } = await getCurrentUser()
      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      const profileResult = await getProfile(user.id)
      const seg = getSegment(profileResult?.data?.acquisition_source)

      // Not a tailored segment — fall back to the mode fork. (Home should
      // already prevent this, but guard in case /welcome is hit directly.)
      if (!seg) {
        navigate('/vision', { replace: true })
        return
      }

      const journey = await loadJourney(user.id)
      const savedForm = journey?.data?.form_data || null

      // Resume guard: a returning user who already answered skips ahead — unless
      // they came back explicitly to edit (?edit=1 from the Vision intro).
      if (savedForm?.segmentReason && !isEditing) {
        navigate('/vision', { replace: true })
        return
      }

      // Prefill prior answers (relevant when editing).
      setReason(savedForm?.segmentReason || '')
      setWhy(savedForm?.segmentWhy || '')
      setExistingForm(savedForm)
      setSegment(seg)
      setLoading(false)
    }
    init()
  }, [navigate, isEditing])

  const handleContinue = async () => {
    if (saving) return
    setSaving(true)
    try {
      const segmentReason = reason.trim()
      const segmentWhy = why.trim()
      const formData = {
        ...EMPTY_VISION_FORM,
        ...(existingForm || {}),
        segmentReason,
        segmentWhy,
        // Seed the Vision "why it matters" field if it's still empty, so they
        // don't have to repeat themselves.
        whyMatters: existingForm?.whyMatters || segmentWhy,
      }
      await saveJourney(formData, 'welcome')
      trackEvent('segment_welcome_completed', {
        source: segment.label,
        has_reason: !!segmentReason,
        has_why: !!segmentWhy,
      })
    } catch (err) {
      console.error('SegmentWelcome save error:', err)
      // Non-blocking — still continue into the Vision flow.
    } finally {
      setSaving(false)
      navigate('/vision')
    }
  }

  if (loading || !segment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <Autorenew className="w-8 h-8 animate-spin text-summit-emerald" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <img src="/summit-logo.svg" alt="Summit Health" className="h-10" />
          </div>
          <h1 className="text-h1 text-summit-forest mb-4">
            {segment.headline}
          </h1>
          <p className="text-body-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
            {segment.ack}
          </p>
        </div>

        {/* Questions */}
        <Card className="p-8 sm:p-10">
          <div className="space-y-8">
            <div>
              <label htmlFor="segment-reason" className="block text-lg font-semibold text-summit-forest mb-2">
                {segment.whatPrompt}
              </label>
              <textarea
                id="segment-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="In your own words…"
                className="w-full h-32 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
              />
            </div>

            <div>
              <label htmlFor="segment-why" className="block text-lg font-semibold text-summit-forest mb-2">
                {segment.whyPrompt}
              </label>
              <textarea
                id="segment-why"
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="What's driving this right now?"
                className="w-full h-32 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
              />
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={saving}
            loading={saving}
            variant="primary"
            size="lg"
            className="w-full mt-8"
          >
            {saving ? 'Saving…' : 'Continue →'}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/vision')}
            className="w-full text-center text-sm text-stone-500 hover:text-summit-emerald py-3 mt-2 transition"
          >
            Skip for now
          </button>
        </Card>

        {/* Wellness disclaimer */}
        <p className="text-xs text-text-tertiary text-center leading-relaxed mt-6 max-w-xl mx-auto">
          Summit offers lifestyle and habit coaching — not medical advice. Use these
          suggestions alongside your healthcare provider's guidance, not in place of it.
        </p>
      </div>
    </div>
  )
}
