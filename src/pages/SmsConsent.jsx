import React from 'react'
import { Link } from 'react-router-dom'

export default function SmsConsent() {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-summit-forest mb-2">Summit Health</h1>
          <p className="text-stone-500">SMS Consent & Opt-In Information</p>
        </div>

        {/* How Users Opt In */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-summit-forest mb-4">How You Opt In</h2>
          <p className="text-stone-600 mb-4">
            During account setup at <strong>go.summithealth.app</strong>, users are presented with an
            optional SMS consent checkbox. SMS reminders are not required to use Summit Health.
          </p>

          {/* Visual mockup of the opt-in checkbox */}
          <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-5 mb-4">
            <p className="text-sm text-stone-400 mb-3 uppercase tracking-wide font-medium">Opt-in as shown during sign-up:</p>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 border-2 border-summit-emerald rounded bg-summit-emerald flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-summit-forest text-sm">Enable SMS Habit Reminders (Optional)</p>
                <p className="text-stone-500 text-sm mt-1">
                  Summit can send gentle reminders before your first habit and quick check-ins after — so
                  you can stay intentional, even on busy days. Message and data rates may apply. Reply STOP anytime.
                </p>
              </div>
            </div>
          </div>

          <p className="text-stone-600 text-sm">
            Users may also text <strong>START</strong> to the Summit Health phone number to opt in to SMS messages.
          </p>
        </section>

        {/* SMS Program Details */}
        <section className="bg-summit-mint/50 border-2 border-summit-sage rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-summit-forest mb-3">Summit SMS Program</h3>
          <p className="text-stone-700 mb-4">
            <strong>Program Name:</strong> Summit Health Habit Reminders
          </p>
          <p className="text-stone-700 mb-4">
            <strong>Description:</strong> Personalized SMS messages including daily habit reminders,
            check-ins, and health coaching support to help you build sustainable wellness habits.
          </p>
          <p className="text-stone-700 mb-4">
            <strong>Message Frequency:</strong> Message frequency varies based on your preferences
            and interactions. Expect 1-5 messages per day when opted in.
          </p>
          <p className="text-stone-700 mb-4">
            <strong>Message and data rates may apply.</strong> Check with your mobile carrier for details.
          </p>
          <p className="text-stone-700 mb-4">
            <strong>To opt out:</strong> Text <strong className="bg-white px-2 py-1 rounded">STOP</strong> to
            cancel and stop receiving messages at any time.
          </p>
          <p className="text-stone-700 mb-4">
            <strong>For help:</strong> Text <strong className="bg-white px-2 py-1 rounded">HELP</strong> or
            email hello@summithealth.app
          </p>
          <p className="text-stone-700">
            <strong>Privacy:</strong> Your information will not be shared with third parties for
            marketing purposes.
          </p>
        </section>

        {/* Managing Consent */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-summit-forest mb-4">Managing Your Consent</h2>
          <ul className="text-stone-600 space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-summit-emerald font-bold mt-0.5">&#8226;</span>
              <span>Reply <strong>STOP</strong> to any message to immediately unsubscribe</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-summit-emerald font-bold mt-0.5">&#8226;</span>
              <span>Reply <strong>HELP</strong> for assistance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-summit-emerald font-bold mt-0.5">&#8226;</span>
              <span>Toggle SMS reminders on or off anytime in your profile settings at go.summithealth.app</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-summit-emerald font-bold mt-0.5">&#8226;</span>
              <span>SMS consent is <strong>not required</strong> to use Summit Health</span>
            </li>
          </ul>
        </section>

        {/* Links */}
        <div className="text-center text-sm text-stone-500 space-x-4">
          <Link to="/privacy" className="text-summit-emerald hover:underline">Privacy Policy</Link>
          <span>|</span>
          <Link to="/terms" className="text-summit-emerald hover:underline">Terms of Service</Link>
        </div>
      </div>
    </div>
  )
}
