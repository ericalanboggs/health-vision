import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getProfile } from '../services/authService'
import { trackEvent } from '../lib/posthog'
import { Autorenew, Cancel } from '@mui/icons-material'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing') // processing, error

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
        const delays = [0, 1500, 2000, 2500, 3000, 3500, 4000] // 7 attempts with progressive delays (up to 16.5s total)

        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) {
            await new Promise(resolve => setTimeout(resolve, delays[i]))
          }

          const { data, error } = await supabase.auth.getSession()

          if (error) {
            console.error(`Session check attempt ${i + 1} error:`, error)
            trackEvent('auth_callback_session_error', {
              attempt: i + 1,
              error: error.message
            })
          }

          if (data?.session) {
            session = data.session
            console.log(`Session found on attempt ${i + 1}`, {
              userId: session.user.id,
              email: session.user.email
            })
            trackEvent('auth_callback_session_found', {
              attempt: i + 1,
              totalWaitTime: delays.slice(0, i + 1).reduce((a, b) => a + b, 0) + 2000
            })
            break
          }

          console.log(`Session check attempt ${i + 1}: No session yet, waiting...`)
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

          // Clear the hash/query and redirect appropriately
          window.history.replaceState(null, '', redirectPath)
          navigate(redirectPath, { replace: true })
        } else {
          console.error('No session found after all retry attempts')
          console.error('Debug info:', {
            hasCode: !!code,
            currentUrl,
            userAgent: navigator.userAgent
          })
          trackEvent('auth_callback_failed', {
            error: 'No session found after retries',
            hasCode: !!code,
            attempts: delays.length,
            userAgent: navigator.userAgent
          })
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

  // Consistent loading screen
  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <div className="text-center">
          <Autorenew className="w-12 h-12 text-summit-emerald animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Cancel className="w-10 h-10 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-summit-forest mb-3">
          Authentication Failed
        </h1>
        <p className="text-stone-600 mb-6">
          We couldn't complete sign in. Please try again.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-summit-emerald hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition"
        >
          Back to Login
        </button>
      </div>
    </div>
  )
}
