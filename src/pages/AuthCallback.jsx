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

        // Give Supabase time to automatically process the URL
        // Mobile browsers (especially Gmail app) need more time
        await new Promise(resolve => setTimeout(resolve, 2500))

        // Check if we have a hash with auth tokens (most common)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        // Also check query params (some mobile browsers use this)
        const queryParams = new URLSearchParams(window.location.search)
        const queryAccessToken = queryParams.get('access_token')
        const queryRefreshToken = queryParams.get('refresh_token')

        const token = accessToken || queryAccessToken
        const refresh = refreshToken || queryRefreshToken

        if (token) {
          // Set the session from the tokens with retry logic for mobile
          let sessionData = null
          let sessionError = null
          
          for (let attempt = 0; attempt < 3; attempt++) {
            const { data, error } = await supabase.auth.setSession({
              access_token: token,
              refresh_token: refresh,
            })
            
            if (data?.session) {
              sessionData = data
              break
            }
            
            sessionError = error
            
            // Wait before retrying (mobile browsers need this)
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }

          if (sessionError && !sessionData) {
            console.error('Auth callback error after retries:', sessionError)
            trackEvent('auth_callback_failed', { error: sessionError.message })
            setStatus('error')
            return
          }
          
          const data = sessionData

          if (data.session) {
            trackEvent('user_authenticated', { 
              userId: data.session.user.id,
              email: data.session.user.email 
            })
            
            // Check if user has a profile (new vs returning user)
            const { data: profile } = await getProfile(data.session.user.id)
            
            // Route based on whether user has completed onboarding
            let redirectPath = '/start' // Default to onboarding for new users
            if (profile && profile.first_name) {
              // User has completed profile setup, go to dashboard
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
            setStatus('error')
          }
        } else {
          // No tokens in URL - retry session check (Supabase might still be processing)
          let session = null
          for (let i = 0; i < 3; i++) {
            const { data } = await supabase.auth.getSession()
            if (data.session) {
              session = data.session
              break
            }
            // Wait before retrying
            if (i < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
          
          if (session) {
            trackEvent('user_authenticated', { 
              userId: session.user.id,
              email: session.user.email 
            })
            
            // Check if user has a profile (new vs returning user)
            const { data: profile } = await getProfile(session.user.id)
            
            // Route based on whether user has completed onboarding
            let redirectPath = '/start' // Default to onboarding for new users
            if (profile && profile.first_name) {
              // User has completed profile setup, go to dashboard
              redirectPath = '/dashboard'
            }
            
            console.log('Auth callback retry: User has profile?', !!profile, 'Redirecting to:', redirectPath)
            
            setStatus('success')
            setTimeout(() => {
              navigate(redirectPath, { replace: true })
            }, 1500)
          } else {
            console.error('No tokens found and no existing session')
            trackEvent('auth_callback_failed', { error: 'No tokens or session found' })
            setStatus('error')
          }
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
