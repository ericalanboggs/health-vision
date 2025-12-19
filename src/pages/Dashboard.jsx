import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, signOut } from '../services/authService'
import { getCurrentWeekHabits } from '../services/habitService'
import { loadJourney } from '../services/journeyService'
import { getCurrentWeekNumber, getCurrentWeekDateRange } from '../utils/weekCalculator'
import { Calendar, Target, LogOut, User, Clock, ArrowRight, Flag } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentHabits, setCurrentHabits] = useState([])
  const [weekNumber, setWeekNumber] = useState(1)
  const [weekDateRange, setWeekDateRange] = useState('')
  const [visionStatement, setVisionStatement] = useState('')

  useEffect(() => {
    const loadDashboardData = async () => {
      const { user } = await getCurrentUser()
      setUser(user)
      
      // Get current week info
      const week = getCurrentWeekNumber()
      const dateRange = getCurrentWeekDateRange()
      setWeekNumber(week)
      setWeekDateRange(dateRange)
      
      // Load current week's habits
      const { success, data } = await getCurrentWeekHabits()
      if (success && data) {
        setCurrentHabits(data)
      }
      
      // Load user's vision
      const journeyResult = await loadJourney()
      if (journeyResult.success && journeyResult.data?.form_data?.visionStatement) {
        setVisionStatement(journeyResult.data.form_data.visionStatement)
      }
      
      setLoading(false)
    }

    loadDashboardData()
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Format habits into readable format with separate habit and schedule
  const formatHabits = () => {
    if (currentHabits.length === 0) return []

    // Group habits by habit_name
    const habitGroups = {}
    currentHabits.forEach(habit => {
      if (!habitGroups[habit.habit_name]) {
        habitGroups[habit.habit_name] = []
      }
      habitGroups[habit.habit_name].push(habit)
    })

    // Format each habit group
    return Object.entries(habitGroups).map(([habitName, habits]) => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const days = habits.map(h => dayNames[h.day_of_week]).sort((a, b) => {
        const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return order.indexOf(a) - order.indexOf(b)
      })
      
      // Format time range (convert from 24hr to 12hr format)
      const time = habits[0].reminder_time
      const [hours] = time.split(':')
      const hour = parseInt(hours)
      const startHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const endHour = startHour + 1
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const timeRange = `${startHour}-${endHour}${ampm.toLowerCase()}`
      
      // Format days list
      let daysStr
      if (days.length === 1) {
        daysStr = days[0]
      } else if (days.length === 2) {
        daysStr = `${days[0]} and ${days[1]}`
      } else {
        daysStr = `${days.slice(0, -1).join(', ')}, and ${days[days.length - 1]}`
      }
      
      return {
        habit: habitName,
        schedule: `${daysStr} between ${timeRange}.`
      }
    })
  }

  const formattedHabits = formatHabits()

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-12">
        {/* Welcome Section - Moved to Top */}
        <div className="bg-[#f3f6ff] border border-[#cdcdcd] rounded-lg p-4 flex flex-col gap-3">
          <h2 className="text-3xl font-bold text-black leading-9">
            Welcome to Your Summit Pilot 🏔️
          </h2>
          <p className="text-base text-black leading-6">
            This is a 4-week pilot program to help you build sustainable health habits. 
            Each week, commit to 1-2 habits and reflect on your progress. 
            You'll receive gentle SMS reminders at the times you choose.
          </p>
          <p className="text-base text-black leading-6">
            Pilot Timeline: Week {weekNumber} ({weekDateRange})
          </p>
        </div>

        {/* Vision Section */}
        <div className="bg-[#f3f6ff] border border-[#cdcdcd] rounded-lg p-4 flex flex-col gap-3">
          <h2 className="text-3xl font-bold text-black leading-9">
            Your Vision
          </h2>
          
          {visionStatement ? (
            <p className="text-base text-black leading-6">
              {visionStatement}
            </p>
          ) : (
            <p className="text-base text-black leading-6">
              Create your health vision to guide your journey. Define where you want to be in 1-2 years.
            </p>
          )}
          
          <button
            onClick={() => navigate('/vision')}
            className="flex items-center justify-center gap-3 text-green-600 font-bold text-lg hover:gap-4 transition-all"
          >
            <span>View and Edit Vision</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Weekly Sections - Grouped Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Weekly Habits */}
          <div className="bg-[#f3f6ff] border border-[#cdcdcd] rounded-lg p-4 flex flex-col gap-3">
            <h2 className="text-3xl font-bold text-black leading-9">
              Weekly Habits
            </h2>
            
            {formattedHabits.length > 0 ? (
              <div className="flex flex-col gap-1">
                {formattedHabits.map((habitData, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <p className="text-base leading-6 text-black">
                      {habitData.habit}
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-black/80" />
                      <p className="text-sm leading-6 text-black/80">
                        {habitData.schedule}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-black leading-6">
                Set your commitments for this week. Choose 1-2 habits with specific days and times.
              </p>
            )}
            
            <button
              onClick={() => navigate('/habits')}
              className="flex items-center justify-center gap-3 text-green-600 font-bold text-lg hover:gap-4 transition-all"
            >
              <span>Manage Habits</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

          {/* Weekly Reflection */}
          <div className="bg-[#f3f6ff] border border-[#cdcdcd] rounded-lg p-4 flex flex-col gap-3">
            <h2 className="text-3xl font-bold text-black leading-9">
              Weekly Reflection
            </h2>
            
            <p className="text-base text-black leading-6">
              Reflect on your week. What went well? What was challenging? What will you adjust?
            </p>
            
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-black/80" />
              <p className="text-sm leading-6 text-black/80">
                Complete by Sunday each week
              </p>
            </div>
            
            <button
              onClick={() => navigate('/reflection')}
              className="flex items-center justify-center gap-3 text-green-600 font-bold text-lg hover:gap-4 transition-all"
            >
              <span>Start Reflection</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
