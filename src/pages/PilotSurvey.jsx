import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Autorenew, CheckCircle, RateReview, Lightbulb, Build, AttachMoney, FormatQuote, Chat } from '@mui/icons-material'
import { savePilotFeedback, getPilotFeedback } from '../services/pilotFeedbackService'
import { trackEvent } from '../lib/posthog'
import { Button, Card } from '@summit/design-system'

const VALUE_LABELS = [
  'Not valuable',
  'Slightly valuable',
  'Moderately valuable',
  'Very valuable',
  'Extremely valuable'
]

export default function PilotSurvey() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [existingFeedback, setExistingFeedback] = useState(null)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    overall_value: 3,
    favorite_aspect: '',
    aha_moments: '',
    improvements: '',
    price_slider: 10,
    price_explanation: '',
    testimonial_text: '',
    testimonial_permission: '',
    testimonial_name: '',
    additional_feedback: ''
  })

  useEffect(() => {
    loadExistingFeedback()
    trackEvent('pilot_survey_viewed')
  }, [])

  const loadExistingFeedback = async () => {
    setLoading(true)
    const { success, data } = await getPilotFeedback()

    if (success && data) {
      setExistingFeedback(data)
      setFormData({
        overall_value: data.overall_value || 3,
        favorite_aspect: data.favorite_aspect || '',
        aha_moments: data.aha_moments || '',
        improvements: data.improvements || '',
        price_slider: data.price_slider ?? 10,
        price_explanation: data.price_explanation || '',
        testimonial_text: data.testimonial_text || '',
        testimonial_permission: data.testimonial_permission || '',
        testimonial_name: data.testimonial_name || '',
        additional_feedback: data.additional_feedback || ''
      })
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

    // Required: overall value must be selected (1-5)
    if (!formData.overall_value || formData.overall_value < 1 || formData.overall_value > 5) {
      newErrors.overall_value = 'Please rate the overall value'
    }

    // Testimonial name required if permission is 'named'
    if (formData.testimonial_permission === 'named' && !formData.testimonial_name.trim()) {
      newErrors.testimonial_name = 'Please provide a name for the testimonial'
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
    trackEvent('pilot_survey_submit_started')

    try {
      const result = await savePilotFeedback(formData)

      if (result.success) {
        trackEvent('pilot_survey_submitted', {
          overall_value: formData.overall_value,
          price_slider: formData.price_slider,
          has_testimonial: !!formData.testimonial_text,
          testimonial_permission: formData.testimonial_permission
        })
        setSubmitted(true)
      } else {
        setErrors({ submit: 'Failed to save feedback. Please try again.' })
      }
    } catch (error) {
      console.error('Error submitting pilot feedback:', error)
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-summit-sage rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-summit-emerald" />
          </div>
          <h1 className="text-h2 text-summit-forest mb-3">
            Thank you!
          </h1>
          <p className="text-body text-text-secondary mb-6">
            Thanks again for helping shape Summit.
            We'll share what we learn and what's coming next.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-summit-sage rounded-full flex items-center justify-center mx-auto mb-4">
            <RateReview className="w-8 h-8 text-summit-emerald" />
          </div>
          <h1 className="text-h1 text-summit-forest mb-2">
            Pilot Feedback Survey
          </h1>
          <p className="text-body text-text-secondary max-w-md mx-auto">
            Thanks for being part of the Summit pilot.
            This should take ~5 minutes. Your feedback directly shapes what we build next.
          </p>
          {existingFeedback && (
            <p className="text-sm text-summit-emerald mt-3">
              You've already submitted feedback. You can update your responses below.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Overall Value */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-summit-mint rounded-lg">
                <CheckCircle className="w-5 h-5 text-summit-emerald" />
              </div>
              <h2 className="text-lg font-semibold text-summit-forest">
                Overall Value
              </h2>
            </div>

            <label className="block text-base font-medium text-summit-forest mb-3">
              Overall, how valuable was Summit for you during the pilot? <span className="text-feedback-error">*</span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChange('overall_value', value)}
                  className={`
                    flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all
                    ${formData.overall_value === value
                      ? 'bg-summit-emerald text-white border-summit-emerald'
                      : 'bg-white text-summit-forest border-summit-sage hover:border-summit-emerald'
                    }
                  `}
                >
                  <span className="block text-lg mb-1">{value}</span>
                  <span className="text-xs opacity-80">{VALUE_LABELS[value - 1]}</span>
                </button>
              ))}
            </div>
            {errors.overall_value && (
              <p className="text-sm text-feedback-error mt-2">{errors.overall_value}</p>
            )}
          </Card>

          {/* Section 2: Favorite Aspect */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-summit-mint rounded-lg">
                <Lightbulb className="w-5 h-5 text-summit-emerald" />
              </div>
              <h2 className="text-lg font-semibold text-summit-forest">
                Favorite Aspect
              </h2>
            </div>

            <label className="block text-base font-medium text-summit-forest mb-2">
              What was your favorite or most valuable aspect of the pilot?
            </label>
            <p className="text-sm text-text-secondary mb-3">
              A feature, workflow, insight, or moment that stood out.
            </p>
            <textarea
              value={formData.favorite_aspect}
              onChange={(e) => handleChange('favorite_aspect', e.target.value)}
              className="w-full h-28 p-4 border border-summit-sage rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none bg-white text-summit-forest"
              placeholder="The weekly reflections helped me notice patterns I didn't see before..."
            />
          </Card>

          {/* Section 3: Aha Moments */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-summit-forest">
                Insights & "Aha" Moments
              </h2>
            </div>

            <label className="block text-base font-medium text-summit-forest mb-2">
              Did you have any "aha" moments or meaningful lessons while using Summit?
            </label>
            <textarea
              value={formData.aha_moments}
              onChange={(e) => handleChange('aha_moments', e.target.value)}
              className="w-full h-28 p-4 border border-amber-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none bg-white text-summit-forest"
              placeholder="I realized that my morning routine sets the tone for my entire day..."
            />
          </Card>

          {/* Section 4: Improvements */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-sky-100 rounded-lg">
                <Build className="w-5 h-5 text-sky-600" />
              </div>
              <h2 className="text-lg font-semibold text-summit-forest">
                Gaps & Future Features
              </h2>
            </div>

            <label className="block text-base font-medium text-summit-forest mb-2">
              What, if anything, felt missing or could be improved?
            </label>
            <p className="text-sm text-text-secondary mb-3">
              This could be a feature, clarity issue, or something you expected but didn't see.
            </p>
            <textarea
              value={formData.improvements}
              onChange={(e) => handleChange('improvements', e.target.value)}
              className="w-full h-28 p-4 border border-sky-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none bg-white text-summit-forest"
              placeholder="I wish I could track multiple health goals at once..."
            />
          </Card>

          {/* Section 5: Pricing */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <AttachMoney className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-summit-forest">
                Pricing & Willingness to Pay
              </h2>
            </div>

            <label className="block text-base font-medium text-summit-forest mb-3">
              Based on your experience, how much would you personally be willing to pay for Summit as it exists today?
            </label>

            <div className="bg-summit-mint/50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm text-text-secondary mb-2">
                <span>$0</span>
                <span className="font-semibold text-summit-forest text-lg">
                  ${formData.price_slider}/month
                </span>
                <span>$25</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={formData.price_slider}
                onChange={(e) => handleChange('price_slider', parseInt(e.target.value))}
                className="w-full h-2 bg-summit-sage rounded-lg appearance-none cursor-pointer accent-summit-emerald"
              />
            </div>

            <label className="block text-base font-medium text-summit-forest mb-2">
              What influenced that number?
            </label>
            <textarea
              value={formData.price_explanation}
              onChange={(e) => handleChange('price_explanation', e.target.value)}
              className="w-full h-24 p-4 border border-summit-sage rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none bg-white text-summit-forest"
              placeholder="I've tried other apps that cost more but don't actually help me stick to habits..."
            />
          </Card>

          {/* Section 6: Testimonial */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FormatQuote className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-summit-forest">
                Testimonial <span className="text-sm font-normal text-text-secondary">(Optional)</span>
              </h2>
            </div>

            <label className="block text-base font-medium text-summit-forest mb-2">
              Would you be willing to write a short testimonial about your experience?
            </label>
            <p className="text-sm text-text-secondary mb-3">
              1–3 sentences is perfect. We may lightly edit for clarity, but won't change your meaning.
            </p>
            <textarea
              value={formData.testimonial_text}
              onChange={(e) => handleChange('testimonial_text', e.target.value)}
              className="w-full h-24 p-4 border border-purple-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none bg-white text-summit-forest"
              placeholder="Summit helped me finally stick to my morning routine by..."
            />

            {formData.testimonial_text.trim() && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-base font-medium text-summit-forest mb-3">
                    May we use this testimonial publicly (website, marketing)?
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {[
                      { value: 'named', label: 'Yes, with my name' },
                      { value: 'anonymous', label: 'Yes, anonymously' },
                      { value: 'no', label: 'No' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleChange('testimonial_permission', option.value)}
                        className={`
                          flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all
                          ${formData.testimonial_permission === option.value
                            ? 'bg-summit-emerald text-white border-summit-emerald'
                            : 'bg-white text-summit-forest border-summit-sage hover:border-summit-emerald'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.testimonial_permission === 'named' && (
                  <div>
                    <label className="block text-base font-medium text-summit-forest mb-2">
                      Name to display <span className="text-feedback-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.testimonial_name}
                      onChange={(e) => handleChange('testimonial_name', e.target.value)}
                      className={`
                        w-full p-3 border rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald bg-white text-summit-forest
                        ${errors.testimonial_name ? 'border-feedback-error' : 'border-summit-sage'}
                      `}
                      placeholder="John D. or John from Austin"
                    />
                    {errors.testimonial_name && (
                      <p className="text-sm text-feedback-error mt-1">{errors.testimonial_name}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Section 7: Additional Feedback */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Chat className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-lg font-semibold text-summit-forest">
                Open Door <span className="text-sm font-normal text-text-secondary">(Optional)</span>
              </h2>
            </div>

            <label className="block text-base font-medium text-summit-forest mb-2">
              Anything else you'd like us to know?
            </label>
            <textarea
              value={formData.additional_feedback}
              onChange={(e) => handleChange('additional_feedback', e.target.value)}
              className="w-full h-24 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none bg-white text-summit-forest"
              placeholder="Any other thoughts, suggestions, or questions..."
            />
          </Card>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-feedback-error-light border border-feedback-error rounded-lg p-4">
              <p className="text-sm text-feedback-error">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {saving ? 'Submitting...' : existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
            </Button>

            <p className="text-sm text-text-secondary text-center mt-3">
              Your feedback helps us build a better Summit.
            </p>
          </div>
        </form>
      </main>
    </div>
  )
}
