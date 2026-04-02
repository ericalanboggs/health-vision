import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle } from '@mui/icons-material'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Checkbox, Banner } from '@summit/design-system'
import supabase from '../lib/supabase'

const DAY_PREVIEW = [
  { day: 'Monday', theme: 'Environment', desc: 'Fix your screen setup and workspace ergonomics' },
  { day: 'Tuesday', theme: 'Release', desc: 'Stretch and release built-up neck and shoulder tension' },
  { day: 'Wednesday', theme: 'Strengthen', desc: 'Build the muscles that prevent tech neck from returning' },
  { day: 'Thursday', theme: 'Breathe & Reset', desc: 'Address the stress and nervous system tension underneath' },
  { day: 'Friday', theme: 'Your Routine', desc: 'Combine everything into a 2-minute daily practice' },
]

const BENEFITS = [
  '25 coaching texts over 5 days (5/day)',
  'Evidence-based exercises and stretches',
  'A 2-minute daily routine you can keep forever',
  'Morning email overview each day',
]

// Format digits to (555) 123-4567
function formatPhone(digits) {
  if (!digits) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

export default function TechNeckLanding() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    email: '',
    phone: '',       // raw digits only (e.g. "5551234567")
    smsConsent: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setForm(prev => ({ ...prev, phone: digits }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!form.firstName || !form.email || !form.phone) {
      setError('All fields are required.')
      return
    }

    if (form.phone.length !== 10) {
      setError('Please enter a valid 10-digit US phone number.')
      return
    }

    setLoading(true)

    try {
      // Generate a random password for the account (user never sees it)
      const password = crypto.randomUUID()

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/create-lite-enrollment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          firstName: form.firstName,
          email: form.email,
          phone: `+1${form.phone}`,
          password,
          smsConsent: form.smsConsent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })

      const data = await res.json()

      if (!res.ok || data?.error) {
        if (data?.error?.includes('already exists')) {
          setError('An account with this email already exists. Please sign in.')
          setLoading(false)
          return
        }
        throw new Error(data?.error || `Request failed: ${res.status}`)
      }

      // Auto sign-in with the generated password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password,
      })

      if (signInError) {
        console.error('Auto sign-in failed:', signInError)
        throw new Error('Account created but sign-in failed. Please try logging in.')
      }

      // Session created — Home.jsx will route to verify-phone or tech-neck/status
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Enrollment error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7FAF9] to-[#EEF3F1]">
      {/* Start date banner */}
      <div className="w-full bg-summit-mint py-3 text-center">
        <p className="text-body-sm font-semibold text-summit-forest">
          🚀 Sign up today, start next <strong>Monday</strong> — 5 days of coaching texts
        </p>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <img src="/summit-logo.png" alt="Summit" className="w-28 mx-auto mb-6" />
          <h1 className="text-h1 text-summit-forest mb-4">
            5-Day Tech Neck Challenge
          </h1>
          <p className="text-body text-summit-forest/80 max-w-xl mx-auto">
            Fix your posture in 2 minutes a day. Get 5 daily coaching texts with evidence-based stretches, strengthening exercises, and a routine you can keep.
          </p>
        </div>

        {/* Signup Form */}
        <Card id="signup" variant="elevated" padding="lg" className="mb-8">
          <CardHeader>
            <CardTitle as="h2" className="text-center text-h2">Join the Challenge</CardTitle>
          </CardHeader>

          <CardContent className="mt-6">
            {error && (
              <Banner variant="error" className="mb-6">
                {error}
                {error.includes('already exists') && (
                  <div className="mt-2">
                    <Link to="/login" className="text-summit-emerald underline font-medium">Sign in here</Link>
                  </div>
                )}
              </Banner>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="First Name"
                name="firstName"
                type="text"
                size="lg"
                required
                value={form.firstName}
                onChange={handleChange}
                placeholder="Your first name"
              />

              <Input
                label="Email"
                name="email"
                type="email"
                size="lg"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />

              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-summit-forest">
                  Phone Number
                </label>
                <div className="flex items-center h-12 w-full bg-white border border-gray-200 rounded-lg transition-all duration-normal ease-out focus-within:border-summit-emerald focus-within:ring-2 focus-within:ring-summit-emerald/40">
                  <span className="pl-4 text-base text-summit-forest select-none">+1</span>
                  <div className="mx-3 h-6 w-px bg-gray-200" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formatPhone(form.phone)}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    className="flex-1 h-full bg-transparent text-base text-summit-forest placeholder:text-text-muted focus:outline-none pr-4"
                  />
                </div>
              </div>

              <Checkbox
                size="sm"
                shape="rounded"
                checked={form.smsConsent}
                onChange={(e) => setForm(prev => ({ ...prev, smsConsent: e.target.checked }))}
                label="Get 5 daily texts with real-time coaching cues"
                description="Strongly recommended for best results. Standard message rates apply."
                align="top"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full !rounded-xl mt-2"
                loading={loading}
                disabled={loading}
              >
                Join for $1
              </Button>

              <p className="text-xs text-text-muted text-center pt-2">
                By signing up you agree to our{' '}
                <Link to="/privacy" className="underline">Privacy Policy</Link>,{' '}
                <Link to="/terms" className="underline">Terms</Link>, and{' '}
                <Link to="/sms-consent" className="underline">SMS Consent</Link>.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card variant="outlined" className="mb-8">
          <CardHeader>
            <CardTitle as="h2">What You Get</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-3">
            {BENEFITS.map(b => (
              <div key={b} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-summit-mint flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-summit-emerald" />
                </div>
                <span className="text-body-sm text-text-secondary">{b}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Day-by-Day Preview */}
        <Card variant="outlined" className="mb-8">
          <CardHeader>
            <CardTitle as="h2">Your Week at a Glance</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-3">
            {DAY_PREVIEW.map(({ day, theme, desc }) => (
              <div key={day} className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-20 text-body-sm font-semibold text-summit-emerald pt-0.5">{day}</div>
                <div>
                  <p className="text-body-sm font-semibold text-summit-forest">{theme}</p>
                  <p className="text-body-sm text-text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>


      </main>
    </div>
  )
}
