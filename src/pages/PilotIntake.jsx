import { useState } from 'react'
import { signInWithGoogle } from '../services/authService'
import { Email, CheckCircle } from '@mui/icons-material'

export default function PilotIntake() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    const result = await signInWithGoogle()

    if (!result.success) {
      setError(result.error?.message || 'Failed to sign in with Google. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-summit-mint rounded-full flex items-center justify-center">
              <span className="text-4xl">🏔️</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-summit-forest mb-2">
            Summit Pilot Program
          </h1>

          <p className="text-stone-600 text-lg">
            A 3-week experiment in sustainable health change
          </p>
        </div>

        {/* Marketing Bullets */}
        <div className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-summit-forest mb-4">How It Works</h2>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-summit-mint rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-summit-emerald" />
              </div>
              <div>
                <p className="font-medium text-summit-forest">Define Your Health Vision</p>
                <p className="text-sm text-stone-600">Clarify what you actually want—not what you think you "should" do.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-summit-mint rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-summit-emerald" />
              </div>
              <div>
                <p className="font-medium text-summit-forest">Commit to 1-2 Small Habits Weekly</p>
                <p className="text-sm text-stone-600">No overwhelming lists. Just realistic experiments that fit your actual life.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-summit-mint rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-summit-emerald" />
              </div>
              <div>
                <p className="font-medium text-summit-forest">Get Gentle Reminders (SMS + Email)</p>
                <p className="text-sm text-stone-600">Nudges, not pressure. We remind you of what you chose—no guilt, no streaks.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-summit-mint rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-summit-emerald" />
              </div>
              <div>
                <p className="font-medium text-summit-forest">Reflect Weekly on What's Working</p>
                <p className="text-sm text-stone-600">3 simple questions to help you learn and adjust—no judgment, just data.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-summit-mint rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-summit-emerald" />
              </div>
              <div>
                <p className="font-medium text-summit-forest">Human-in-the-Loop Support</p>
                <p className="text-sm text-stone-600">Real coaching support when you need it—this isn't just an app.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-summit-mint/50 border border-summit-sage rounded-lg p-4 mb-6">
          <p className="text-sm text-summit-forest mb-2">
            <strong>This is a pilot program</strong>
          </p>
          <p className="text-sm text-stone-600">
            We're testing this approach with a small group to learn what actually helps people build sustainable health habits. Your feedback will shape what we build next.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-summit-forest bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mr-2" />
              Signing in...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-stone-600 mb-3">
            Don't have access yet?
          </p>
          <a
            href="mailto:eric.alan.boggs@gmail.com?subject=Summit Pilot Access Request&body=Hi Eric,%0D%0A%0D%0AI'd like to request access to the Summit Pilot program.%0D%0A%0D%0AWhy I'm interested:%0D%0A[Please share a bit about your health goals and why you'd like to join the pilot]%0D%0A%0D%0AThanks!"
            className="inline-flex items-center gap-2 text-summit-emerald hover:text-summit-forest font-medium transition"
          >
            <Email className="w-4 h-4" />
            Request Access
          </a>
        </div>
      </div>
    </div>
  )
}
