import { useNavigate } from 'react-router-dom'
import { ArrowBack } from '@mui/icons-material'

export default function Privacy() {
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
              className="flex items-center gap-2 text-2xl font-bold text-summit-forest hover:text-summit-moss transition"
            >
              <span>Summit</span>
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
            Privacy Policy
          </h1>
          <p className="text-stone-500 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-stone max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">1. Introduction</h2>
              <p className="text-stone-600 mb-4">
                Summit Health ("Summit," "we," "us," or "our") is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                when you use our health coaching service, including our website and SMS messaging features.
              </p>
              <p className="text-stone-600">
                Please read this privacy policy carefully. By using Summit, you agree to the collection
                and use of information in accordance with this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">2. Information We Collect</h2>

              <h3 className="text-lg font-medium text-summit-forest mb-3">Personal Information</h3>
              <p className="text-stone-600 mb-4">When you register for Summit, we collect:</p>
              <ul className="list-disc pl-6 text-stone-600 mb-4 space-y-2">
                <li>Name (first and last name)</li>
                <li>Email address</li>
                <li>Phone number (for SMS reminders)</li>
                <li>Timezone information</li>
              </ul>

              <h3 className="text-lg font-medium text-summit-forest mb-3">Health and Wellness Information</h3>
              <p className="text-stone-600 mb-4">To provide personalized coaching, we collect:</p>
              <ul className="list-disc pl-6 text-stone-600 mb-4 space-y-2">
                <li>Your health vision and goals</li>
                <li>Habits you choose to track</li>
                <li>Weekly reflection responses</li>
                <li>Habit scheduling preferences</li>
              </ul>

              <h3 className="text-lg font-medium text-summit-forest mb-3">Usage Information</h3>
              <p className="text-stone-600 mb-4">We automatically collect:</p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li>Device and browser information</li>
                <li>IP address</li>
                <li>Usage patterns and feature interactions</li>
                <li>SMS delivery and response data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">3. How We Use Your Information</h2>
              <p className="text-stone-600 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li>Provide and personalize our health coaching service</li>
                <li>Send SMS habit reminders (with your consent)</li>
                <li>Send weekly reflection prompts and content digests via email</li>
                <li>Analyze your progress and provide insights</li>
                <li>Improve our service and develop new features</li>
                <li>Communicate with you about your account</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">4. SMS Messaging</h2>
              <p className="text-stone-600 mb-4">
                If you opt in to SMS, you will receive text messages from Summit including habit reminders,
                check-ins, and coaching support. By opting in, you agree to receive these messages.
              </p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li><strong>Frequency:</strong> Message frequency varies based on your preferences and interactions</li>
                <li><strong>Message content:</strong> Habit reminders, check-ins, coaching support, and replies to your messages</li>
                <li><strong>Opt-out:</strong> Reply STOP to any message to unsubscribe instantly</li>
                <li><strong>Help:</strong> Reply HELP for assistance</li>
                <li><strong>Costs:</strong> Message and data rates may apply</li>
              </ul>
              <p className="text-stone-600 mt-4">
                We do not sell, rent, or share your phone number with third parties for marketing purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">5. Data Sharing and Disclosure</h2>
              <p className="text-stone-600 mb-4">We may share your information with:</p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li><strong>Service Providers:</strong> Third-party vendors who help us operate our service
                  (e.g., Twilio for SMS, Supabase for data storage, Resend for email)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
              <p className="text-stone-600 mt-4">
                <strong>We do not sell your personal information to third parties.</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">6. Data Security</h2>
              <p className="text-stone-600 mb-4">
                We implement appropriate technical and organizational measures to protect your personal
                information, including:
              </p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li>Encryption of data in transit (HTTPS/TLS)</li>
                <li>Secure authentication via Supabase Auth</li>
                <li>Row-level security policies for database access</li>
                <li>Regular security reviews and updates</li>
              </ul>
              <p className="text-stone-600 mt-4">
                However, no method of transmission over the Internet is 100% secure. We cannot guarantee
                absolute security of your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">7. Data Retention</h2>
              <p className="text-stone-600">
                We retain your personal information for as long as your account is active or as needed
                to provide you services. You may request deletion of your account and associated data
                at any time by contacting us at hello@summithealth.app.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">8. Your Rights</h2>
              <p className="text-stone-600 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-stone-600 space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Request deletion of your data</li>
                <li>Opt out of SMS communications at any time</li>
                <li>Withdraw consent for data processing</li>
              </ul>
              <p className="text-stone-600 mt-4">
                To exercise these rights, contact us at hello@summithealth.app.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">9. Age Requirement</h2>
              <p className="text-stone-600">
                Summit is intended for individuals 18 years of age and older. By using Summit, you
                represent that you are at least 18 years old. We do not knowingly collect personal
                information from anyone under 18. If we learn we have collected information from
                someone under 18, we will delete it promptly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">10. Changes to This Policy</h2>
              <p className="text-stone-600">
                We may update this Privacy Policy from time to time. We will notify you of any changes
                by posting the new Privacy Policy on this page and updating the "Last updated" date.
                Continued use of Summit after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-summit-forest mb-4">11. Contact Us</h2>
              <p className="text-stone-600 mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <ul className="list-none text-stone-600 space-y-2">
                <li><strong>Email:</strong> hello@summithealth.app</li>
                <li><strong>Website:</strong> summithealth.app</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
