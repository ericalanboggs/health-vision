import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, signOut } from '../services/authService'
import { getCurrentWeekHabits } from '../services/habitService'
import { loadJourney } from '../services/journeyService'
import {
  getCurrentWeekNumber,
  getCurrentWeekDateRange,
  getPilotStartDate,
  getWeekStartDate,
  getWeekEndDate,
} from '../utils/weekCalculator'
import { Calendar, Target, LogOut, User, Clock, ArrowRight, Flag } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentHabits, setCurrentHabits] = useState([])
  const [weekNumber, setWeekNumber] = useState(1)
  const [weekDateRange, setWeekDateRange] = useState('')
  const [pilotTimelineText, setPilotTimelineText] = useState('')
  const [visionData, setVisionData] = useState({
    visionStatement: '',
    feelingState: '',
    appearanceConfidence: '',
    futureAbilities: '',
    whyMatters: ''
  })

  const formatPilotTimeline = () => {
    const pilotStart = getPilotStartDate()
    const today = new Date()
    pilotStart.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    console.log('DEBUG: today =', today.toISOString())
    console.log('DEBUG: pilotStart =', pilotStart.toISOString())
    console.log('DEBUG: today < pilotStart =', today < pilotStart)

    const formatDate = (date, includeYear = false) =>
      date.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        ...(includeYear ? { year: '2-digit' } : {}),
      })

    if (today < pilotStart) {
      console.log('DEBUG: Returning "Starts" message')
      return `Starts ${formatDate(pilotStart, true)}`
    }

    const week4End = getWeekEndDate(4)
    week4End.setHours(0, 0, 0, 0)
    
    console.log('DEBUG: week4End =', week4End.toISOString())
    console.log('DEBUG: today > week4End =', today > week4End)
    
    if (today > week4End) {
      console.log('DEBUG: Returning "Pilot Complete"')
      return 'Pilot Complete'
    }

    const diffTime = today - pilotStart
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const currentWeek = Math.floor(diffDays / 7) + 1

    console.log('DEBUG: currentWeek =', currentWeek)

    const weekStart = getWeekStartDate(currentWeek)
    const weekEnd = getWeekEndDate(currentWeek)
    return `Week ${currentWeek}: ${formatDate(weekStart)}-${formatDate(weekEnd)}`
  }

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
      if (journeyResult.success && journeyResult.data?.form_data) {
        const formData = journeyResult.data.form_data
        setVisionData({
          visionStatement: formData.visionStatement || '',
          feelingState: formData.feelingState || '',
          appearanceConfidence: formData.appearanceConfidence || '',
          futureAbilities: formData.futureAbilities || '',
          whyMatters: formData.whyMatters || ''
        })
      }
      
      setPilotTimelineText(formatPilotTimeline())
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section - Moved to Top */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-stone-800 mb-2">
            Welcome to Your Summit Pilot 🏔️
          </h3>
          <p className="text-stone-600 mb-2">
            This is a 4-week pilot program to help you build sustainable health habits. 
            Each week, commit to 1-2 habits and reflect on your progress. 
            You'll receive gentle SMS reminders at the times you choose.
          </p>
          <p className="text-stone-600">
            <span className="font-semibold">Pilot Timeline:</span>{' '}
            {pilotTimelineText || `Week ${weekNumber} (${weekDateRange})`}
          </p>
        </div>

        {/* Vision Section */}
        <button
          onClick={() => navigate('/vision')}
          className="w-full bg-white rounded-2xl shadow-lg p-8 text-left hover:shadow-xl transition group mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition">
              <Flag className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-2">
            Your Vision
          </h2>
          
          {visionData.visionStatement || visionData.feelingState || visionData.whyMatters ? (
            <p className="text-stone-600 mb-4 line-clamp-3">
              {visionData.visionStatement && visionData.visionStatement}
              {visionData.feelingState && (
                <>{visionData.visionStatement && ' '}{visionData.feelingState}</>
              )}
              {visionData.appearanceConfidence && (
                <>{(visionData.visionStatement || visionData.feelingState) && ' '}{visionData.appearanceConfidence}</>
              )}
              {visionData.futureAbilities && (
                <>{(visionData.visionStatement || visionData.feelingState || visionData.appearanceConfidence) && ' '}{visionData.futureAbilities}</>
              )}
              {visionData.whyMatters && (
                <>{(visionData.visionStatement || visionData.feelingState || visionData.appearanceConfidence || visionData.futureAbilities) && ' '}This matters because {visionData.whyMatters}</>
              )}
            </p>
          ) : (
            <p className="text-stone-600 mb-4">
              Create your health vision to guide your journey. Define where you want to be in 1-2 years.
            </p>
          )}
          
          <div className="text-blue-600 font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
            {visionData.visionStatement ? 'View & Edit Vision' : 'Create Vision'}
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>

        {/* Weekly Sections - Grouped Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weekly Habits */}
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
            
            {formattedHabits.length > 0 ? (
              <div className="mb-4 space-y-3">
                {formattedHabits.map((habitData, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <p className="text-base leading-6 text-stone-700">
                      {habitData.habit}
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-stone-600" />
                      <p className="text-sm leading-6 text-stone-600">
                        {habitData.schedule}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-600 mb-4">
                Set your commitments for this week. Choose 1-2 habits with specific days and times.
              </p>
            )}
            
            <div className="text-green-600 font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
              Manage Habits
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          {/* Weekly Reflection */}
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
            <p className="text-stone-600 mb-2">
              Reflect on your week. What went well? What was challenging? What will you adjust?
            </p>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-stone-600" />
              <p className="text-sm text-stone-600">
                Complete by Sunday each week
              </p>
            </div>
            <div className="text-amber-600 font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
              Start Reflection
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}
