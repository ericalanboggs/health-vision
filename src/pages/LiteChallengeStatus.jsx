import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Autorenew } from '@mui/icons-material'
import { getCurrentUser } from '../services/authService'
import supabase from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Banner } from '@summit/design-system'
import { getLiteChallenge } from '../data/liteChallengeConfig'

const LITE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_LITE_TECH_NECK

export default function LiteChallengeStatus({ slug }) {
  const navigate = useNavigate()
  const challenge = getLiteChallenge(slug)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [enrollment, setEnrollment] = useState(null)
  const [challengeDay, setChallengeDay] = useState(null)
  const [error, setError] = useState(null)

  const formatStartDate = (dateStr) => {
    if (!dateStr) return 'next Monday'
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  useEffect(() => {
    const load = async () => {
      if (!challenge) {
        navigate('/', { replace: true })
        return
      }
      const { user } = await getCurrentUser()
      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      const { data } = await supabase
        .from('lite_challenge_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_slug', challenge.slug)
        .maybeSingle()

      if (!data) {
        navigate(challenge.routePath, { replace: true })
        return
      }

      setEnrollment(data)

      const today = new Date()
      const start = new Date(data.cohort_start_date + 'T00:00:00')
      const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      setChallengeDay(diffDays)
      setLoading(false)
    }
    load()
  }, [navigate, challenge])

  const handlePayment = async () => {
    setError(null)
    setCheckoutLoading(true)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: LITE_PRICE_ID,
          mode: 'payment',
          successUrl: `${challenge.routePath}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${challenge.routePath}/status`,
          metadata: { challenge_type: 'lite', challenge_slug: challenge.slug },
        },
      })

      if (fnError) throw fnError

      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError('Failed to start checkout. Please try again.')
      setCheckoutLoading(false)
    }
  }

  if (!challenge) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <div className="text-center">
          <Autorenew className="w-12 h-12 text-summit-emerald animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  const isPending = enrollment.status === 'pending'
  const isPreStart = !isPending && challengeDay < 1
  const isActive = !isPending && challengeDay >= 1 && challengeDay <= 5 && enrollment.status !== 'completed'
  const isCompleted = enrollment.status === 'completed' || (!isPending && challengeDay > 5)

  const expectations = enrollment.delivery_track === 'sms'
    ? challenge.expectations.sms
    : challenge.expectations.emailOnly

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
      <main className="max-w-lg mx-auto px-4">
        <Card className="text-center">
          <CardHeader>
            <img src="/summit-logo.png" alt="Summit" className="w-20 mx-auto mb-4" />
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-summit-moss mb-3">
              {challenge.displayName}
            </p>

            {isPending && (
              <>
                <CardTitle as="h1" className="text-h1 text-summit-forest">
                  Complete Your Enrollment
                </CardTitle>
                <CardDescription className="text-body mt-2">
                  One last step — pay $1 to lock in your spot. &#128170;
                </CardDescription>
              </>
            )}

            {isPreStart && (
              <>
                <CardTitle as="h1" className="text-h1 text-summit-forest">
                  Starts {formatStartDate(enrollment?.cohort_start_date)}
                </CardTitle>
                <CardDescription className="text-body mt-2">
                  You're enrolled and ready to go. We'll start sending {enrollment.delivery_track === 'sms' ? 'texts' : 'emails'} on Monday morning.
                </CardDescription>
              </>
            )}

            {isActive && (
              <>
                <CardTitle as="h1" className="text-h1 text-summit-forest">
                  Day {challengeDay} of 5
                </CardTitle>
                <CardDescription className="text-body mt-2">
                  Today's focus: <strong>{challenge.dayThemes[challengeDay]}</strong>
                </CardDescription>
              </>
            )}

            {isCompleted && (
              <>
                <CardTitle as="h1" className="text-h1 text-summit-forest">
                  {challenge.completedTitle}
                </CardTitle>
                <CardDescription className="text-body mt-2">
                  {challenge.completedDescription}
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-6 mt-4">
            {isPending && (
              <>
                {error && (
                  <Banner variant="error">{error}</Banner>
                )}
                <div className="bg-summit-mint/30 rounded-xl p-4 text-left">
                  <p className="text-body-sm font-semibold text-summit-forest mb-2">What you'll get:</p>
                  <ul className="text-body-sm text-text-secondary space-y-2 list-none">
                    {expectations.map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-summit-emerald flex-shrink-0">&#10003;</span> {item}
                      </li>
                    ))}
                    {challenge.outcomePromise && (
                      <li className="flex items-start gap-2">
                        <span className="text-summit-emerald flex-shrink-0">&#10003;</span> {challenge.outcomePromise}
                      </li>
                    )}
                  </ul>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handlePayment}
                  loading={checkoutLoading}
                  disabled={checkoutLoading}
                >
                  Pay $1 to Join
                </Button>
                <p className="text-xs text-text-muted">
                  Challenge starts <strong>{formatStartDate(enrollment?.cohort_start_date)}</strong>. One-time payment, no subscription.
                </p>
              </>
            )}

            {isCompleted && (
              <>
                <div className="bg-[#f0fdf4] rounded-xl p-5 text-left border-2 border-summit-emerald">
                  <p className="text-body-sm font-bold text-summit-emerald text-center mb-3">
                    {challenge.routine.title}
                  </p>
                  <ol className="text-body-sm text-summit-forest space-y-2 list-decimal list-inside">
                    {challenge.routine.items.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                  <p className="text-xs text-text-muted text-center mt-3">
                    {challenge.routine.footer}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => navigate('/pricing')}
                  >
                    Join Summit
                  </Button>
                  <a
                    href="https://instagram.com/summithealthcoach"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-body-sm text-summit-emerald underline"
                  >
                    Follow @summithealthcoach on Instagram
                  </a>
                </div>
              </>
            )}

            {isActive && (
              <div className="bg-summit-mint/30 rounded-xl p-4 text-left">
                <p className="text-body-sm text-text-secondary">
                  {enrollment.delivery_track === 'sms'
                    ? 'Check your phone for coaching texts throughout the day (8am, 10am, 12pm, 3pm, 5pm).'
                    : 'Check your email for today\'s coaching cues.'}
                </p>
              </div>
            )}

            {isPreStart && (
              <div className="bg-summit-mint/30 rounded-xl p-4 text-left">
                <p className="text-body-sm font-semibold text-summit-forest mb-2">What to expect:</p>
                <ul className="text-body-sm text-text-secondary space-y-1">
                  {expectations.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
