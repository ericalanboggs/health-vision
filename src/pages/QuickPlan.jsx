import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowForward, ArrowBack, PlayArrow, Schedule, Flag, FileDownload } from '@mui/icons-material'
import { Button, Card } from '@summit/design-system'
import QuickStartVision from '../components/steps/QuickStartVision'
import { EMPTY_VISION_FORM } from '../data/visionFormDefaults'
import {
  questionsForSource,
  saveQuickPlan,
  loadQuickPlan,
  resolvePersona,
  buildVisionParagraph,
} from '../lib/quickPlan'
import { trackEvent } from '../lib/posthog'
import { captureAcquisitionFromUrl, getAcquisitionSource } from '../lib/acquisition'
import { downloadVisionPdf } from '../lib/visionPdf'

// Pre-auth vision quiz, served at /plan with no account required.
//
// Reuses QuickStartVision for the question screens so there's one source of truth
// for the quiz UI — this page only supplies a shortened question plan and renders
// its own payoff. Answers persist to localStorage; ProfileSetup claims them after
// signup. Nothing here writes to the database and nothing here asks for an email
// or a phone number (STRATEGIC_DIRECTION.md §4.2).

// The founder video for whichever segment they routed to.
//
// Vimeo restricts embed playback by domain. If go.summithealth.app (and
// localhost, for dev) aren't allowlisted in the video's privacy settings the
// player returns 401 and renders as an empty black box, so there's a fallback
// link out to Vimeo underneath — same pattern as summit-web's PersonaPage.
const FounderVideo = ({ persona, reason }) => {
  const portrait = persona.orientation === 'portrait'
  return (
  <div className="mb-8">
    {persona.heading && (
      <h2 className="text-h2 text-summit-forest mb-4 text-center">{persona.heading}</h2>
    )}
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-summit-forest ${
        portrait ? 'aspect-[9/16] max-w-[360px] mx-auto' : 'aspect-video'
      }`}
    >
      <iframe
        src={persona.embed}
        title={persona.heading || `${persona.label} — Summit Health`}
        className="h-full w-full"
        loading="lazy"
        allow="fullscreen; picture-in-picture"
      />
    </div>
    <p className="text-xs text-text-tertiary text-center mt-2">
      Trouble playing?{' '}
      <a
        href={persona.embed.replace('player.vimeo.com/video', 'vimeo.com')}
        className="underline underline-offset-2 hover:text-summit-emerald"
        target="_blank"
        rel="noopener noreferrer"
      >
        Watch it on Vimeo
      </a>. Routed to the <span className="font-medium">{persona.label}</span> cut — {reason}.
    </p>
  </div>
  )
}

// Standing in for the founder video until they are shot. Sized at the real
// 16:9 so the payoff screen reads at its true weight.
const VideoPlaceholder = ({ persona, reason }) => (
  <div className="mb-8">
    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-summit-forest">
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mb-4">
          <PlayArrow className="w-9 h-9 text-white" />
        </div>
        <p className="text-white font-medium text-lg mb-1">{persona.headline}</p>
        <p className="text-white/70 text-sm">
          Eric, {persona.duration}
        </p>
      </div>
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-md bg-white/15 backdrop-blur text-white text-xs font-medium">
          PLACEHOLDER
        </span>
        <span className="px-2.5 py-1 rounded-md bg-white/15 backdrop-blur text-white text-xs">
          {persona.label} · {persona.status}
        </span>
      </div>
    </div>
    <p className="text-xs text-text-tertiary text-center mt-2">
      Routed to the <span className="font-medium">{persona.label}</span> cut — {reason}.
    </p>
  </div>
)

export default function QuickPlan() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('intro') // 'intro' | 'quiz' | 'summary'
  const [formData, setFormData] = useState({ ...EMPTY_VISION_FORM })

  // A ?source= tag on the landing URL is the strongest routing signal there is,
  // so capture it before anything else. Same stash the rest of the app reads.
  const [acquisitionSource, setAcquisitionSource] = useState(null)

  // Also resumes a quiz someone abandoned. Only jumps straight to the payoff if
  // they actually finished it — a half-answered stash just prefills the questions.
  useEffect(() => {
    captureAcquisitionFromUrl()
    setAcquisitionSource(getAcquisitionSource())

    const saved = loadQuickPlan()
    if (saved) {
      setFormData({ ...EMPTY_VISION_FORM, ...saved })
      if (saved.visionStatement && saved.habitsToImprove?.length) {
        setPhase('summary')
      }
    }
    trackEvent('quick_plan_viewed', { source: getAcquisitionSource() })
  }, [])

  const updateFormData = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value }
      saveQuickPlan(next)
      return next
    })
  }

  // Per-question funnel step. Without this we would know how many people start
  // and finish, but not which question they abandon on — and that is the only
  // part of a drop-off number you can act on.
  const handleQuestionView = useCallback(({ number, total, field, section }) => {
    trackEvent('quick_plan_question_viewed', {
      question_number: number,
      question_total: total,
      field,
      section,
      source: acquisitionSource,
    })
  }, [acquisitionSource])

  const handleQuizComplete = () => {
    // QuickStartVision writes the final answer and calls onComplete in the same
    // tick, so `formData` here can be one update behind. The stash is written
    // inside updateFormData and is always current — read the event payload from
    // there rather than from the closure.
    const latest = loadQuickPlan() || formData
    trackEvent('quick_plan_completed', {
      persona: resolvePersona(latest, acquisitionSource).key,
      time_capacity: latest.timeCapacity,
      current_score: latest.currentScore,
    })
    setPhase('summary')
    window.scrollTo(0, 0)
  }

  const handleDownload = () => {
    const latest = loadQuickPlan() || formData
    const persona = resolvePersona(latest, acquisitionSource)
    trackEvent('quick_plan_downloaded', { persona: persona.key })
    downloadVisionPdf({
      visionParagraph: buildVisionParagraph(latest),
      currentScore: latest.currentScore,
      timeCapacity: latest.timeCapacity,
      barriers: latest.barriers || [],
      habitsToImprove: latest.habitsToImprove || [],
      lifeContextLabel: persona.label,
    })
  }

  const handleCreateAccount = () => {
    trackEvent('quick_plan_signup_clicked', { persona: resolvePersona(formData, acquisitionSource).key })
    navigate('/login?mode=sign-up')
  }

  // Spelled out, since "7 questions" in a sentence reads like a spec sheet. The
  // count varies: a tagged visitor skips the segment question.
  const NUMBER_WORDS = { 6: 'Six', 7: 'Seven' }
  const planLength = questionsForSource(acquisitionSource).length
  const questionCount = NUMBER_WORDS[planLength] || planLength

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
        <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20">
          <div className="flex justify-center mb-8">
            <img src="/summit-logo.svg" alt="Summit Health" className="h-10" />
          </div>

          <div className="text-center mb-10">
            <h1 className="text-h1 text-summit-forest mb-4">
              Start with your vision
            </h1>
            <p className="text-body-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
              {questionCount} questions. You'll end up with a picture of what you actually
              want, and an honest read on what you can give right now.
            </p>
          </div>

          <Card className="p-8">
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-summit-sage flex items-center justify-center">
                  <Schedule className="w-6 h-6 text-summit-pine" />
                </div>
                <div>
                  <p className="font-semibold text-summit-forest">About two minutes</p>
                  <p className="text-body-sm text-text-secondary">
                    Tap through it. Nothing to type unless you want to.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-summit-sage flex items-center justify-center">
                  <Flag className="w-6 h-6 text-summit-pine" />
                </div>
                <div>
                  <p className="font-semibold text-summit-forest">No account needed</p>
                  <p className="text-body-sm text-text-secondary">
                    No email, no phone number. You'll see your vision at the end either way.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => { setPhase('quiz'); window.scrollTo(0, 0) }}
              variant="primary"
              size="lg"
              className="w-full mt-8"
              rightIcon={<ArrowForward className="w-5 h-5" />}
            >
              Start
            </Button>
          </Card>

          <button
            type="button"
            onClick={() => navigate('/login?mode=sign-up')}
            className="w-full text-center text-sm text-stone-500 hover:text-summit-emerald py-3 mt-4 transition"
          >
            Skip this and just create an account
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'quiz') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
        <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex justify-center mb-10">
            <img src="/summit-logo.svg" alt="Summit Health" className="h-8" />
          </div>
          <QuickStartVision
            formData={formData}
            updateFormData={updateFormData}
            onComplete={handleQuizComplete}
            onBack={() => { setPhase('intro'); window.scrollTo(0, 0) }}
            questionPlan={questionsForSource(acquisitionSource)}
            onQuestionView={handleQuestionView}
            requireSliderTouch
            quizOnly
          />
        </div>
      </div>
    )
  }

  // Payoff screen
  const persona = resolvePersona(formData, acquisitionSource)
  const visionParagraph = buildVisionParagraph(formData)
  const barriers = formData.barriers || []
  const habits = formData.habitsToImprove || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <div className="flex justify-center mb-10">
          <img src="/summit-logo.svg" alt="Summit Health" className="h-8" />
        </div>

        <div className="text-center mb-8">
          <p className="text-body-sm text-summit-emerald font-medium uppercase tracking-wide mb-2">
            Your Vision
          </p>
          <h1 className="text-h1 text-summit-forest">
            Here's what you just described.
          </h1>
        </div>

        {visionParagraph && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-200 mb-8">
            <p className="text-body text-stone-700 leading-relaxed italic">
              "{visionParagraph}"
            </p>
          </div>
        )}

        {persona.embed
          ? <FounderVideo persona={persona} reason={persona.reason} />
          : <VideoPlaceholder persona={persona} reason={persona.reason} />}

        {/* The honest read: what they said about where they are and what they have. */}
        <Card className="p-6 mb-8">
          <p className="font-semibold text-summit-forest mb-4">Where you're starting</p>
          <dl className="space-y-3 text-body-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Today</dt>
              <dd className="font-medium text-summit-forest">{formData.currentScore} out of 10</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Time you can give</dt>
              <dd className="font-medium text-summit-forest">{formData.timeCapacity || 'Not set'}</dd>
            </div>
            {barriers.length > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">In the way</dt>
                <dd className="font-medium text-summit-forest text-right">{barriers.join(', ')}</dd>
              </div>
            )}
            {habits.length > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Worth working on</dt>
                <dd className="font-medium text-summit-forest text-right">{habits.join(', ')}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-6 sm:p-8 text-center">
          <p className="text-body text-stone-700 leading-relaxed mb-6">
            Next is the part that actually moves: picking one habit small enough to
            survive a bad week. Create a free account and Summit will suggest a few
            based on what you just said.
          </p>
          <Button
            onClick={handleCreateAccount}
            variant="primary"
            size="lg"
            className="w-full"
            rightIcon={<ArrowForward className="w-5 h-5" />}
          >
            Create my free account
          </Button>
          <p className="text-xs text-text-tertiary mt-3">
            14-day trial. Your answers carry over.
          </p>

          {/* Secondary, and deliberately given away before signup. The download is
              what turns the quiz from a lead form into something that produced an
              artifact — printable, keepable, shareable with a doctor. Someone who
              takes it and leaves was not going to sign up today anyway, and they
              leave holding something with Summit's name on it. */}
          <button
            type="button"
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-summit-forest hover:text-summit-emerald underline underline-offset-4 py-3 mt-4 transition"
          >
            <FileDownload className="w-4 h-4" />
            Download a copy of my vision
          </button>
        </Card>

        <button
          type="button"
          onClick={() => { setPhase('quiz'); window.scrollTo(0, 0) }}
          className="w-full flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-summit-emerald py-3 mt-4 transition"
        >
          <ArrowBack className="w-4 h-4" />
          Change my answers
        </button>

        <p className="text-xs text-text-tertiary text-center leading-relaxed mt-6">
          Summit offers lifestyle and habit coaching — not medical advice. Use these
          suggestions alongside your healthcare provider's guidance, not in place of it.
        </p>
      </div>
    </div>
  )
}
