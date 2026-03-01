import { useNavigate, Link } from 'react-router-dom'
import { ArrowBack } from '@mui/icons-material'

export default function Terms() {
  const navigate = useNavigate()
  const lastUpdated = 'February 6, 2026'

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      {/* Simple Header */}
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

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-summit-forest mb-2">
            Terms of Service
          </h1>
          <p className="text-stone-500 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-stone max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">1. Agreement to Terms</h2>
              <p className="text-stone-600 mb-4">
                By accessing or using Summit Health ("Summit," "we," "us," or "our") services,
                including our website at summithealth.app and SMS messaging features, you agree
                to be bound by these Terms of Service ("Terms").
              </p>
              <p className="text-stone-600">
                If you do not agree to these Terms, please do not use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">2. Description of Service</h2>
              <p className="text-stone-600 mb-4">
                Summit provides a health coaching platform that helps users build sustainable habits
                through:
              </p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li>Vision-based goal setting and planning</li>
                <li>AI-powered habit suggestions and reminders</li>
                <li>SMS-based habit reminders (optional, with user consent)</li>
                <li>Weekly reflection prompts and progress tracking</li>
                <li>Personalized content and coaching support (Premium plans)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">3. Account Registration</h2>
              <p className="text-stone-600 mb-4">To use Summit, you must:</p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li>Be at least 18 years of age</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Promptly update any changes to your information</li>
              </ul>
              <p className="text-stone-600 mt-4">
                You are responsible for all activities that occur under your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">4. SMS Messaging Terms</h2>

              {/* CTIA-Required SMS Disclosure Box */}
              <div className="bg-summit-mint/50 border-2 border-summit-sage rounded-lg p-6 mb-6">
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
                  and interactions. Expect 1-2 messages per day when opted in.
                </p>
                <p className="text-stone-700 mb-4">
                  <strong>Message and data rates may apply.</strong> Check with your mobile carrier for details.
                </p>
                <p className="text-stone-700 mb-4">
                  <strong>To opt out:</strong> Text <strong className="bg-white px-2 py-1 rounded">STOP</strong> to
                  cancel and stop receiving messages.
                </p>
                <p className="text-stone-700 mb-4">
                  <strong>For help:</strong> Text <strong className="bg-white px-2 py-1 rounded">HELP</strong> or
                  email hello@summithealth.app
                </p>
                <p className="text-stone-700">
                  <strong>Privacy:</strong> Your information will not be shared with third parties for
                  marketing purposes. See our{' '}
                  <Link to="/privacy" className="text-summit-emerald hover:underline font-medium">
                    Privacy Policy
                  </Link>.
                </p>
              </div>

              <p className="text-stone-600 mb-4">
                By opting in to receive SMS messages from Summit, you agree to the following:
              </p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li><strong>Consent:</strong> You consent to receive recurring automated text messages
                  from Summit at the phone number you provide</li>
                <li><strong>Message Frequency:</strong> Message frequency varies based on your preferences
                  and interactions with the service</li>
                <li><strong>Message Content:</strong> Messages will include habit reminders, check-ins,
                  coaching support, and replies to your messages</li>
                <li><strong>Costs:</strong> Message and data rates may apply depending on your mobile
                  carrier plan</li>
                <li><strong>Opt-Out:</strong> You may opt out at any time by replying <strong>STOP</strong> to any
                  message or by updating your preferences in your profile settings</li>
                <li><strong>Help:</strong> Reply <strong>HELP</strong> for assistance or contact hello@summithealth.app</li>
              </ul>
              <p className="text-stone-600 mt-4">
                SMS consent is not required to use Summit. You may use our web-based features without
                opting in to SMS.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">5. Acceptable Use</h2>
              <p className="text-stone-600 mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li>Use Summit for any unlawful purpose</li>
                <li>Share your account credentials with others</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt our services</li>
                <li>Submit false or misleading information</li>
                <li>Use automated systems to access our service without permission</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">6. Health Disclaimer</h2>
              <p className="text-stone-600 mb-4">
                <strong>Summit is not a medical service.</strong> Our service provides general wellness
                coaching and habit-building support, not medical advice, diagnosis, or treatment.
              </p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li>Always consult a qualified healthcare provider before starting any new health program</li>
                <li>Do not disregard professional medical advice based on information from Summit</li>
                <li>If you experience a medical emergency, contact emergency services immediately</li>
                <li>Summit coaches are not licensed medical professionals unless otherwise stated</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">7. Intellectual Property</h2>
              <p className="text-stone-600 mb-4">
                All content, features, and functionality of Summit—including but not limited to text,
                graphics, logos, and software—are owned by Summit Health and are protected by
                intellectual property laws.
              </p>
              <p className="text-stone-600">
                You may not copy, modify, distribute, or create derivative works from our content
                without our express written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">8. User Content</h2>
              <p className="text-stone-600 mb-4">
                You retain ownership of content you submit to Summit (such as reflections and goals).
                By submitting content, you grant us a non-exclusive, worldwide license to use, store,
                and process your content solely to provide and improve our services.
              </p>
              <p className="text-stone-600">
                We may use aggregated, anonymized data to improve our services and develop new features.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">9. Subscription and Payment</h2>
              <p className="text-stone-600 mb-4">
                Summit offers both free and paid subscription plans. For paid plans:
              </p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li>Billing occurs at the start of each billing period (monthly or annual)</li>
                <li>Subscriptions automatically renew unless canceled before the renewal date</li>
                <li>You may cancel at any time through your account settings</li>
                <li>Refunds are provided in accordance with our refund policy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">10. Limitation of Liability</h2>
              <p className="text-stone-600 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SUMMIT SHALL NOT BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
                LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OUR SERVICES.
              </p>
              <p className="text-stone-600">
                Our total liability for any claims arising from these Terms or your use of Summit
                shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">11. Disclaimer of Warranties</h2>
              <p className="text-stone-600">
                SUMMIT IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
                EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT OUR
                SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">12. Termination</h2>
              <p className="text-stone-600 mb-4">
                We may suspend or terminate your access to Summit at any time for any reason,
                including violation of these Terms. You may also terminate your account at any time.
              </p>
              <p className="text-stone-600">
                Upon termination, your right to use Summit will immediately cease. Provisions that
                by their nature should survive termination will remain in effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">13. Changes to Terms</h2>
              <p className="text-stone-600">
                We reserve the right to modify these Terms at any time. We will notify you of
                material changes by posting the updated Terms on our website and updating the
                "Last updated" date. Your continued use of Summit after changes constitutes
                acceptance of the modified Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">14. Governing Law</h2>
              <p className="text-stone-600">
                These Terms shall be governed by and construed in accordance with the laws of the
                United States, without regard to conflict of law principles. Any disputes arising
                from these Terms shall be resolved in the courts of competent jurisdiction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">15. Contact Information</h2>
              <p className="text-stone-600 mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <ul className="list-none text-stone-600 space-y-2">
                <li><strong>Email:</strong> hello@summithealth.app</li>
                <li><strong>Website:</strong> summithealth.app</li>
              </ul>
            </section>

            <section className="pt-6 border-t border-gray-200">
              <p className="text-stone-600">
                By using Summit, you acknowledge that you have read, understood, and agree to be
                bound by these Terms of Service and our{' '}
                <Link to="/privacy" className="text-summit-emerald hover:underline">
                  Privacy Policy
                </Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
