import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Person, Phone, Email, CheckCircle, Autorenew } from '@mui/icons-material'
import { getCurrentUser } from '../services/authService'
import { upsertProfile } from '../services/authService'
import { trackEvent } from '../lib/posthog'
import { formatPhoneToE164, isValidUSPhoneNumber } from '../utils/phoneFormatter'

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
    smsConsent: false,
    pilotReason: ''
  })

  useEffect(() => {
    loadUser()
  }, [])

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
      // Don't navigate - ProtectedRoute will handle auth
    }
    setLoading(false)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
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

    if (!formData.pilotReason.trim()) {
      newErrors.pilotReason = 'Please tell us why you\'re interested in the pilot'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
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
        trackEvent('profile_completed', {
          has_phone: !!formData.phone,
          sms_consent: formData.smsConsent
        })

        // Check if user has completed the health journey
        // If not, send to /start, otherwise to /dashboard
        navigate('/start')
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Autorenew className="w-8 h-8 animate-spin text-summit-emerald" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-summit-mint rounded-full flex items-center justify-center mx-auto mb-4">
              <Person className="w-8 h-8 text-summit-emerald" />
            </div>
            <h1 className="text-3xl font-bold text-summit-forest mb-2">
              Welcome to the Summit Pilot
            </h1>
            <p className="text-stone-600">
              Let's get your profile set up so we can support your health journey.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-summit-forest mb-2">
                First Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition ${
                  errors.firstName ? 'border-red-500' : 'border-stone-300'
                }`}
                placeholder="Enter your first name"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-summit-forest mb-2">
                Last Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition ${
                  errors.lastName ? 'border-red-500' : 'border-stone-300'
                }`}
                placeholder="Enter your last name"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>

            {/* Email (Read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-summit-forest mb-2">
                Email
              </label>
              <div className="relative">
                <Email className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  readOnly
                  className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg bg-stone-50 text-stone-600"
                />
              </div>
            </div>

            {/* Mobile Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-summit-forest mb-2">
                Mobile Phone <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition ${
                    errors.phone ? 'border-red-500' : 'border-stone-300'
                  }`}
                  placeholder="(555) 123-4567"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* SMS Consent - Optional */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="smsConsent"
                  checked={formData.smsConsent}
                  onChange={(e) => handleChange('smsConsent', e.target.checked)}
                  className="mt-1 w-5 h-5 text-summit-emerald rounded border-stone-300 focus:ring-summit-emerald cursor-pointer"
                />
                <div className="flex-1">
                  <label htmlFor="smsConsent" className="block text-sm font-semibold text-summit-forest mb-1 cursor-pointer">
                    Enable SMS Habit Reminders <span className="text-sm font-normal text-stone-500">(Optional)</span>
                  </label>
                  <p className="text-sm text-stone-700">
                    Get optional text reminders for your Summit habits. You'll receive one message per day, sent 15-30 minutes before your first habit, listing all your habits for that day. 
                    Message and data rates may apply. Reply STOP to unsubscribe anytime.
                  </p>
                </div>
              </div>
            </div>

            {/* Pilot Reason */}
            <div>
              <label htmlFor="pilotReason" className="block text-sm font-semibold text-summit-forest mb-2">
                Why are you interested in this pilot? <span className="text-red-600">*</span>
              </label>
              <textarea
                id="pilotReason"
                value={formData.pilotReason}
                onChange={(e) => handleChange('pilotReason', e.target.value)}
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none ${
                  errors.pilotReason ? 'border-red-500' : 'border-stone-300'
                }`}
                placeholder="Tell us what motivated you to join and what you hope to achieve..."
              />
              {errors.pilotReason && (
                <p className="mt-1 text-sm text-red-600">{errors.pilotReason}</p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-summit-emerald hover:bg-emerald-700 disabled:bg-summit-sage disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Autorenew className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Complete Profile
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
