import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, signOut } from '../services/authService'
import { Calendar, Target, LogOut, User } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const { user } = await getCurrentUser()
      setUser(user)
      setLoading(false)
    }

    loadUser()
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center">
        <p className="text-stone-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-800">Summit Dashboard</h1>
                <p className="text-sm text-stone-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Habit Commitments Card */}
          <button
            onClick={() => navigate('/habits')}
            className="bg-white rounded-2xl shadow-lg p-8 text-left hover:shadow-xl transition group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition">
                <Target className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2">
              Weekly Habits
            </h2>
            <p className="text-stone-600 mb-4">
              Set your commitments for this week. Choose 1-2 habits with specific days and times.
            </p>
            <div className="text-green-600 font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
              Manage Habits
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          {/* Weekly Reflection Card */}
          <button
            onClick={() => navigate('/reflection')}
            className="bg-white rounded-2xl shadow-lg p-8 text-left hover:shadow-xl transition group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition">
                <Calendar className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2">
              Weekly Reflection
            </h2>
            <p className="text-stone-600 mb-4">
              Reflect on your week. What went well? What was challenging? What will you adjust?
            </p>
            <div className="text-amber-600 font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
              Start Reflection
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>

        {/* Welcome Message */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-stone-800 mb-2">
            Welcome to Your Summit Pilot 🏔️
          </h3>
          <p className="text-stone-600">
            This is a 4-week pilot program to help you build sustainable health habits. 
            Each week, commit to 1-2 habits and reflect on your progress. 
            You'll receive gentle SMS reminders at the times you choose.
          </p>
        </div>
      </main>
    </div>
  )
}
