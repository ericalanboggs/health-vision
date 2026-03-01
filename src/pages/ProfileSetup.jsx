import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Person, Phone, Email, Autorenew } from '@mui/icons-material'
import { getCurrentUser } from '../services/authService'
import { upsertProfile } from '../services/authService'
import { trackEvent } from '../lib/posthog'
import { formatPhoneToE164, isValidUSPhoneNumber, formatPhoneAsYouType } from '../utils/phoneFormatter'
import { Button, Input, Checkbox, Card } from '@summit/design-system'

export default function ProfileSetup() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    smsConsent: false
  })

  useEffect(() => {
    loadUser()
  }, [])

  // Warn user about unsaved data before leaving
  useEffect(() => {
    const hasUnsavedData = formData.firstName || formData.lastName || formData.phone

    const handleBeforeUnload = (e) => {
      if (hasUnsavedData && !saving) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formData, saving])

  const loadUser = async () => {
    const result = await getCurrentUser()
    console.log('ProfileSetup: getCurrentUser result:', result)
    if (result.success && result.user) {
      console.log('ProfileSetup: User email:', result.user.email)
      setUser(result.user)
      setFormData(prev => ({
        ...prev,
        email: result.user.email || result.user.user_metadata?.email || ''
      }))
      console.log('ProfileSetup: User loaded successfully')
    } else {
      console.error('ProfileSetup: Failed to load user, but ProtectedRoute should have caught this')
    }
    setLoading(false)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Prevent double-submit
    if (saving) return

    if (!validateForm()) {
      return
    }

    setSaving(true)

    try {
      const formattedPhone = formatPhoneToE164(formData.phone.trim())
      const result = await upsertProfile(user.id, {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formattedPhone,
        sms_opt_in: formData.smsConsent,
        profile_completed: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })

      if (result.success) {
        trackEvent('profile_completed', {
          has_phone: !!formData.phone,
          sms_consent: formData.smsConsent
        })

        navigate('/verify-phone')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <Autorenew className="w-8 h-8 animate-spin text-summit-emerald" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-summit-sage rounded-full flex items-center justify-center mx-auto mb-4">
              <Person className="w-8 h-8 text-summit-emerald" />
            </div>
            <h1 className="text-h1 text-summit-forest mb-2">
              Welcome to Summit!
            </h1>
            <p className="text-body text-text-secondary">
              Let's get your profile setup.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
              onChange={(e) => handleChange('phone', formatPhoneAsYouType(e.target.value))}
              placeholder="555-123-4567"
              leftIcon={<Phone className="w-5 h-5" />}
              errorMessage={errors.phone}
              size="lg"
            />

            {/* SMS Consent */}
            <div className="bg-summit-mint border border-summit-sage rounded-lg p-4">
              <Checkbox
                checked={formData.smsConsent}
                onChange={(e) => handleChange('smsConsent', e.target.checked)}
                label="Enable SMS Habit Reminders (Optional)"
                description="By checking this box, you consent to receive automated habit reminder and wellness text messages from Summit Health. Msg frequency varies. Msg & data rates may apply. Consent is not a condition of any purchase. Reply STOP to unsubscribe anytime, HELP for help."
                shape="rounded"
                align="top"
                size="sm"
              />
              <p className="text-xs text-stone-500 mt-2 ml-7">
                <Link to="/privacy" className="text-summit-emerald hover:underline">Privacy Policy</Link>
                {' & '}
                <Link to="/terms" className="text-summit-emerald hover:underline">Terms</Link>
              </p>
            </div>

            {/* Wellness Disclaimer */}
            <p className="text-xs text-text-tertiary text-center leading-relaxed">
              Summit provides wellness coaching and habit support — not medical advice.
              Please consult a healthcare provider for medical concerns.
            </p>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-feedback-error-light border border-feedback-error rounded-lg p-4">
                <p className="text-sm text-feedback-error">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {saving ? 'Saving...' : 'Continue →'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
