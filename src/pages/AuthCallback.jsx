import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getProfile } from '../services/authService'
import { trackEvent } from '../lib/posthog'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing') // processing, success, error

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (!supabase) {
          console.error('Supabase is not configured')
          trackEvent('auth_callback_failed', { error: 'Supabase not configured' })
          setStatus('error')
          return
        }

        // Immediately capture URL before Gmail strips it
        const currentUrl = window.location.href
        const currentHash = window.location.hash
        const currentSearch = window.location.search
        console.log('AuthCallback - Full URL:', currentUrl)
        console.log('AuthCallback - Hash:', currentHash)
        console.log('AuthCallback - Search:', currentSearch)

        // Check for PKCE code in query params (used by mobile browsers)
        const queryParams = new URLSearchParams(currentSearch)
        const code = queryParams.get('code')
        
        if (code) {
          console.log('PKCE code found, letting Supabase handle exchange automatically...')
        }
        
        // Give Supabase time to automatically process the URL
        // detectSessionInUrl will handle PKCE code exchange automatically
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Retry session check multiple times with increasing delays
        let session = null
        const delays = [0, 1500, 2000, 2500, 3000] // 5 attempts with progressive delays
        
        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) {
            await new Promise(resolve => setTimeout(resolve, delays[i]))
          }
          
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error(`Session check attempt ${i + 1} error:`, error)
          }
          
          if (data?.session) {
            session = data.session
            console.log(`Session found on attempt ${i + 1}`)
            break
          }
          
          console.log(`Session check attempt ${i + 1}: No session yet`)
        }
        
        if (session) {
          trackEvent('user_authenticated', { 
            userId: session.user.id,
            email: session.user.email 
          })
          
          // Check if user has a profile (new vs returning user)
          const { data: profile } = await getProfile(session.user.id)
          
          // Route based on profile completion status
          let redirectPath = '/profile-setup' // Default to profile setup for new users
          
          if (profile && profile.first_name) {
            // User has completed profile setup, send to dashboard
            redirectPath = '/dashboard'
          }
          
          console.log('Auth callback: User has profile?', !!profile, 'Redirecting to:', redirectPath)
          
          setStatus('success')
          
          // Clear the hash/query and redirect appropriately
          window.history.replaceState(null, '', redirectPath)
          setTimeout(() => {
            navigate(redirectPath, { replace: true })
          }, 1500)
        } else {
          console.error('No session found after all retry attempts')
          trackEvent('auth_callback_failed', { error: 'No session found after retries' })
          setStatus('error')
        }
      } catch (error) {
        console.error('Error in auth callback:', error)
        trackEvent('auth_callback_error', { error: error.message })
        setStatus('error')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-stone-800 mb-3">
              Signing you in...
            </h1>
            <p className="text-stone-600">
              Please wait while we verify your magic link
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-stone-800 mb-3">
              Welcome back!
            </h1>
            <p className="text-stone-600">
              Redirecting you to your dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-stone-800 mb-3">
              Authentication Failed
            </h1>
            <p className="text-stone-600 mb-6">
              We couldn't verify your magic link. It may have expired or already been used.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
