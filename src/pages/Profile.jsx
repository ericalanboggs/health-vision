import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Phone, Email, Autorenew } from '@mui/icons-material'
import { getCurrentUser, getProfile, upsertProfile, softDeleteAccount } from '../services/authService'
import { createPortalSession, getTierDisplayName, hasActiveSubscription } from '../services/subscriptionService'
import { formatPhoneToE164, isValidUSPhoneNumber } from '../utils/phoneFormatter'
import { Card, Input, Textarea, Checkbox, Button, Banner, Tag, Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@summit/design-system'

export default function Profile() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const [user, setUser] = useState(null)
  const [errors, setErrors] = useState({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const [managingSubscription, setManagingSubscription] = useState(false)
  const [editingPrefs, setEditingPrefs] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savedPrefs, setSavedPrefs] = useState(false)
  const [followupTime, setFollowupTime] = useState('17:00')

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
        setProfileData(profileResult.data)
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
        setEditing(false)
        // Reload profile data so read view reflects changes
        await loadUserProfile()
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
      <div className="flex items-center justify-center py-20">
        <Autorenew className="w-8 h-8 animate-spin text-summit-emerald" />
      </div>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h1 className="text-h1 text-summit-forest">Profile Settings</h1>
          <p className="text-body text-text-muted mt-2">
            Update your personal information and preferences.
          </p>
        </div>

        <Card className="p-8">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <h2 className="text-h3 text-summit-forest mb-4">Personal Information</h2>

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

              {/* Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    setEditing(false)
                    setErrors({})
                    // Reset form to saved profile data
                    if (profileData) {
                      setFormData({
                        firstName: profileData.first_name || '',
                        lastName: profileData.last_name || '',
                        email: user?.email || user?.user_metadata?.email || '',
                        phone: profileData.phone || '',
                        smsConsent: profileData.sms_opt_in || false,
                        pilotReason: profileData.pilot_reason || ''
                      })
                    }
                  }}
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
          ) : (
            <div>
              <h2 className="text-h3 text-summit-forest mb-4">Personal Information</h2>

              {/* Success Message */}
              {saved && (
                <div className="mb-4">
                  <Banner variant="success">Profile updated successfully!</Banner>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-body-sm text-text-muted">Name</p>
                    <p className="text-body font-medium text-summit-forest">
                      {formData.firstName} {formData.lastName}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-body-sm text-text-muted">Email</p>
                  <p className="text-body font-medium text-summit-forest">{formData.email}</p>
                </div>

                <div>
                  <p className="text-body-sm text-text-muted">Mobile Phone</p>
                  <p className="text-body font-medium text-summit-forest">{formData.phone || 'Not set'}</p>
                </div>

                <div>
                  <p className="text-body-sm text-text-muted">SMS Reminders</p>
                  <p className="text-body font-medium text-summit-forest">
                    {formData.smsConsent ? 'Enabled' : 'Disabled'}
                  </p>
                </div>

                {formData.pilotReason && (
                  <div>
                    <p className="text-body-sm text-text-muted">What drew you to Summit</p>
                    <p className="text-body text-summit-forest">{formData.pilotReason}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setEditing(true)}
                >
                  Update
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Habit Preferences */}
        {user && (
          <Card className="mt-8 p-8">
            {editingPrefs ? (
              <div>
                <h2 className="text-h3 text-summit-forest mb-4">Habit Preferences</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-body-sm font-semibold text-summit-forest mb-1">
                      End-of-Day Follow-up Time
                    </label>
                    <p className="text-body-sm text-text-muted mb-2">
                      We'll send you an SMS at this time to check in on your habits for the day.
                      {!formData.smsConsent && (
                        <span className="block mt-1 text-feedback-warning">
                          Enable SMS in Personal Information above to receive follow-ups.
                        </span>
                      )}
                    </p>
                    <input
                      type="time"
                      value={followupTime}
                      onChange={(e) => setFollowupTime(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-body bg-white focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-4">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setEditingPrefs(false)
                      // Reset to saved value
                      setFollowupTime(profileData?.followup_time || '17:00')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    loading={savingPrefs}
                    disabled={savingPrefs}
                    onClick={async () => {
                      setSavingPrefs(true)
                      // TODO: save to backend once column exists
                      setSavedPrefs(true)
                      setEditingPrefs(false)
                      setSavingPrefs(false)
                      setTimeout(() => setSavedPrefs(false), 3000)
                    }}
                  >
                    {savingPrefs ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-h3 text-summit-forest mb-4">Habit Preferences</h2>

                {savedPrefs && (
                  <div className="mb-4">
                    <Banner variant="success">Preferences updated successfully!</Banner>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <p className="text-body-sm text-text-muted">End-of-Day Follow-up</p>
                    <p className="text-body font-medium text-summit-forest">
                      {new Date(`2000-01-01T${followupTime}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setEditingPrefs(true)}
                  >
                    Update
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Subscription Info */}
        {user && (
          <Card className="mt-8 p-8">
            <h2 className="text-h3 text-summit-forest mb-4">Subscription</h2>
            {profileData?.subscription_status ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-body text-text-secondary">Plan:</span>
                  <span className="text-body font-semibold text-summit-forest">
                    Summit {getTierDisplayName(profileData.subscription_tier)}
                  </span>
                  <Tag
                    variant={
                      profileData.subscription_status === 'active' ? 'success'
                        : profileData.subscription_status === 'trialing' ? 'info'
                        : profileData.subscription_status === 'past_due' ? 'warning'
                        : 'error'
                    }
                    size="sm"
                  >
                    {profileData.subscription_status === 'active' ? 'Active'
                      : profileData.subscription_status === 'trialing' ? 'Free Trial'
                      : profileData.subscription_status === 'past_due' ? 'Past Due'
                      : profileData.subscription_status === 'canceled' ? 'Canceled'
                      : profileData.subscription_status}
                  </Tag>
                </div>

                {profileData.subscription_status === 'trialing' && profileData.trial_ends_at && (
                  <p className="text-body-sm text-text-muted">
                    Trial ends {new Date(profileData.trial_ends_at).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                )}

                <Button
                  variant="secondary"
                  size="md"
                  onClick={async () => {
                    setManagingSubscription(true)
                    const result = await createPortalSession()
                    if (result.success && result.url) {
                      window.location.href = result.url
                    } else {
                      setErrors({ submit: 'Failed to open subscription management. Please try again.' })
                      setManagingSubscription(false)
                    }
                  }}
                  loading={managingSubscription}
                  disabled={managingSubscription}
                >
                  Manage Subscription
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-body text-text-muted">No active subscription.</p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/pricing')}
                >
                  View Plans
                </Button>
              </div>
            )}
          </Card>
        )}

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
  )
}
