import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithGoogle, signUpWithPassword, signInWithPassword } from '../services/authService'

export default function Login() {
  const navigate = useNavigate()
  const [emailLoading, setEmailLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('sign-in') // 'sign-in' or 'sign-up'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    const result = await signInWithGoogle()

    if (!result.success) {
      setError(result.error?.message || 'Failed to sign in with Google. Please try again.')
    }

    setGoogleLoading(false)
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setEmailLoading(true)
    setError(null)

    if (mode === 'sign-up') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        setEmailLoading(false)
        return
      }

      const result = await signUpWithPassword(email, password)

      if (!result.success) {
        setError(result.error?.message || 'Failed to sign up. Please try again.')
      } else if (result.needsConfirmation) {
        setConfirmationSent(true)
      } else {
        navigate('/')
      }
    } else {
      const result = await signInWithPassword(email, password)

      if (!result.success) {
        setError(result.error?.message || 'Invalid email or password.')
      } else {
        navigate('/')
      }
    }

    setEmailLoading(false)
  }

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img src="/summit-logo.svg" alt="Summit Health" className="h-10" />
            </div>
            <h1 className="text-2xl font-bold text-summit-forest mb-3">
              Check your email
            </h1>
            <p className="text-stone-600 mb-6">
              We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account, then come back to sign in.
            </p>
            <button
              onClick={() => {
                setConfirmationSent(false)
                setMode('sign-in')
                setPassword('')
              }}
              className="text-sm text-summit-emerald hover:text-emerald-700 font-medium transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/summit-logo.svg" alt="Summit Health" className="h-10" />
          </div>

          <h1 className="text-3xl font-bold text-summit-forest mb-2">
            Welcome to Summit
          </h1>

          <p className="text-stone-600">
            {mode === 'sign-in' ? 'Sign in to continue your health journey' : 'Create your account to get started'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition"
              placeholder={mode === 'sign-up' ? 'At least 6 characters' : 'Your password'}
            />
          </div>
          <button
            type="submit"
            disabled={emailLoading || googleLoading}
            className="w-full px-4 py-3 bg-summit-emerald hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm disabled:bg-emerald-400 disabled:cursor-not-allowed transition"
          >
            {emailLoading ? (
              <span className="flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {mode === 'sign-in' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'sign-in' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Mode Toggle */}
        <p className="text-center text-sm text-stone-600 mb-6">
          {mode === 'sign-in' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => { setMode('sign-up'); setError(null) }}
                className="text-summit-emerald hover:text-emerald-700 font-medium transition-colors"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('sign-in'); setError(null) }}
                className="text-summit-emerald hover:text-emerald-700 font-medium transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-stone-500">or</span>
          </div>
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleSignIn}
          disabled={emailLoading || googleLoading}
          className="w-full flex items-center justify-center px-4 py-3 border border-stone-300 rounded-lg shadow-sm text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 disabled:bg-stone-100 disabled:cursor-not-allowed transition"
        >
          {googleLoading ? (
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

        {/* TODO: Enable Apple Sign In when Apple Developer account is set up */}
      </div>
    </div>
  )
}
