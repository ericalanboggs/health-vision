import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowBack } from '@mui/icons-material'

export default function SmsConsent() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      {/* Header — matches Terms/Privacy */}
      <header className="bg-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center hover:opacity-80 transition"
            >
              <img src="/summit-logo.svg" alt="Summit Health" className="h-8" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-600 hover:text-summit-forest font-medium transition-colors mb-6"
        >
          <ArrowBack className="w-5 h-5" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-summit-forest mb-2">SMS Consent & Opt-In</h1>
        <p className="text-stone-500 mb-8">How Summit Health collects and manages SMS consent.</p>

        {/* How Users Opt In */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-summit-forest mb-4">How You Opt In</h2>
          <p className="text-stone-600 mb-4">
            During sign-up at <strong>go.summithealth.app</strong>, you are presented with an
            optional SMS consent checkbox. SMS is not required to participate, but is strongly
            recommended for the best experience.
          </p>

          {/* Visual mockup of the opt-in checkbox */}
          <div className="bg-white border border-stone-200 rounded-lg p-5">
            <p className="text-sm text-stone-400 mb-3 uppercase tracking-wide font-medium">Opt-in as shown during sign-up:</p>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 border-2 border-stone-300 rounded bg-white flex-shrink-0">
              </div>
              <div>
                <p className="font-semibold text-summit-forest text-sm">Get daily coaching texts (Optional)</p>
                <p className="text-stone-500 text-sm mt-1">
                  By checking this box, you consent to receive automated coaching and wellness text messages
                  from Summit Health. Msg frequency varies by program. Msg & data rates may apply. Consent is not a condition
                  of any purchase. Reply STOP to unsubscribe anytime, HELP for help.
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  <Link to="/privacy" className="text-summit-emerald hover:underline">Privacy Policy</Link>
                  {' & '}
                  <Link to="/terms" className="text-summit-emerald hover:underline">Terms</Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SMS Programs */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-summit-forest mb-4">SMS Programs</h2>

          {/* Lite Challenge */}
          <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-summit-forest mb-3">5-Day Tech Neck Challenge</h3>
            <p className="text-stone-700 mb-4">
              <strong>Description:</strong> A 5-day coaching challenge delivered via text message.
              You'll receive evidence-based stretches, strengthening exercises, and posture tips to
              help fix tech neck — ending with a 2-minute daily routine you can keep.
            </p>
            <p className="text-stone-700 mb-4">
              <strong>Message Frequency:</strong> 5 text messages per day for 5 days (Monday through Friday),
              sent at approximately 8am, 10am, 12pm, 3pm, and 5pm in your local timezone. 25 messages total.
            </p>
            <p className="text-stone-700 mb-4">
              <strong>Cost:</strong> One-time $1 enrollment fee. Standard message and data rates may apply.
            </p>
            <p className="text-stone-700">
              <strong>Duration:</strong> Messages end automatically after 5 days. No ongoing subscription.
            </p>
          </div>

          {/* Full Summit */}
          <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-summit-forest mb-3">Summit Health Habit Reminders</h3>
            <p className="text-stone-700 mb-4">
              <strong>Description:</strong> Personalized SMS messages including daily habit reminders,
              check-ins, and health coaching support to help you build sustainable wellness habits.
            </p>
            <p className="text-stone-700 mb-4">
              <strong>Message Frequency:</strong> Message frequency varies based on your preferences
              and interactions. Expect 1-2 messages per day when opted in.
            </p>
            <p className="text-stone-700">
              <strong>Cost:</strong> Included with your Summit Health subscription. Standard message and data rates may apply.
            </p>
          </div>

          {/* Shared details */}
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-summit-forest mb-3">For All Programs</h3>
            <p className="text-stone-700 mb-4">
              <strong>To opt out:</strong> Text <strong>STOP</strong> to
              cancel and stop receiving messages at any time.
            </p>
            <p className="text-stone-700 mb-4">
              <strong>For help:</strong> Text <strong>HELP</strong> or
              email hello@summithealth.app
            </p>
            <p className="text-stone-700">
              <strong>Privacy:</strong> Your information will not be shared with third parties for
              marketing purposes.
            </p>
          </div>
        </section>

        {/* Links */}
        <div className="text-sm text-stone-500 space-x-4">
          <Link to="/privacy" className="text-summit-emerald hover:underline">Privacy Policy</Link>
          <span>|</span>
          <Link to="/terms" className="text-summit-emerald hover:underline">Terms of Service</Link>
        </div>
      </main>
    </div>
  )
}
