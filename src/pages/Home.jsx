import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const hash = window.location.hash
      const hasToken = hash.includes('access_token')
      
      console.log('=== HOME PAGE AUTH CHECK ===')
      console.log('Has token in URL:', hasToken)
      
      if (hasToken) {
        setDebugInfo('Processing magic link...')
        console.log('Magic link detected, waiting for Supabase to process...')
        
        // Supabase client should automatically detect and process the hash
        // Give it more time to ensure session is persisted
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Now check if session was created
        const { data } = await supabase.auth.getSession()
        console.log('Session after processing:', !!data.session)
        console.log('Session data:', data.session)
        
        if (data.session) {
          console.log('✅ Authentication successful!')
          console.log('User:', data.session.user.email)
          setDebugInfo('Success! Redirecting to dashboard...')
          
          // Don't clear hash yet - let it persist for a moment
          // Wait a bit more to ensure session is saved to localStorage
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Verify session one more time before redirecting
          const { data: verifyData } = await supabase.auth.getSession()
          console.log('Session verified before redirect:', !!verifyData.session)
          
          if (verifyData.session) {
            // Clear the hash
            window.history.replaceState(null, '', '/')
            navigate('/dashboard', { replace: true })
          } else {
            console.error('Session lost before redirect!')
            setDebugInfo('Session lost. Please try again.')
            setTimeout(() => navigate('/login', { replace: true }), 2000)
          }
        } else {
          console.error('❌ No session created')
          setDebugInfo('Authentication failed. Redirecting to login...')
          setTimeout(() => {
            navigate('/login', { replace: true })
          }, 2000)
        }
      } else {
        // No token in URL, check if already authenticated
        console.log('No token in URL, checking existing session...')
        const { data } = await supabase.auth.getSession()
        
        if (data.session) {
          console.log('Already authenticated')
          navigate('/dashboard', { replace: true })
        } else {
          console.log('Not authenticated')
          navigate('/login', { replace: true })
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
