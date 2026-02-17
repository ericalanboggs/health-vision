import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Autorenew } from '@mui/icons-material'
import { getCurrentUser, getProfile } from '../services/authService'
import { getTierDisplayName } from '../services/subscriptionService'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Banner } from '@summit/design-system'

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tierName, setTierName] = useState('')
  const [isTrialing, setIsTrialing] = useState(false)
  const [trialEnd, setTrialEnd] = useState(null)

  useEffect(() => {
    const loadSubscriptionInfo = async () => {
      const { user } = await getCurrentUser()
      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      // Poll briefly in case webhook hasn't fired yet
      let attempts = 0
      const maxAttempts = 5
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

      while (attempts < maxAttempts) {
        const profileResult = await getProfile(user.id)
        if (profileResult.success && profileResult.data?.subscription_status) {
          const profile = profileResult.data
          setTierName(getTierDisplayName(profile.subscription_tier))
          setIsTrialing(profile.subscription_status === 'trialing')
          if (profile.trial_ends_at) {
            setTrialEnd(new Date(profile.trial_ends_at))
          }
          setLoading(false)
          return
        }
        attempts++
        await delay(2000)
      }

      // Fallback — webhook may be slow, still show success
      setTierName('Your plan')
      setLoading(false)
    }

    loadSubscriptionInfo()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <div className="text-center">
          <Autorenew className="w-12 h-12 text-summit-emerald animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Setting up your subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
      <main className="max-w-lg mx-auto px-4">
        <Card className="text-center">
          <CardHeader>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-summit-moss mb-3">
              {tierName}
            </p>
            <CardTitle className="text-h1 text-summit-forest">
              Welcome to Summit
            </CardTitle>
            <CardDescription className="text-body mt-2">
              Your subscription is active. Time to start your journey.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {isTrialing && trialEnd && (
              <Banner variant="info">
                Your 7-day free trial is active through{' '}
                {trialEnd.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}. You won't be charged until then.
              </Banner>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate('/dashboard', { replace: true })}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
