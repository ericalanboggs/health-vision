import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'
import { getProfile } from '../services/authService'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      if (!supabase) {
        console.error('Supabase is not configured')
        setDebugInfo('Configuration error - redirecting to pilot intake...')
        navigate('/pilot', { replace: true })
        return
      }

      const hash = window.location.hash
      const hasToken = hash.includes('access_token')
      
      if (hasToken) {
        // Magic link callback - process authentication
        console.log('Home: Magic link detected in URL hash')
        setDebugInfo('Processing magic link...')
        
        // Give Supabase more time to process the hash, especially on mobile
        // Supabase's detectSessionInUrl should automatically handle this
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log('Home: Finished waiting for Supabase to process hash')
        
        // Retry session check up to 3 times with delays (for slow mobile connections)
        let session = null
        for (let i = 0; i < 3; i++) {
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Error getting session:', error)
            setDebugInfo(`Authentication error: ${error.message}`)
          }
          
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
          // Clear the hash
          window.history.replaceState(null, '', '/')
          
          // Check if profile is complete
          const profileResult = await getProfile(session.user.id)
          
          console.log('Home: Profile result:', profileResult)
          console.log('Home: Profile completed?', profileResult.data?.profile_completed)
          
          if (profileResult.success && profileResult.data?.profile_completed) {
            // Profile complete - go to dashboard
            console.log('Home: Navigating to dashboard')
            navigate('/dashboard', { replace: true })
          } else {
            // Profile incomplete - go to profile setup
            console.log('Home: Navigating to profile-setup')
            navigate('/profile-setup', { replace: true })
          }
        } else {
          // Auth failed after retries, go to pilot intake
          setDebugInfo('Authentication failed. Please try again.')
          setTimeout(() => {
            navigate('/pilot', { replace: true })
          }, 2000)
        }
      } else {
        // No magic link - check existing session
        const { data } = await supabase.auth.getSession()
        
        if (data.session) {
          // Check if profile is complete
          const profileResult = await getProfile(data.session.user.id)
          
          console.log('Home: Profile result:', profileResult)
          console.log('Home: Profile completed?', profileResult.data?.profile_completed)
          
          if (profileResult.success && profileResult.data?.profile_completed) {
            // Profile complete - go to dashboard
            console.log('Home: Navigating to dashboard')
            navigate('/dashboard', { replace: true })
          } else {
            // Profile incomplete - go to profile setup
            console.log('Home: Navigating to profile-setup')
            navigate('/profile-setup', { replace: true })
          }
        } else {
          // Not authenticated - go to pilot intake
          console.log('Home: No session, navigating to pilot intake')
          navigate('/pilot', { replace: true })
        }
      }
    }

    checkAuthAndRedirect()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
        <p className="text-stone-600 mb-2">Redirecting...</p>
        {debugInfo && (
          <p className="text-sm text-stone-500 mt-4 max-w-md mx-auto">{debugInfo}</p>
        )}
      </div>
    </div>
  )
}
