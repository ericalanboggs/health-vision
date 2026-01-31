import { useNavigate } from 'react-router-dom'
import { Terrain, Science, Chat } from '@mui/icons-material'
import { Button, Card } from '@summit/design-system'

export default function Start() {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/vision')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-summit-sage rounded-full flex items-center justify-center">
              <span className="text-4xl">🏔️</span>
            </div>
          </div>

          <h1 className="text-h1 text-summit-forest mb-4">
            How Summit Works
          </h1>

          <p className="text-body-lg text-text-secondary max-w-2xl mx-auto">
            Turn your vision into simple, sustainable habits—designed for your life right now.
          </p>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 sm:p-10 mb-8">
          {/* Features */}
          <div className="space-y-6 mb-10">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-summit-sage rounded-lg flex items-center justify-center">
                  <Terrain className="w-6 h-6 text-summit-emerald" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-summit-forest mb-1">
                  Create Your Vision
                </h3>
                <p className="text-text-secondary">
                  Start by defining a clear vision—your "why." This becomes your reference point and guides everything you build from here.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-summit-sage rounded-lg flex items-center justify-center">
                  <Science className="w-6 h-6 text-summit-emerald" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-summit-forest mb-1">
                  Build Small Habits
                </h3>
                <p className="text-text-secondary">
                  Choose 1–3 habits that align with your vision. Small, intentional steps create meaningful, lasting change.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-summit-sage rounded-lg flex items-center justify-center">
                  <Chat className="w-6 h-6 text-summit-emerald" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-summit-forest mb-1">
                  Stay on Track
                </h3>
                <p className="text-text-secondary">
                  Get optional SMS reminders and check-ins to help you stay consistent—on your schedule.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={handleGetStarted}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Get Started →
          </Button>
        </Card>
      </div>
    </div>
  )
}
