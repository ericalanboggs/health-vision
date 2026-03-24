import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Autorenew } from '@mui/icons-material'
import { getCurrentUser } from '../services/authService'
import supabase from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Banner } from '@summit/design-system'

const LITE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_LITE_TECH_NECK

const DAY_THEMES = {
  1: 'Environment',
  2: 'Release',
  3: 'Strengthen',
  4: 'Breathe & Reset',
  5: 'Your Daily Routine',
}

export default function TechNeckStatus() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [enrollment, setEnrollment] = useState(null)
  const [challengeDay, setChallengeDay] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { user } = await getCurrentUser()
      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      const { data } = await supabase
        .from('lite_challenge_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_slug', 'tech-neck')
        .maybeSingle()

      if (!data) {
        navigate('/tech-neck', { replace: true })
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
  }, [navigate])

  const handlePayment = async () => {
    setError(null)
    setCheckoutLoading(true)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: LITE_PRICE_ID,
          mode: 'payment',
          successUrl: '/tech-neck/success?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: '/tech-neck/status',
          metadata: { challenge_type: 'lite', challenge_slug: 'tech-neck' },
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
      <main className="max-w-lg mx-auto px-4">
        <Card className="text-center">
          <CardHeader>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-summit-moss mb-3">
              Tech Neck Challenge
            </p>

            {isPending && (
              <>
                <CardTitle as="h1" className="text-h1 text-summit-forest">
                  Complete Your Enrollment
                </CardTitle>
                <CardDescription className="text-body mt-2">
                  One last step — pay $1 to lock in your spot.
                </CardDescription>
              </>
            )}

            {isPreStart && (
              <>
                <CardTitle as="h1" className="text-h1 text-summit-forest">
                  Starts Monday, March 30
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
                  Today's focus: <strong>{DAY_THEMES[challengeDay]}</strong>
                </CardDescription>
              </>
            )}

            {isCompleted && (
              <>
                <CardTitle as="h1" className="text-h1 text-summit-forest">
                  Challenge Complete!
                </CardTitle>
                <CardDescription className="text-body mt-2">
                  You made it through all 5 days. Here's what to keep doing.
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
                  <ul className="text-body-sm text-text-secondary space-y-1">
                    {enrollment.delivery_track === 'sms' ? (
                      <>
                        <li>5 coaching texts per day (8am - 5pm)</li>
                        <li>A morning email overview each day</li>
                      </>
                    ) : (
                      <li>A daily email with all 5 coaching cues</li>
                    )}
                    <li>End-of-challenge summary with your routine</li>
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
                  Challenge starts <strong>Monday, March 30</strong>. One-time payment, no subscription.
                </p>
              </>
            )}

            {isCompleted && (
              <>
                <div className="bg-[#f0fdf4] rounded-xl p-5 text-left border-2 border-summit-emerald">
                  <p className="text-body-sm font-bold text-summit-emerald text-center mb-3">
                    Your 2-Minute Daily Routine
                  </p>
                  <ol className="text-body-sm text-summit-forest space-y-2 list-decimal list-inside">
                    <li>Chin tucks &mdash; 5 reps</li>
                    <li>Scapular retractions &mdash; 10 reps</li>
                    <li>Upper trap stretch &mdash; 20 seconds each side</li>
                    <li>Three slow breaths</li>
                  </ol>
                  <p className="text-xs text-text-muted text-center mt-3">
                    Do this once or twice a day. No equipment needed.
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
                {enrollment.delivery_track === 'sms' ? (
                  <ul className="text-body-sm text-text-secondary space-y-1">
                    <li>5 coaching texts per day (8am - 5pm)</li>
                    <li>A morning email overview each day</li>
                    <li>End-of-challenge summary on Friday</li>
                  </ul>
                ) : (
                  <ul className="text-body-sm text-text-secondary space-y-1">
                    <li>A daily email with all 5 coaching cues</li>
                    <li>End-of-challenge summary on Friday</li>
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
