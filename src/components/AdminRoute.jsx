import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import { Autorenew } from '@mui/icons-material'

const ADMIN_EMAILS = [
  'eric.alan.boggs@gmail.com',
  'eric@summithealth.app',
]

export default function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { success, user } = await getCurrentUser()

    if (success && user && ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      setIsAdmin(true)
    } else {
      setIsAdmin(false)
    }

    setLoading(false)
  }

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

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
