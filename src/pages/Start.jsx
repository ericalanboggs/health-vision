import { useNavigate } from 'react-router-dom'
import { Terrain, CalendarMonth, Chat, AutoAwesome, ArrowForward } from '@mui/icons-material'

export default function Start() {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/vision')
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-summit-mint rounded-full flex items-center justify-center">
              <Terrain className="w-12 h-12 text-summit-emerald" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-summit-forest mb-4">
            Welcome to Your Summit Pilot 🏔️
          </h1>
          
          <p className="text-xl text-stone-600 max-w-2xl mx-auto">
            This is a 3-week pilot program to help you build sustainable health habits.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10 mb-8">
          {/* Program Overview */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-summit-forest mb-4">
              How It Works
            </h2>
            <p className="text-stone-600 text-lg leading-relaxed">
              Each week, commit to 1-2 habits and reflect on your progress. 
              You'll receive SMS reminders (if you opted in) at the times you choose.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6 mb-10">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <AutoAwesome className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-summit-forest mb-1">
                  Create Your Vision
                </h3>
                <p className="text-stone-600">
                  To start, you'll create a vision that serves as your reference point—why you're doing this in the first place. Your words and vision will be leveraged throughout your experience!
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-summit-mint rounded-lg flex items-center justify-center">
                  <CalendarMonth className="w-6 h-6 text-summit-emerald" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-summit-forest mb-1">
                  Weekly Habit Building
                </h3>
                <p className="text-stone-600">
                  Choose 1-2 habits each week that align with your vision. Small, consistent steps lead to lasting change.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Chat className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-summit-forest mb-1">
                  SMS Reminders (if opted in)
                </h3>
                <p className="text-stone-600">
                  Stay on track with personalized reminders sent at times that work for you. Completely optional.
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
