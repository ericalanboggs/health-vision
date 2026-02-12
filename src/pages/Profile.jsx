import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Email, ArrowBack, Autorenew } from '@mui/icons-material'
import { getCurrentUser, getProfile, upsertProfile, softDeleteAccount } from '../services/authService'
import TopNav from '../components/TopNav'
import { formatPhoneToE164, isValidUSPhoneNumber } from '../utils/phoneFormatter'
import { Card, Input, Textarea, Checkbox, Button, Banner, Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@summit/design-system'

export default function Profile() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState(null)
  const [errors, setErrors] = useState({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    smsConsent: false,
    pilotReason: ''
  })
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

  // Headroom behavior for nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setHeaderVisible(false)
      } else {
        setHeaderVisible(true)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    const result = await getCurrentUser()
    if (result.success && result.user) {
      setUser(result.user)

      // Load profile data
      const profileResult = await getProfile(result.user.id)
      if (profileResult.success && profileResult.data) {
        setFormData({
          firstName: profileResult.data.first_name || '',
          lastName: profileResult.data.last_name || '',
          email: result.user.email || result.user.user_metadata?.email || '',
          phone: profileResult.data.phone || '',
          smsConsent: profileResult.data.sms_opt_in || false,
          pilotReason: profileResult.data.pilot_reason || ''
        })
      } else {
        setFormData(prev => ({
          ...prev,
          email: result.user.email || result.user.user_metadata?.email || ''
        }))
      }
    } else {
      // No user logged in - show demo data for Twilio verification
      setFormData({
        firstName: 'John',
        lastName: 'Doe',
        email: 'demo@example.com',
        phone: '(555) 123-4567',
        smsConsent: false,
        pilotReason: 'Example pilot reason'
      })
    }
    setLoading(false)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
    setSaved(false)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Mobile phone is required'
    } else if (!isValidUSPhoneNumber(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit US phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // If no user is logged in (demo mode for Twilio), show message
    if (!user) {
      setErrors({ submit: 'Please log in to save your profile.' })
      return
    }

    setSaving(true)

    try {
      // Save profile to database with formatted phone number
      const formattedPhone = formatPhoneToE164(formData.phone.trim())
      const result = await upsertProfile(user.id, {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formattedPhone,
        sms_opt_in: formData.smsConsent,
        pilot_reason: formData.pilotReason.trim(),
        profile_completed: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })

      if (result.success) {
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
        }, 3000)
      } else {
        setErrors({ submit: 'Failed to save profile. Please try again.' })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setErrors({ submit: 'An error occurred. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeleting(true)
    const result = await softDeleteAccount(user.id)
    if (result.success) {
      navigate('/login', { replace: true })
    } else {
      setDeleting(false)
      setShowDeleteModal(false)
      setErrors({ submit: 'Failed to delete account. Please try again.' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
        <TopNav />
        <div className="flex items-center justify-center py-12">
          <Autorenew className="w-8 h-8 animate-spin text-summit-emerald" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      <div className={`sticky top-0 z-10 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <TopNav />
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-text-muted hover:text-summit-forest transition-colors mb-4"
          >
            <ArrowBack className="h-5 w-5" />
            <span className="text-body">Back to Dashboard</span>
          </button>
          <h1 className="text-h1 text-summit-forest">Profile Settings</h1>
          <p className="text-body text-text-muted mt-2">
            Update your personal information and preferences.
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSave} className="space-y-6">
            {/* First Name */}
            <Input
              label={<>First Name <span className="text-feedback-error">*</span></>}
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="Enter your first name"
              errorMessage={errors.firstName}
              size="lg"
            />

            {/* Last Name */}
            <Input
              label={<>Last Name <span className="text-feedback-error">*</span></>}
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Enter your last name"
              errorMessage={errors.lastName}
              size="lg"
            />

            {/* Email (Read-only) */}
            <Input
              label="Email"
              type="email"
              value={formData.email}
              readOnly
              leftIcon={<Email className="w-5 h-5" />}
              size="lg"
              helperText="Email cannot be changed"
              className="bg-gray-50"
            />

            {/* Mobile Phone */}
            <Input
              label={<>Mobile Phone <span className="text-feedback-error">*</span></>}
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
              leftIcon={<Phone className="w-5 h-5" />}
              errorMessage={errors.phone}
              size="lg"
            />

            {/* SMS Consent */}
            <div className="bg-summit-mint/30 border border-summit-sage rounded-lg p-4">
              <Checkbox
                checked={formData.smsConsent}
                onChange={(e) => handleChange('smsConsent', e.target.checked)}
                label="Enable SMS Habit Reminders (Optional)"
                description="Get optional text reminders for your Summit habits. You'll receive one message per day, sent 15-30 minutes before your first habit, listing all your habits for that day. Message and data rates may apply. Reply STOP to unsubscribe anytime."
                shape="rounded"
                align="top"
                size="sm"
              />
            </div>

            {/* Pilot Reason */}
            <Textarea
              label={<>What drew you to Summit? <span className="text-sm font-normal text-stone-500">(Optional)</span></>}
              value={formData.pilotReason}
              onChange={(e) => handleChange('pilotReason', e.target.value)}
              rows={4}
              size="lg"
              placeholder="Tell us what motivated you to join and what you hope to achieve..."
            />

            {/* Submit Error */}
            {errors.submit && (
              <Banner variant="error">{errors.submit}</Banner>
            )}

            {/* Success Message */}
            {saved && (
              <Banner variant="success">Profile updated successfully!</Banner>
            )}

            {/* Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1"
                loading={saving}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>

        {user && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-sm text-feedback-error hover:underline"
            >
              Delete Account
            </button>
          </div>
        )}

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm">
          <ModalHeader>
            <ModalTitle>Are you sure?</ModalTitle>
            <ModalDescription>
              This will deactivate your account and cancel all SMS reminders and emails. You can reactivate your account at any time by logging back in.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleDeleteAccount}
              loading={deleting}
              disabled={deleting}
              className="!bg-feedback-error !hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </ModalFooter>
        </Modal>
      </main>
    </div>
  )
}
