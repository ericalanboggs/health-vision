import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import { getCurrentWeekHabits } from '../services/habitService'
import { getCurrentWeekReflection } from '../services/reflectionService'
import { loadJourney } from '../services/journeyService'
import {
  getCurrentWeekNumber,
  getCurrentWeekDateRange,
  getPilotStartDate,
  getWeekStartDate,
  getWeekEndDate,
} from '../utils/weekCalculator'
import { formatDaysDisplay } from '../utils/formatDays'
import { Calendar, Beaker, Clock, ArrowRight, Mountain, CheckCircle, ExternalLink } from 'lucide-react'
import TopNav from '../components/TopNav'
import WelcomeModal from '../components/WelcomeModal'
import coachEric from '../assets/coach-eric.jpeg'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentHabits, setCurrentHabits] = useState([])
  const [currentReflection, setCurrentReflection] = useState(null)
  const [weekNumber, setWeekNumber] = useState(1)
  const [weekDateRange, setWeekDateRange] = useState('')
  const [pilotTimelineText, setPilotTimelineText] = useState('')
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
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
    
    // Don't modify the original pilotStart date - it's already correctly set
    const todayMidnight = new Date(today)
    todayMidnight.setHours(0, 0, 0, 0)

    console.log('DEBUG DASHBOARD: today =', today.toISOString())
    console.log('DEBUG DASHBOARD: pilotStart =', pilotStart.toISOString())
    console.log('DEBUG DASHBOARD: pilotStart date =', pilotStart.toDateString())
    console.log('DEBUG DASHBOARD: today < pilotStart =', todayMidnight < pilotStart)

    const formatDate = (date, includeYear = false) => {
      // Use UTC-based formatting to avoid timezone issues
      const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000))
      const options = { 
        month: 'numeric', 
        day: 'numeric',
        timeZone: 'UTC'
      }
      
      if (includeYear) {
        options.year = '2-digit'
      }
      
      return utcDate.toLocaleDateString('en-US', options)
    }

    // Before Week 1 starts
    if (todayMidnight < pilotStart) {
      console.log('DEBUG: Returning "Starts" message')
      return `Pilot Week 1: Starts ${formatDate(pilotStart, true)}`
    }

    // Calculate week ranges based on the actual pilot start date
    const week1Start = new Date(pilotStart)
    const week1End = new Date(week1Start)
    week1End.setDate(week1End.getDate() + 6)
    
    if (today >= week1Start && today <= week1End) {
      return `Pilot Week 1: Monday ${formatDate(week1Start)} - Sunday ${formatDate(week1End)}`
    }

    // Week 2: 7 days after week 1 starts
    const week2Start = new Date(week1Start)
    week2Start.setDate(week2Start.getDate() + 7)
    const week2End = new Date(week2Start)
    week2End.setDate(week2End.getDate() + 6)
    
    if (today >= week2Start && today <= week2End) {
      return `Pilot Week 2: Monday ${formatDate(week2Start)} - Sunday ${formatDate(week2End)}`
    }

    // Week 3: 14 days after week 1 starts
    const week3Start = new Date(week1Start)
    week3Start.setDate(week3Start.getDate() + 14)
    const week3End = new Date(week3Start)
    week3End.setDate(week3End.getDate() + 6)
    
    if (today >= week3Start && today <= week3End) {
      return `Pilot Week 3: Monday ${formatDate(week3Start)} - Sunday ${formatDate(week3End)}`
    }

    // After Week 3
    return 'Pilot Complete'
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
      
      // Load current week's reflection
      const reflectionResult = await getCurrentWeekReflection()
      if (reflectionResult.success && reflectionResult.data) {
        setCurrentReflection(reflectionResult.data)
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
      
      // Check if this is the user's first time on dashboard
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true)
      }
      
      setLoading(false)
    }

    loadDashboardData()
  }, [])

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false)
    localStorage.setItem('hasSeenWelcome', 'true')
  }

  // Format habits into readable format with separate habit and schedule
  const formatHabits = () => {
    if (currentHabits.length === 0) return []

    // Time slot mapping (hour -> simplified label)
    const timeSlotMap = {
      6: 'early morning',
      7: 'early morning',
      8: 'mid-morning',
      9: 'mid-morning',
      12: 'lunch time',
      13: 'early afternoon',
      14: 'early afternoon',
      15: 'afternoon',
      16: 'afternoon',
      17: 'after work',
      18: 'after work',
      21: 'before bedtime'
    }

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
      const dayNames = ['Sun', 'Mon', 'Tues', 'Weds', 'Thurs', 'Fri', 'Sat']
      const days = habits.map(h => dayNames[h.day_of_week])
      
      // Get time label from mapping
      const time = habits[0].reminder_time
      const [hours] = time.split(':')
      const hour = parseInt(hours)
      const timeLabel = timeSlotMap[hour] || `${hour}:00`
      
      // Format days as comma-separated list
      const daysStr = days.join(', ')
      
      return {
        habit: habitName,
        schedule: `${daysStr} ${timeLabel}.`
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
      <TopNav />
      
      {/* Welcome Modal */}
      <WelcomeModal isOpen={showWelcomeModal} onClose={handleCloseWelcomeModal} />

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
          onClick={() => navigate('/vision?view=display')}
          className="w-full bg-white rounded-2xl shadow-lg p-8 text-left hover:shadow-xl transition group mb-6"
        >
          <div className="flex items-start gap-4">
            {/* Vision Icon */}
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition flex-shrink-0">
              <Mountain className="w-8 h-8 text-blue-600" />
            </div>
            
            {/* Content */}
            <div className="flex-1">
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
            </div>
          </div>
        </button>

        {/* Weekly Sections - Grouped Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weekly Habits */}
          <button
            onClick={() => navigate('/habits')}
            className="bg-white rounded-2xl shadow-lg p-8 text-left hover:shadow-xl transition group"
          >
            <div className="flex items-start gap-4">
              {/* Habits Icon */}
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition flex-shrink-0">
                <Beaker className="w-8 h-8 text-green-600" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
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
              </div>
            </div>
          </button>

          {/* Weekly Reflection */}
          <button
            onClick={() => navigate('/reflection')}
            className="bg-white rounded-2xl shadow-lg p-8 text-left hover:shadow-xl transition group"
          >
            <div className="flex items-start gap-4">
              {/* Reflection Icon */}
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition flex-shrink-0">
                <Calendar className="w-8 h-8 text-amber-600" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-stone-800 mb-2">
                  Weekly Reflection
                </h2>
                
                {currentReflection ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-green-700 font-medium">
                        Completed {new Date(currentReflection.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <p className="text-stone-600 mb-4">
                      You can update your reflection anytime this week.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-stone-600 mb-4">
                      Reflect on your week. What went well? What was challenging? What will you adjust?
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-stone-600" />
                      <p className="text-sm text-stone-600">
                        Complete by Sunday each week
                      </p>
                    </div>
                  </>
                )}
                
                <div className="text-amber-600 font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
                  {currentReflection ? 'Update Reflection' : 'Start Reflection'}
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Coaching Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-left hover:shadow-xl transition group mt-6">
          <div className="flex items-start gap-4">
            {/* Coach Avatar */}
            <img 
              src={coachEric} 
              alt="Coach Eric" 
              className="w-14 h-14 rounded-xl object-cover group-hover:shadow-lg transition"
            />
            
            {/* Content */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-stone-800 mb-1">
                Coaching
              </h2>
              <p className="text-stone-600 font-medium mb-3">
                Optional 30 minute session
              </p>
              
              <p className="text-stone-600 mb-4 leading-relaxed">
                Need a hand? Schedule a session with Coach Eric to workshop challenges and make a plan.
              </p>
              
              <a 
                href="https://cal.com/eric-boggs/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-amber-600 font-semibold group-hover:gap-3 transition-all hover:text-amber-700"
              >
                Schedule Session
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
