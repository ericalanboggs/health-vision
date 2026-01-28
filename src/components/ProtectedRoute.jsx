import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentUser, updateLastLogin } from '../services/authService'
import { Autorenew } from '@mui/icons-material'

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      console.log('ProtectedRoute: Checking auth...')
      const { user } = await getCurrentUser()
      console.log('ProtectedRoute: User:', user)

      if (user) {
        // Update last login timestamp
        await updateLastLogin(user.id, user.email)
      }

      setUser(user)
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <div className="text-center">
          <Autorenew className="w-12 h-12 text-summit-emerald animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
