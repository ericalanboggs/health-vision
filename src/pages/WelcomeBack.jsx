import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Autorenew } from '@mui/icons-material'
import { getCurrentUser, getProfile, upsertProfile, signOut } from '../services/authService'
import { Card, Button } from '@summit/design-system'

export default function WelcomeBack() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [reactivating, setReactivating] = useState(false)
  const [user, setUser] = useState(null)
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    const load = async () => {
      const result = await getCurrentUser()
      if (!result.success || !result.user) {
        navigate('/login', { replace: true })
        return
      }
      setUser(result.user)
      const profile = await getProfile(result.user.id)
      if (profile.success && profile.data) {
        if (!profile.data.deleted_at) {
          navigate('/dashboard', { replace: true })
          return
        }
        setFirstName(profile.data.first_name || '')
      }
      setLoading(false)
    }
    load()
  }, [navigate])

  const handleReactivate = async () => {
    setReactivating(true)
    const result = await upsertProfile(user.id, { deleted_at: null, sms_opt_in: false })
    if (result.success) {
      navigate('/dashboard', { replace: true })
    } else {
      setReactivating(false)
    }
  }

  const handleDecline = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <Autorenew className="w-12 h-12 text-summit-emerald animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <h1 className="text-h1 text-summit-forest mb-2">
          Welcome back{firstName ? `, ${firstName}` : ''}!
        </h1>
        <p className="text-body text-text-muted mb-8">
          Your account was deactivated. Would you like to reactivate it?
        </p>
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleReactivate}
            loading={reactivating}
            disabled={reactivating}
          >
            Reactivate My Account
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleDecline}
            disabled={reactivating}
          >
            No Thanks
          </Button>
        </div>
      </Card>
    </div>
  )
}
