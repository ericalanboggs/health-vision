import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Autorenew } from '@mui/icons-material'
import { getCurrentUser } from '../services/authService'
import supabase from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@summit/design-system'

export default function TechNeckSuccess() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [deliveryTrack, setDeliveryTrack] = useState('sms')
  const [startDate, setStartDate] = useState(null)

  const formatStartDate = (dateStr) => {
    if (!dateStr) return 'next Monday'
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  useEffect(() => {
    const loadEnrollment = async () => {
      const { user } = await getCurrentUser()
      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      // Poll for enrollment status (webhook may be slow)
      let attempts = 0
      const maxAttempts = 5
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

      while (attempts < maxAttempts) {
        const { data: enrollment } = await supabase
          .from('lite_challenge_enrollments')
          .select('status, delivery_track, cohort_start_date')
          .eq('user_id', user.id)
          .eq('challenge_slug', 'tech-neck')
          .maybeSingle()

        if (enrollment && enrollment.status !== 'pending') {
          setDeliveryTrack(enrollment.delivery_track)
          setStartDate(enrollment.cohort_start_date)
          setLoading(false)
          return
        }

        attempts++
        await delay(2000)
      }

      // Fallback — still show success
      setLoading(false)
    }

    loadEnrollment()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <div className="text-center">
          <Autorenew className="w-12 h-12 text-summit-emerald animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Confirming your enrollment...</p>
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
              Tech Neck Challenge
            </p>
            <CardTitle className="text-h1 text-summit-forest">
              You're In!
            </CardTitle>
            <CardDescription className="text-body mt-2">
              Challenge starts <strong>{formatStartDate(startDate)}</strong>.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-summit-mint/30 rounded-xl p-4 text-left">
              <p className="text-body-sm font-semibold text-summit-forest mb-2">What to expect:</p>
              {deliveryTrack === 'sms' ? (
                <ul className="text-body-sm text-text-secondary space-y-1">
                  <li>5 coaching texts per day (8am - 5pm)</li>
                  <li>A morning email overview each day</li>
                  <li>End-of-challenge summary with your routine</li>
                </ul>
              ) : (
                <ul className="text-body-sm text-text-secondary space-y-1">
                  <li>A daily email with all 5 coaching cues</li>
                  <li>End-of-challenge summary with your routine</li>
                </ul>
              )}
            </div>

            <p className="text-body-sm text-text-muted">
              We'll send a welcome email with everything you need before the challenge begins.
            </p>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate('/tech-neck/status', { replace: true })}
            >
              View Challenge Status
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
