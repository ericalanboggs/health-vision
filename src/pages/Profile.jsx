import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, Mail, CheckCircle, Loader2, ArrowLeft } from 'lucide-react'
import { getCurrentUser, getProfile, upsertProfile } from '../services/authService'
import TopNav from '../components/TopNav'

export default function Profile() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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
    } else {
      const phoneRegex = /^[\d\s\-\(\)]+$/
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number'
      }
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
      const result = await upsertProfile(user.id, {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone.trim(),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
        <TopNav />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      <TopNav />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 font-medium transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-stone-900">Profile Settings</h1>
          <p className="text-stone-600 mt-2">
            Update your personal information and preferences.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8">
          <form onSubmit={handleSave} className="space-y-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-stone-900 mb-2">
                First Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${
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
              <label htmlFor="lastName" className="block text-sm font-semibold text-stone-900 mb-2">
                Last Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${
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
              <label htmlFor="email" className="block text-sm font-semibold text-stone-900 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  readOnly
                  className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg bg-stone-50 text-stone-600"
                />
              </div>
              <p className="mt-1 text-xs text-stone-500">Email cannot be changed</p>
            </div>

            {/* Mobile Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-stone-900 mb-2">
                Mobile Phone <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition ${
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
                  className="mt-1 w-5 h-5 text-green-600 rounded border-stone-300 focus:ring-green-500 cursor-pointer"
                />
                <div className="flex-1">
                  <label htmlFor="smsConsent" className="block text-sm font-semibold text-stone-900 mb-1 cursor-pointer">
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
              <label htmlFor="pilotReason" className="block text-sm font-semibold text-stone-900 mb-2">
                Why are you interested in this pilot? <span className="text-sm font-normal text-stone-500">(Optional)</span>
              </label>
              <textarea
                id="pilotReason"
                value={formData.pilotReason}
                onChange={(e) => handleChange('pilotReason', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
                placeholder="Tell us what motivated you to join and what you hope to achieve..."
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}

            {/* Success Message */}
            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">Profile updated successfully!</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
