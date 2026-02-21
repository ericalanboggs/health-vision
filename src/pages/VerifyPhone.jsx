import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Autorenew } from '@mui/icons-material'
import { getCurrentUser } from '../services/authService'
import { getProfile } from '../services/authService'
import supabase from '../lib/supabase'
import { Button, Card } from '@summit/design-system'

export default function VerifyPhone() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [maskedPhone, setMaskedPhone] = useState('')
  const [userId, setUserId] = useState(null)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState(null)
  const [codeSent, setCodeSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef([])

  useEffect(() => {
    init()
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const init = async () => {
    const result = await getCurrentUser()
    if (!result.success || !result.user) {
      navigate('/login', { replace: true })
      return
    }

    const profileResult = await getProfile(result.user.id)
    if (!profileResult.success || !profileResult.data?.phone) {
      navigate('/profile-setup', { replace: true })
      return
    }

    // If already verified, let Home handle routing
    if (profileResult.data.phone_verified) {
      navigate('/', { replace: true })
      return
    }

    setUserId(result.user.id)
    setMaskedPhone(maskPhone(profileResult.data.phone))
    setLoading(false)

    // Auto-send verification code
    await sendCode()
  }

  const maskPhone = (phone) => {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    // Show last 4 digits only
    const last4 = digits.slice(-4)
    return `•••-•••-${last4}`
  }

  const sendCode = async () => {
    setSending(true)
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-phone-verification', {
        body: {},
      })

      if (fnError) {
        // Parse error from edge function response
        const errorMessage = fnError.message || 'Failed to send verification code'
        if (errorMessage.includes('Too many')) {
          setError('Too many verification attempts. Please try again in an hour.')
        } else {
          setError(errorMessage)
        }
      } else if (data?.error) {
        setError(data.error)
      } else {
        setCodeSent(true)
        setResendCooldown(60)
      }
    } catch (err) {
      console.error('Error sending verification code:', err)
      setError('Failed to send verification code. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleCodeChange = (index, value) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)

    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    setError(null)

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return

    const newCode = [...code]
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || ''
    }
    setCode(newCode)

    // Focus last filled input or the next empty one
    const focusIndex = Math.min(pasted.length, 5)
    inputRefs.current[focusIndex]?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit code.')
      return
    }

    setVerifying(true)
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-phone-code', {
        body: { code: fullCode },
      })

      if (fnError) {
        const errorMessage = fnError.message || 'Verification failed'
        setError(errorMessage)
      } else if (data?.error) {
        setError(data.error)
      } else if (data?.success) {
        // Route to Home which handles onboarding vs dashboard routing
        navigate('/', { replace: true })
      }
    } catch (err) {
      console.error('Error verifying code:', err)
      setError('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || sending) return
    setCode(['', '', '', '', '', ''])
    await sendCode()
    inputRefs.current[0]?.focus()
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
              <Phone className="w-8 h-8 text-summit-emerald" />
            </div>
            <h1 className="text-h1 text-summit-forest mb-2">
              Verify Your Phone
            </h1>
            <p className="text-body text-text-secondary">
              We sent a 6-digit code to <span className="font-medium">{maskedPhone}</span>
            </p>
          </div>

          {/* Code Input */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-3">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-xl font-semibold border-2 border-stone-300 rounded-lg focus:border-summit-emerald focus:ring-2 focus:ring-summit-emerald/20 focus:outline-none transition-colors"
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-feedback-error-light border border-feedback-error rounded-lg p-4">
                <p className="text-sm text-feedback-error text-center">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={verifying || code.join('').length !== 6}
              loading={verifying}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {verifying ? 'Verifying...' : 'Verify Phone'}
            </Button>

            {/* Resend */}
            <p className="text-center text-sm text-text-secondary">
              {"Didn't receive the code? "}
              {resendCooldown > 0 ? (
                <span className="text-text-tertiary">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={sending}
                  className="text-summit-emerald font-medium hover:underline disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Resend Code'}
                </button>
              )}
            </p>
          </form>
        </Card>
      </main>
    </div>
  )
}
