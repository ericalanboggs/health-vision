import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'
import { getProfile } from '../services/authService'
import { hasActiveSubscription } from '../services/subscriptionService'
import { Autorenew } from '@mui/icons-material'

export default function Home() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    const routeUser = (profileResult) => {
      const profile = profileResult?.data

      if (profileResult?.success && profile?.deleted_at) {
        console.log('Home: Account soft-deleted, navigating to welcome-back')
        navigate('/welcome-back', { replace: true })
      } else if (!profileResult?.success || !profile?.profile_completed) {
        console.log('Home: Navigating to profile-setup')
        navigate('/profile-setup', { replace: true })
      } else if (!profile.onboarding_completed) {
        console.log('Home: Onboarding not completed, navigating to /start')
        navigate('/start', { replace: true })
      } else if (!hasActiveSubscription(profile)) {
        console.log('Home: No active subscription, navigating to pricing')
        navigate('/pricing', { replace: true })
      } else {
        console.log('Home: Active subscription, navigating to dashboard')
        navigate('/dashboard', { replace: true })
      }
    }

    const checkAuthAndRedirect = async () => {
      // Prevent multiple simultaneous navigations
      if (redirecting) return
      setRedirecting(true)
      if (!supabase) {
        console.error('Supabase is not configured')
        navigate('/login', { replace: true })
        return
      }

      const hash = window.location.hash
      const search = window.location.search
      const hasHashToken = hash.includes('access_token')
      const hasCodeParam = search.includes('code=')
      const hasAuthToken = hasHashToken || hasCodeParam

      if (hasAuthToken) {
        // Auth callback - process authentication
        console.log('Home: Auth token detected', { hasHashToken, hasCodeParam, hash, search })

        // If we have a PKCE code, explicitly exchange it for a session
        if (hasCodeParam) {
          console.log('Home: PKCE code detected, triggering explicit exchange')
          // Supabase should auto-exchange, but let's give it time
          await new Promise(resolve => setTimeout(resolve, 2000))

          // Force a session refresh to trigger the exchange
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) {
              console.error('Home: Refresh session error:', refreshError)
            } else {
              console.log('Home: Session refresh result:', refreshData)
            }
          } catch (err) {
            console.error('Home: Exception during refresh:', err)
          }
        } else {
          // Hash token - give Supabase time to process
          await new Promise(resolve => setTimeout(resolve, 3000))
        }

        console.log('Home: Finished waiting for Supabase to process token')

        // Retry session check up to 7 times with progressive delays (for slow mobile connections)
        let session = null
        const delays = [0, 1000, 1500, 2000, 2500, 3000, 4000]
        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) {
            await new Promise(resolve => setTimeout(resolve, delays[i]))
          }

          const { data, error } = await supabase.auth.getSession()

          if (error) {
            console.error(`Session check attempt ${i + 1} error:`, error)
          }

          if (data.session) {
            session = data.session
            console.log(`Session found on attempt ${i + 1}`, { userId: session.user.id, email: session.user.email })
            break
          }

          console.log(`Session check attempt ${i + 1}: No session yet, waiting...`)
        }

        if (session) {
          // Clear the hash
          window.history.replaceState(null, '', '/')

          const profileResult = await getProfile(session.user.id)
          console.log('Home: Profile result:', profileResult)
          routeUser(profileResult)
        } else {
          // Auth failed after retries, go to login
          setError('Authentication failed. Please try again.')
          setTimeout(() => {
            navigate('/login', { replace: true })
          }, 2000)
        }
      } else {
        // No auth token - check existing session
        const { data } = await supabase.auth.getSession()

        if (data.session) {
          const profileResult = await getProfile(data.session.user.id)
          console.log('Home: Profile result:', profileResult)
          routeUser(profileResult)
        } else {
          // Not authenticated - go to login
          console.log('Home: No session, navigating to login')
          navigate('/login', { replace: true })
        }
      }
    }

    checkAuthAndRedirect()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
      <div className="text-center">
        <Autorenew className="w-12 h-12 text-summit-emerald animate-spin mx-auto mb-4" />
        <p className="text-stone-600">Loading...</p>
        {error && (
          <p className="text-sm text-red-500 mt-4">{error}</p>
        )}
      </div>
    </div>
  )
}
