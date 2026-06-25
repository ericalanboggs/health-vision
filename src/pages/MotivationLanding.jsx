import { useNavigate } from 'react-router-dom'
import { Card, Button } from '@summit/design-system'

/**
 * Post-enroll landing for Motivation Mode users. They have no habit dashboard,
 * so onboarding ends here. The welcome SMS has already gone out (fired by the
 * enroll DB trigger), so the copy points them at their phone.
 */
export default function MotivationLanding() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 rounded-full bg-white shadow-elevated flex items-center justify-center">
              <img src="/summit-illustration.png" alt="Summit" className="w-[84px] h-[84px]" />
            </div>
          </div>
          <h1 className="text-h1 text-summit-forest mb-3">You're all set 🌱</h1>
        </div>

        <Card className="mb-6 border border-summit-sage text-center">
          <p className="text-body text-stone-600 leading-relaxed mb-4">
            We just texted you what to expect — keep an eye on your phone.
          </p>
          <p className="text-body-sm text-stone-500 leading-relaxed">
            You'll get a short daily message, and once a week we'll check in to see how
            you're feeling. No tracking, no pressure to reply — your pace is the right pace.
          </p>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/profile')}>
            Go to my account
          </Button>
        </div>
      </div>
    </div>
  )
}
