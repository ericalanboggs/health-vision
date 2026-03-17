import { useState, useEffect } from 'react'
import { Close, Send, CheckCircle, Error as ErrorIcon, Email } from '@mui/icons-material'
import { sendAdminEmail } from '../../services/adminService'

const TEMPLATES = [
  {
    key: 'check-in',
    label: 'Check-in',
    subject: 'Checking in, {{name}}',
    body: 'Just wanted to see how you\'re doing with your habits this week. Remember — any progress counts, even small steps.',
    cta: 'Open Summit',
  },
  {
    key: 'encouragement',
    label: 'Encouragement',
    subject: 'Keep it up, {{name}}!',
    body: 'I noticed you\'ve been consistent with your habits lately — that takes real commitment. Keep building on that momentum!',
    cta: 'See Your Progress',
  },
  {
    key: 'milestone',
    label: 'Milestone',
    subject: 'You hit a milestone!',
    body: 'Congrats on reaching this point in your journey! Take a moment to appreciate how far you\'ve come.',
    cta: 'Celebrate',
  },
  {
    key: 'reengagement',
    label: 'Re-engagement',
    subject: 'We miss you, {{name}}',
    body: 'It\'s been a little while since you\'ve checked in. No pressure — just wanted you to know we\'re here whenever you\'re ready to pick back up.',
    cta: 'Jump Back In',
  },
]

/**
 * Modal for composing and sending personalized emails to a user
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {{ id: string, name: string, email: string }} props.user
 * @param {Function} props.onSuccess
 */
export default function SendEmailModal({ isOpen, onClose, user, onSuccess }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(null)
      setSubject('')
      setBody('')
      setCtaText('')
      setResult(null)
    }
  }, [isOpen])

  const selectTemplate = (template) => {
    setSelectedTemplate(template.key)
    setSubject(template.subject)
    setBody(template.body)
    setCtaText(template.cta)
    setResult(null)
  }

  const handleSend = async () => {
    if (sending || !subject.trim() || !body.trim()) return

    setSending(true)
    setResult(null)

    try {
      const response = await sendAdminEmail(user.id, {
        subject: subject.trim(),
        body: body.trim(),
        ctaText: ctaText.trim() || 'Open Summit',
        category: selectedTemplate || 'general',
      })

      if (response.success) {
        setResult({ success: true })
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 2000)
      } else {
        setResult({ success: false, error: response.error })
      }
    } catch (error) {
      setResult({ success: false, error: error.message })
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-summit-forest flex items-center gap-2">
            <Email className="w-5 h-5" />
            Email {user.name}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 transition"
          >
            <Close className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {/* Template selector */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">
              Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => selectTemplate(t)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition text-left ${
                    selectedTemplate === t.key
                      ? 'border-summit-emerald bg-emerald-50 text-summit-emerald'
                      : 'border-gray-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition"
              disabled={sending}
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body... Use {{name}} for the user's first name."
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
              disabled={sending}
            />
            <p className="text-xs text-stone-400 mt-1">
              {'{{name}}'} will be replaced with the user's first name
            </p>
          </div>

          {/* CTA button text */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              CTA Button Text
            </label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="Open Summit"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition"
              disabled={sending}
            />
            <p className="text-xs text-stone-400 mt-1">
              CTA links to go.summithealth.app/dashboard
            </p>
          </div>

          {/* Result message */}
          {result && (
            <div className={`flex items-start gap-2 rounded-lg p-3 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    Email sent to {user.email}
                  </p>
                </>
              ) : (
                <>
                  <ErrorIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">
                    {result.error || 'Failed to send email'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium transition"
            disabled={sending}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-summit-emerald hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
          >
            {sending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
