import { useState } from 'react'
import { sendMagicLink, signInWithGoogle } from '../services/authService'
import { ArrowForward, CheckCircle } from '@mui/icons-material'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await sendMagicLink(email)

    if (result.success) {
      setSent(true)
    } else {
      setError(result.error?.message || 'Failed to send magic link. Please try again.')
    }

    setLoading(false)
  }

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    const result = await signInWithGoogle()

    if (!result.success) {
      setError(result.error?.message || 'Failed to sign in with Google. Please try again.')
    }

    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-summit-mint rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-summit-emerald" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-summit-forest mb-3">
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
              setSent(false)
              setEmail('')
            }}
            className="mt-6 text-sm text-summit-emerald hover:text-summit-forest font-medium"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-summit-mint rounded-full flex items-center justify-center">
              <span className="text-4xl">🏔️</span>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-summit-forest mb-2">
            Welcome to Summit
          </h1>
          
          <p className="text-stone-600">
            Sign in with your email to continue your health journey
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
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-transparent outline-none transition"
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
            className="w-full bg-summit-emerald hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Send Magic Link
                <ArrowForward className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4">
          <p className="text-xs text-stone-500 text-center">
            No password needed. We'll send you a secure link to sign in.
          </p>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-stone-500">Or continue with</span>
            </div>
          </div>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center px-4 py-3 border border-stone-300 rounded-lg shadow-sm text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 disabled:bg-stone-100 disabled:cursor-not-allowed transition"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}
