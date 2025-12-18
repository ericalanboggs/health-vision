import { useState } from 'react'
import { sendMagicLink } from '../services/authService'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'

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

  if (sent) {
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
              setSent(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-stone-800 mb-2">
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
                Sending magic link...
              </>
            ) : (
              <>
                Send Magic Link
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-stone-200">
          <p className="text-xs text-stone-500 text-center">
            No password needed. We'll send you a secure link to sign in.
          </p>
        </div>
      </div>
    </div>
  )
}
