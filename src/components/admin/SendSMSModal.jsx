import { useState, useEffect } from 'react'
import { Close, Send, Warning, CheckCircle, Error } from '@mui/icons-material'
import { sendAdminSMS } from '../../services/adminService'

/**
 * Modal for composing and sending SMS to one or more users
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Array<{id: string, name: string, phone: string, smsOptIn: boolean}>} props.recipients
 * @param {Function} props.onSuccess - Called after successful send
 */
export default function SendSMSModal({ isOpen, onClose, recipients, onSuccess }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null) // { success: true/false, sent: n, failed: n }

  // Filter to eligible recipients (has phone AND sms opt-in)
  const eligibleRecipients = recipients.filter(r =>
    r.smsOptIn && r.phone && r.phone !== 'N/A'
  )
  const ineligibleCount = recipients.length - eligibleRecipients.length

  // Character and segment counting
  const charCount = message.length
  const segmentCount = charCount === 0 ? 0 : Math.ceil(charCount / 160)
  const isOverLimit = charCount > 320 // Limit to 2 segments

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMessage('')
      setResult(null)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (sending || eligibleRecipients.length === 0 || !message.trim()) return

    setSending(true)
    setResult(null)

    try {
      const formattedRecipients = eligibleRecipients.map(r => ({
        userId: r.id,
        phone: r.phone,
        name: r.name
      }))

      const response = await sendAdminSMS(formattedRecipients, message.trim())

      if (response.success) {
        setResult({
          success: true,
          sent: response.data.sent,
          failed: response.data.failed
        })

        // Auto-close after success
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 2000)
      } else {
        setResult({
          success: false,
          error: response.error
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      })
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  // Format recipient names for display
  const recipientDisplay = eligibleRecipients.length <= 3
    ? eligibleRecipients.map(r => r.name).join(', ')
    : `${eligibleRecipients.slice(0, 2).map(r => r.name).join(', ')}, and ${eligibleRecipients.length - 2} more`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-summit-forest">
            Send SMS to {recipients.length} {recipients.length === 1 ? 'user' : 'users'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 transition"
          >
            <Close className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Ineligible warning */}
          {ineligibleCount > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Warning className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {ineligibleCount} {ineligibleCount === 1 ? 'user' : 'users'} will be skipped (no phone or SMS opt-out)
              </p>
            </div>
          )}

          {/* No eligible recipients error */}
          {eligibleRecipients.length === 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <Error className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                No eligible recipients. All selected users either have no phone number or have opted out of SMS.
              </p>
            </div>
          )}

          {/* Recipients */}
          {eligibleRecipients.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                Recipients
              </label>
              <p className="text-sm text-stone-800">{recipientDisplay}</p>
            </div>
          )}

          {/* Message input */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! Quick check-in from Summit..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none ${
                isOverLimit ? 'border-red-500' : 'border-gray-200'
              }`}
              disabled={sending || eligibleRecipients.length === 0}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-stone-500">
                {segmentCount} SMS segment{segmentCount !== 1 ? 's' : ''}
              </span>
              <span className={`text-xs ${isOverLimit ? 'text-red-600' : 'text-stone-500'}`}>
                {charCount}/320
              </span>
            </div>
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
                    Successfully sent to {result.sent} {result.sent === 1 ? 'user' : 'users'}
                    {result.failed > 0 && ` (${result.failed} failed)`}
                  </p>
                </>
              ) : (
                <>
                  <Error className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">
                    {result.error || 'Failed to send messages'}
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
            disabled={sending || eligibleRecipients.length === 0 || !message.trim() || isOverLimit}
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
                Send to {eligibleRecipients.length}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
