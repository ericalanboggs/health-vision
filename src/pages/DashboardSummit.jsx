import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import { getCurrentWeekHabits } from '../services/habitService'
import { getCurrentWeekReflection } from '../services/reflectionService'
import { loadJourney } from '../services/journeyService'
import {
  getCurrentWeekNumber,
  getCurrentWeekDateRange,
} from '../utils/weekCalculator'
import {
  CalendarMonth,
  Science,
  Schedule,
  ArrowForward,
  Terrain,
  CheckCircle,
  OpenInNew,
  HelpOutline,
} from '@mui/icons-material'
import WelcomeModal from '../components/WelcomeModal'
import coachEric from '../assets/coach-eric.jpeg'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Tag,
} from '@summit/design-system'

export default function DashboardSummit() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentHabits, setCurrentHabits] = useState([])
  const [currentReflection, setCurrentReflection] = useState(null)
  const [weekNumber, setWeekNumber] = useState(1)
  const [weekDateRange, setWeekDateRange] = useState('')
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [visionData, setVisionData] = useState({
    visionStatement: '',
    feelingState: '',
    appearanceConfidence: '',
    futureAbilities: '',
    whyMatters: ''
  })

  useEffect(() => {
    const loadDashboardData = async () => {
      const { user } = await getCurrentUser()
      setUser(user)

      const week = getCurrentWeekNumber()
      const dateRange = getCurrentWeekDateRange()
      setWeekNumber(week)
      setWeekDateRange(dateRange)

      const { success, data } = await getCurrentWeekHabits()
      if (success && data) {
        setCurrentHabits(data)
      }

      const reflectionResult = await getCurrentWeekReflection()
      if (reflectionResult.success && reflectionResult.data) {
        setCurrentReflection(reflectionResult.data)
      }

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

  const formatHabits = () => {
    if (currentHabits.length === 0) return []

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

    const habitGroups = {}
    currentHabits.forEach(habit => {
      if (!habitGroups[habit.habit_name]) {
        habitGroups[habit.habit_name] = []
      }
      habitGroups[habit.habit_name].push(habit)
    })

    return Object.entries(habitGroups).map(([habitName, habits]) => {
      const dayNames = ['Sun', 'Mon', 'Tues', 'Weds', 'Thurs', 'Fri', 'Sat']
      const days = habits.map(h => dayNames[h.day_of_week])

      const time = habits[0].reminder_time
      const [hours] = time.split(':')
      const hour = parseInt(hours)
      const timeLabel = timeSlotMap[hour] || `${hour}:00`

      const daysStr = days.join(', ')

      return {
        habit: habitName,
        schedule: `${daysStr} ${timeLabel}.`
      }
    })
  }

  const formattedHabits = formatHabits()

  // Build full vision text
  const getVisionText = () => {
    const parts = []
    if (visionData.visionStatement) parts.push(visionData.visionStatement)
    if (visionData.feelingState) parts.push(visionData.feelingState)
    if (visionData.appearanceConfidence) parts.push(visionData.appearanceConfidence)
    if (visionData.futureAbilities) parts.push(visionData.futureAbilities)
    if (visionData.whyMatters) parts.push(`This matters because ${visionData.whyMatters}`)
    return parts.join(' ')
  }

  const visionText = getVisionText()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">Loading your journey...</p>
      </div>
    )
  }

  return (
    <>
      <WelcomeModal isOpen={showWelcomeModal} onClose={handleCloseWelcomeModal} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <h1 className="text-h1 text-summit-forest mb-8">Welcome to Your Summit</h1>

        {/* Vision Section */}
        <Card
          interactive
          className="mb-8 cursor-pointer border border-gray-200"
          onClick={() => navigate('/vision?view=display')}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-summit-sage">
              <Terrain className="h-8 w-8 text-summit-emerald" />
            </div>

            <div className="flex-1 min-w-0">
              <CardHeader className="mb-3">
                <div className="text-meta text-summit-moss mb-1">YOUR NORTH STAR</div>
                <CardTitle className="text-h3 mb-2">
                  {visionText ? 'Your Health Vision' : 'Create Your Vision'}
                </CardTitle>
                <CardDescription className="line-clamp-3 text-body">
                  {visionText || "Define where you want to be in 1-2 years. Your vision will guide every step of your journey."}
                </CardDescription>
              </CardHeader>

              <Button variant="ghost" rightIcon={<ArrowForward className="h-4 w-4" />}>
                {visionText ? 'View & Edit Vision' : 'Create Vision'}
              </Button>
            </div>
          </div>
        </Card>

        {/* This Week's Climb Section */}
        <div className="mb-8">
          <h2 className="text-h2 text-summit-forest mb-4">This Week's Climb</h2>

          {/* Weekly Sections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Weekly Habits */}
          <Card
            interactive
            className="cursor-pointer border border-gray-200"
            onClick={() => navigate('/habits')}
          >
            <CardHeader className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-summit-sage">
                  <Science className="h-5 w-5 text-summit-emerald" />
                </div>
                <CardTitle className="text-h3">Your Habits</CardTitle>
              </div>

              {formattedHabits.length > 0 ? (
                <div className="space-y-3">
                  {formattedHabits.map((habitData, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-summit-mint border border-summit-sage"
                    >
                      <CheckCircle className="h-5 w-5 text-summit-emerald flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body text-summit-forest font-semibold mb-1">
                          {habitData.habit}
                        </p>
                        <div className="flex items-center gap-2">
                          <Schedule className="h-4 w-4 text-text-muted" />
                          <p className="text-body-sm text-text-muted">
                            {habitData.schedule}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <CardDescription className="text-body">
                  Set your commitments for this week. Choose 1-2 habits with specific days and times.
                </CardDescription>
              )}
            </CardHeader>

            <Button variant="ghost" rightIcon={<ArrowForward className="h-4 w-4" />}>
              {formattedHabits.length > 0 ? 'Manage Habits' : 'Add Habits'}
            </Button>
          </Card>

          {/* Weekly Reflection */}
          <Card
            interactive
            className="cursor-pointer border border-gray-200"
            onClick={() => navigate('/reflection')}
          >
            <CardHeader className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-summit-sage">
                  <CalendarMonth className="h-5 w-5 text-summit-moss" />
                </div>
                <CardTitle className="text-h3">Weekly Reflection</CardTitle>
              </div>

              {currentReflection ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-summit-emerald" />
                    <Tag variant="success" size="sm">
                      Completed {new Date(currentReflection.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Tag>
                  </div>
                  <CardDescription className="text-body">
                    You can update your reflection anytime this week.
                  </CardDescription>
                </div>
              ) : (
                <>
                  <CardDescription className="text-body mb-3">
                    Reflect on your week. What went well? What was challenging? What will you adjust?
                  </CardDescription>
                  <div className="flex items-center gap-2">
                    <Schedule className="h-4 w-4 text-text-muted" />
                    <p className="text-body-sm text-text-muted">
                      Complete by Sunday each week
                    </p>
                  </div>
                </>
              )}
            </CardHeader>

            <Button variant="ghost" rightIcon={<ArrowForward className="h-4 w-4" />}>
              {currentReflection ? 'Update Reflection' : 'Start Reflection'}
            </Button>
          </Card>
          </div>
        </div>

        {/* Coaching Section */}
        <Card className="border border-gray-200">
          <div className="flex items-start gap-4">
            <img
              src={coachEric}
              alt="Coach Eric"
              className="h-14 w-14 rounded-xl object-cover flex-shrink-0"
            />

            <div className="flex-1 min-w-0">
              <CardHeader className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-h2">Coaching</CardTitle>
                  <div className="relative group/tooltip">
                    <HelpOutline className="h-5 w-5 text-text-muted hover:text-summit-forest cursor-help transition" />
                    <div className="absolute left-0 top-8 w-80 bg-summit-forest text-white p-4 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-10">
                      <p className="font-semibold mb-2">What coaching means in Summit</p>
                      <p className="text-sm leading-relaxed">This isn't someone telling you how to live your life. Coaching is about being heard, thinking things through together, and recognizing that you already have the answers—you just may need space and support to uncover them.</p>
                      <div className="absolute -top-2 left-4 w-4 h-4 bg-summit-forest transform rotate-45"></div>
                    </div>
                  </div>
                </div>
                <Tag size="sm" variant="secondary" className="w-fit mb-2">
                  Optional 30 minute session
                </Tag>
                <CardDescription className="leading-relaxed">
                  Need a hand? Schedule a session with Coach Eric to workshop challenges and make a plan.
                </CardDescription>
              </CardHeader>

              <Button
                variant="ghost"
                rightIcon={<OpenInNew className="h-4 w-4" />}
                onClick={(e) => {
                  e.stopPropagation()
                  window.open('https://cal.com/eric-boggs/30min', '_blank', 'noopener,noreferrer')
                }}
              >
                Schedule Session
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </>
  )
}
