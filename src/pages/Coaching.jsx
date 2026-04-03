import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, getProfile, upsertProfile } from '../services/authService'
import { hasActiveSubscription, isOnTrial, COACHING_CONFIG, getBillingPeriod, getMyCoachingSessions } from '../services/subscriptionService'
import { ArrowForward, Forum, EventBusy, CheckCircle } from '@mui/icons-material'
import Cal from '@calcom/embed-react'
import coachEric from '../assets/coach-eric.jpeg'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Tag,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalCallout,
} from '@summit/design-system'

const SESSION_TOPICS = [
  'Work through a specific challenge',
  'Plan around upcoming life events',
  'Refine and evolve your health vision',
  'Design personalized lifestyle strategies',
  'Coach-assisted habit & schedule adjustments',
]

export default function Coaching() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [sessionsUsed, setSessionsUsed] = useState(0)
  const [showExpectations, setShowExpectations] = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const userResult = await getCurrentUser()
      const userId = userResult.user?.id
      if (!userId) {
        navigate('/login', { replace: true })
        return
      }

      const profileResult = await getProfile(userId)
      if (!profileResult.success || !profileResult.data) {
        navigate('/login', { replace: true })
        return
      }

      if (!hasActiveSubscription(profileResult.data, userResult.user?.email)) {
        navigate('/pricing', { replace: true })
        return
      }

      setProfile(profileResult.data)

      const tier = profileResult.data.subscription_tier
      if (tier && COACHING_CONFIG[tier]?.sessionsPerMonth > 0) {
        const period = getBillingPeriod(profileResult.data.subscription_current_period_end)
        const sessionsResult = await getMyCoachingSessions(userId, period.start, period.end)
        if (sessionsResult.success) {
          setSessionsUsed(sessionsResult.count)
        }

        // Show expectations modal if not yet accepted
        if (!profileResult.data.coaching_expectations_accepted_at) {
          setShowExpectations(true)
        }
      }

      setLoading(false)
    }

    load()
  }, [navigate])

  const handleAcceptExpectations = async () => {
    setAccepting(true)
    const result = await upsertProfile(profile.id, {
      coaching_expectations_accepted_at: new Date().toISOString(),
    })
    if (result.success) {
      setProfile(prev => ({ ...prev, coaching_expectations_accepted_at: new Date().toISOString() }))
      setShowExpectations(false)
    }
    setAccepting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  const tier = profile?.subscription_tier || 'core'
  const config = COACHING_CONFIG[tier] || COACHING_CONFIG.core
  const hasCoachingAccess = !isOnTrial(profile) && tier !== 'core' && config.sessionsPerMonth > 0

  // Coach intro section — shown for all tiers
  const CoachIntro = () => (
    <>
      {/* Coach Eric hero */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_0_rgba(2,44,35,0.12)] p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <img
            src={coachEric}
            alt="Coach Eric"
            className="w-28 h-28 rounded-full object-cover border-3 border-summit-sage flex-shrink-0"
          />
          <div>
            <h2 className="text-xl font-semibold text-summit-forest mb-1 text-center sm:text-left">Coach Eric</h2>
            <p className="text-sm text-text-muted mb-3 text-center sm:text-left">Summit Founder & Health Coach</p>
            <p className="text-body text-text-secondary leading-relaxed">
              I built Summit because I went through my own health transformation. Coaching sessions are
              where we sit down together, look at what's really going on, and figure out a way forward.
              I review your vision, habits, and progress before we meet — so we hit the ground running.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_0_rgba(2,44,35,0.12)] p-6 mb-6">
        <h2 className="text-lg font-semibold text-summit-forest mb-4">How a session works</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-summit-sage text-summit-emerald flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-medium text-summit-forest">I prepare for you</p>
              <p className="text-sm text-text-secondary">Before we meet, I review your vision, your habits, your tracking data, and your reflections. I come ready to help.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-summit-sage text-summit-emerald flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-medium text-summit-forest">We work through it together</p>
              <p className="text-sm text-text-secondary">You bring the challenge. I listen, ask questions, and we brainstorm as thought partners — figuring out what experiments to try and what might actually work in your life.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-summit-sage text-summit-emerald flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">3</span>
            <div>
              <p className="font-medium text-summit-forest">You leave with a plan</p>
              <p className="text-sm text-text-secondary">We move towards action — you commit to an approach, and I follow up in the weeks after to help you see it through.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session topics */}
      <div className="bg-summit-mint border border-summit-sage rounded-2xl p-6 mb-6">
        <h3 className="font-semibold text-summit-forest mb-3">What we can work on</h3>
        <div className="space-y-2">
          {SESSION_TOPICS.map((topic, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-summit-emerald flex-shrink-0" />
              <span className="text-sm text-summit-forest">{topic}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )

  // Trial or Core — show intro + upgrade CTA
  if (!hasCoachingAccess) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-h1 text-summit-forest mb-2">Coaching</h1>
        <p className="text-body text-text-secondary mb-6">
          1-on-1 sessions with a Summit Health coach
        </p>

        <CoachIntro />

        <Card>
          <CardHeader className="mb-4">
            <CardTitle className="text-h3">
              {isOnTrial(profile) ? 'Coaching is available on paid plans' : 'Upgrade to access coaching'}
            </CardTitle>
            <CardDescription className="text-body">
              Plus includes 1 session per month (30 min). Premium includes 2 deep sessions per month (30 min each).
            </CardDescription>
          </CardHeader>
          <Button
            variant="primary"
            rightIcon={<ArrowForward className="h-4 w-4" />}
            onClick={() => navigate('/pricing')}
          >
            View Plans
          </Button>
        </Card>
      </main>
    )
  }

  const allUsed = sessionsUsed >= config.sessionsPerMonth
  const periodEnd = profile?.subscription_current_period_end
  const nextReset = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null

  return (
    <>
      {/* Expectations Modal */}
      <Modal
        isOpen={showExpectations}
        onClose={() => {}}
        showCloseButton={false}
        closeOnOverlayClick={false}
        size="lg"
        variant="gradient"
      >
        <ModalHeader badge="Before you schedule" bordered={false}>
          <ModalTitle>What coaching means in Summit</ModalTitle>
          <ModalDescription>
            A few things to know before your first session.
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          <ModalCallout>
            <p className="text-body text-summit-forest leading-relaxed">
              This isn't someone telling you how to live your life. Coaching is about being heard, thinking things through together, and recognizing that you already have the answers — you just may need space and support to uncover them.
            </p>
          </ModalCallout>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-summit-emerald font-bold mt-0.5">1.</span>
              <p className="text-body text-text-secondary">
                <strong className="text-summit-forest">Sessions are {config.sessionDuration} minutes.</strong> Come with a topic in mind — a challenge, a goal, or something you're working through.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-summit-emerald font-bold mt-0.5">2.</span>
              <p className="text-body text-text-secondary">
                <strong className="text-summit-forest">{config.sessionsPerMonth} session{config.sessionsPerMonth > 1 ? 's' : ''} per month</strong> with your current plan. Sessions reset each billing period.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-summit-emerald font-bold mt-0.5">3.</span>
              <p className="text-body text-text-secondary">
                <strong className="text-summit-forest">Show up fully.</strong> Find a quiet place where you can give your full attention — not while driving or multitasking. You'll get the most out of your session when you're present.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-summit-emerald font-bold mt-0.5">4.</span>
              <p className="text-body text-text-secondary">
                <strong className="text-summit-forest">24-hour cancellation policy.</strong> Please cancel or reschedule at least 24 hours before your session. Late cancellations count toward your monthly limit.
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter align="right">
          <Button
            variant="primary"
            onClick={handleAcceptExpectations}
            disabled={accepting}
          >
            {accepting ? 'Saving...' : 'I understand'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Page content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-h1 text-summit-forest mb-2">Coaching</h1>
        <p className="text-body text-text-secondary mb-6">
          1-on-1 sessions with a Summit Health coach
        </p>

        <CoachIntro />

        {/* Session counter */}
        <div className="flex items-center gap-3 mb-6">
          <Tag size="sm" variant="secondary">
            {sessionsUsed} of {config.sessionsPerMonth} used this month
          </Tag>
          {nextReset && (
            <p className="text-body-sm text-text-muted">
              Resets {nextReset}
            </p>
          )}
        </div>

        {allUsed ? (
          <Card>
            <CardHeader className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-summit-sage">
                  <EventBusy className="h-5 w-5 text-summit-moss" />
                </div>
                <CardTitle className="text-h3">All sessions used</CardTitle>
              </div>
              <CardDescription className="text-body">
                You've used all {config.sessionsPerMonth} coaching session{config.sessionsPerMonth > 1 ? 's' : ''} for this billing period.
                {nextReset && ` Your sessions will reset on ${nextReset}.`}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-summit-sage bg-white" style={{ minHeight: '600px' }}>
            <Cal
              calLink="summit-health/30min"
              config={{
                theme: 'light',
                hideEventTypeDetails: false,
              }}
              style={{ width: '100%', height: '100%', overflow: 'scroll', minHeight: '600px' }}
            />
          </div>
        )}

        {/* Cancellation policy note */}
        {!allUsed && (
          <p className="text-body-sm text-text-muted mt-4 text-center">
            Please cancel or reschedule at least 24 hours before your session.
          </p>
        )}
      </main>
    </>
  )
}
