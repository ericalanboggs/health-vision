import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkPilotAccess, sendMagicLink } from '../services/authService'
import { Mail, ArrowRight, CheckCircle, XCircle, Shield } from 'lucide-react'

export default function PilotIntake() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('input') // input, checking, approved, denied, sent
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setStatus('checking')

    // Check if email is on the pilot allowlist
    const hasAccess = await checkPilotAccess(email)

    if (!hasAccess) {
      setStatus('denied')
      setLoading(false)
      return
    }

    // Email is approved, send magic link
    setStatus('approved')
    
    // Wait a moment to show approval message
    await new Promise(resolve => setTimeout(resolve, 1000))

    const result = await sendMagicLink(email)

    if (result.success) {
      setStatus('sent')
    } else {
      setError(result.error?.message || 'Failed to send magic link. Please try again.')
      setStatus('input')
    }

    setLoading(false)
  }

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Success state - magic link sent
  if (status === 'sent') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-stone-800 mb-3">
            Check Your Email
          </h1>
          
          <p className="text-stone-600 mb-6">
            We've sent a magic link to <strong>{email}</strong>
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
            <p className="text-sm text-stone-700 mb-2">
              <strong>Next steps:</strong>
            </p>
            <ol className="text-sm text-stone-600 space-y-1 list-decimal list-inside">
              <li>Check your email inbox</li>
              <li>Click the magic link in the email</li>
              <li>You'll be automatically signed in</li>
            </ol>
          </div>

          <button
            onClick={() => {
              setStatus('input')
              setEmail('')
            }}
            className="mt-6 text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  // Denied state - email not on allowlist
  if (status === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-amber-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-stone-800 mb-3">
            Pilot Access Required
          </h1>
          
          <p className="text-stone-600 mb-6">
            The email <strong>{email}</strong> is not currently approved for pilot access.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-6">
            <p className="text-sm text-stone-700 mb-2">
              <strong>Interested in joining?</strong>
            </p>
            <p className="text-sm text-stone-600">
              Summit is currently in a limited pilot phase. If you'd like to be considered for access, please reach out to our team.
            </p>
          </div>

          <button
            onClick={() => {
              setStatus('input')
              setEmail('')
              setError(null)
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Try Another Email
          </button>
        </div>
      </div>
    )
  }

  // Checking/Approved state
  if (status === 'checking' || status === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 ${status === 'approved' ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
              {status === 'approved' ? (
                <CheckCircle className="w-10 h-10 text-green-600" />
              ) : (
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-stone-800 mb-3">
            {status === 'approved' ? 'Access Approved!' : 'Verifying Access...'}
          </h1>
          
          <p className="text-stone-600">
            {status === 'approved' 
              ? 'Sending your magic link...' 
              : 'Checking if your email is approved for pilot access'}
          </p>
        </div>
      </div>
    )
  }

  // Input state - main form
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">🏔️</span>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-stone-800 mb-2">
            Summit Pilot Program
          </h1>
          
          <p className="text-stone-600 text-lg">
            A 4-week experiment in sustainable health change
          </p>
        </div>

        {/* Marketing Bullets */}
        <div className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">How It Works</h2>
          
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-stone-800">Define Your Health Vision</p>
                <p className="text-sm text-stone-600">Clarify what you actually want—not what you think you "should" do.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-stone-800">Commit to 1-2 Small Habits Weekly</p>
                <p className="text-sm text-stone-600">No overwhelming lists. Just realistic experiments that fit your actual life.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-stone-800">Get Gentle Reminders (SMS + Email)</p>
                <p className="text-sm text-stone-600">Nudges, not pressure. We remind you of what you chose—no guilt, no streaks.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-stone-800">Reflect Weekly on What's Working</p>
                <p className="text-sm text-stone-600">3 simple questions to help you learn and adjust—no judgment, just data.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-stone-800">Human-in-the-Loop Support</p>
                <p className="text-sm text-stone-600">Real coaching support when you need it—this isn't just an app.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-stone-700 mb-2">
            <strong>🎯 This is a pilot program</strong>
          </p>
          <p className="text-sm text-stone-600">
            We're testing this approach with a small group to learn what actually helps people build sustainable health habits. Your feedback will shape what we build next.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValidEmail(email)}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify Access
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-stone-200 text-center">
          <p className="text-sm text-stone-600 mb-3">
            Don't have access yet?
          </p>
          <a
            href={`mailto:eric.alan.boggs@gmail.com?subject=Summit Pilot Access Request&body=Hi Eric,%0D%0A%0D%0AI'd like to request access to the Summit Pilot program.%0D%0A%0D%0AMy email: ${encodeURIComponent(email || '')}%0D%0A%0D%0AWhy I'm interested:%0D%0A[Please share a bit about your health goals and why you'd like to join the pilot]%0D%0A%0D%0AThanks!`}
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium transition"
          >
            <Mail className="w-4 h-4" />
            Request Access
          </a>
          <p className="text-xs text-stone-500 mt-4">
            If approved, we'll send you a secure magic link to sign in.
          </p>
        </div>
      </div>
    </div>
  )
}
