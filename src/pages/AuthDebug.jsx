import { useState } from 'react'
import { sendMagicLink, checkPilotAccess, getCurrentUser } from '../services/authService'
import { supabase } from '../lib/supabase'

export default function AuthDebug() {
  const [email, setEmail] = useState('')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    const diagnostics = {}

    // 1. Check Supabase config
    diagnostics.supabaseConfigured = !!supabase
    diagnostics.supabaseUrl = import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set'
    diagnostics.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'

    // 2. Check pilot access
    if (email) {
      diagnostics.pilotAccess = await checkPilotAccess(email)
    }

    // 3. Check current user
    const { user, session } = await getCurrentUser()
    diagnostics.currentUser = user?.email || 'No user'
    diagnostics.hasSession = !!session

    // 4. Test magic link (without sending)
    if (email && diagnostics.supabaseConfigured) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
        diagnostics.magicLinkTest = error ? `Error: ${error.message}` : 'Success'
      } catch (err) {
        diagnostics.magicLinkTest = `Exception: ${err.message}`
      }
    }

    // 5. Environment info
    diagnostics.currentOrigin = window.location.origin
    diagnostics.userAgent = navigator.userAgent

    setResults(diagnostics)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-summit-forest mb-6">Auth Debug Tool</h1>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-summit-forest mb-4">Test Email</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mkatemcnamara@gmail.com"
              className="flex-1 px-4 py-2 border border-stone-300 rounded-lg"
            />
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="bg-summit-emerald hover:bg-emerald-700 disabled:bg-stone-300 text-white font-semibold px-6 py-2 rounded-lg"
            >
              {loading ? 'Testing...' : 'Run Diagnostics'}
            </button>
          </div>
        </div>

        {Object.keys(results).length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-summit-forest mb-4">Diagnostic Results</h2>
            <div className="space-y-3">
              {Object.entries(results).map(([key, value]) => (
                <div key={key} className="border-l-4 border-summit-emerald pl-4">
                  <div className="font-medium text-summit-forest">{key}:</div>
                  <div className="text-stone-600">{JSON.stringify(value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-summit-forest mb-2">Common Issues:</h3>
          <ul className="text-sm text-stone-600 space-y-1 list-disc list-inside">
            <li>Supabase environment variables not set in production</li>
            <li>Email redirect URL doesn't match deployed app URL</li>
            <li>Supabase email provider not configured</li>
            <li>Auth callback URL not set in Supabase dashboard</li>
            <li>Email going to spam folder</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
