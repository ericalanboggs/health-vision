import { useEffect, useState } from 'react'
import supabase from '../lib/supabase'

export default function AuthTest() {
  const [info, setInfo] = useState({})

  useEffect(() => {
    const checkAuth = async () => {
      const fullUrl = window.location.href
      const hash = window.location.hash
      
      // Parse hash params
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const tokenType = hashParams.get('token_type')
      const expiresIn = hashParams.get('expires_in')
      const type = hashParams.get('type')
      
      // Get current session
      const { data: sessionData } = await supabase.auth.getSession()
      
      // Get all hash params
      const allParams = {}
      for (const [key, value] of hashParams.entries()) {
        allParams[key] = value.length > 50 ? value.substring(0, 50) + '...' : value
      }
      
      setInfo({
        fullUrl,
        hash: hash.substring(0, 100) + '...',
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        tokenType,
        expiresIn,
        type,
        allParams: JSON.stringify(allParams, null, 2),
        accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'none',
        currentSession: sessionData.session ? 'Yes' : 'No',
        userEmail: sessionData.session?.user?.email || 'Not logged in'
      })
    }

    checkAuth()
  }, [])

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Auth Debug Info</h1>
        <div className="space-y-2 font-mono text-sm">
          <div><strong>Full URL:</strong> <span className="text-xs break-all">{info.fullUrl}</span></div>
          <div><strong>Hash:</strong> <span className="text-xs break-all">{info.hash || 'none'}</span></div>
          <div><strong>Has Access Token:</strong> {info.hasAccessToken ? '✅ Yes' : '❌ No'}</div>
          <div><strong>Has Refresh Token:</strong> {info.hasRefreshToken ? '✅ Yes' : '❌ No'}</div>
          <div><strong>Token Type:</strong> {info.tokenType || 'none'}</div>
          <div><strong>Type:</strong> {info.type || 'none'}</div>
          <div><strong>Expires In:</strong> {info.expiresIn || 'none'}</div>
          <div><strong>Access Token Preview:</strong> {info.accessTokenPreview}</div>
          <div className="pt-4 border-t">
            <strong>All Hash Parameters:</strong>
            <pre className="mt-2 p-2 bg-stone-100 rounded text-xs overflow-auto">{info.allParams}</pre>
          </div>
          <div className="pt-4 border-t">
            <strong>Current Session:</strong> {info.currentSession}
          </div>
          <div><strong>User Email:</strong> {info.userEmail}</div>
        </div>
      </div>
    </div>
  )
}
