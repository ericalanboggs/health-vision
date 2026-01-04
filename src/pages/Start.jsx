import { useNavigate } from 'react-router-dom'
import { Mountain, Calendar, MessageSquare, Sparkles, ArrowRight } from 'lucide-react'

export default function Start() {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/vision')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <Mountain className="w-12 h-12 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-stone-800 mb-4">
            Welcome to Your Summit Pilot 🏔️
          </h1>
          
          <p className="text-xl text-stone-600 max-w-2xl mx-auto">
            This is a 3-week pilot program to help you build sustainable health habits.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 mb-8">
          {/* Program Overview */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-stone-800 mb-4">
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
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1">
                  Create Your Vision
                </h3>
                <p className="text-stone-600">
                  To start, you'll create a vision that serves as your reference point—why you're doing this in the first place. Your words and vision will be leveraged throughout your experience!
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1">
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
                  <MessageSquare className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1">
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
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition flex items-center justify-center gap-2 text-lg"
          >
            Get Started
            <ArrowRight className="w-6 h-6" />
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
