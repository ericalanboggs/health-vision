import { useNavigate } from 'react-router-dom'
import { CalendarMonth, Chat, AutoAwesome, ArrowForward } from '@mui/icons-material'

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
            <div className="w-20 h-20 bg-summit-mint rounded-full flex items-center justify-center">
              <span className="text-4xl">🏔️</span>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-summit-forest mb-4">
            Welcome to Your Summit Pilot
          </h1>
          
          <p className="text-xl text-stone-600 max-w-2xl mx-auto">
            This is a 3-week pilot program to help you build sustainable health habits.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8 sm:p-10 mb-8">
          {/* Program Overview */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-summit-forest mb-4">
              How It Works
            </h2>
            <p className="text-stone-600 text-lg leading-relaxed">
              Each week, commit to 1–2 habits and reflect on how they're going. If you opt in, you'll receive SMS reminders at the times you choose.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6 mb-10">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-summit-mint rounded-lg flex items-center justify-center">
                  <AutoAwesome className="w-6 h-6 text-summit-moss" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-summit-forest mb-1">
                  Create Your Vision
                </h3>
                <p className="text-stone-600">
                  You'll start by defining a clear vision—your "why." This becomes your reference point and guides everything you build from here.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-summit-mint rounded-lg flex items-center justify-center">
                  <CalendarMonth className="w-6 h-6 text-summit-moss" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-summit-forest mb-1">
                  Weekly Habit Building
                </h3>
                <p className="text-stone-600">
                  Choose 1–2 habits each week that align with your vision. Small, intentional steps create meaningful, lasting change.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-summit-mint rounded-lg flex items-center justify-center">
                  <Chat className="w-6 h-6 text-summit-moss" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-summit-forest mb-1">
                  SMS Reminders (Optional)
                </h3>
                <p className="text-stone-600">
                  Get personalized reminders to support your habits—on your schedule, and only if you want them.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleGetStarted}
            className="w-full bg-summit-emerald hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-lg transition flex items-center justify-center gap-2 text-lg"
          >
            Get Started
            <ArrowForward className="w-6 h-6" />
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center">
          <p className="text-sm text-stone-500">
            This pilot program runs for 3 weeks. Let's build something meaningful together.
          </p>
        </div>
      </div>
    </div>
  )
}
