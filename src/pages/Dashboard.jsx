import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import { getCurrentWeekHabits } from '../services/habitService'
import { getCurrentWeekReflection } from '../services/reflectionService'
import { loadJourney } from '../services/journeyService'
import { getStreak, getHabitStats, getAllTrackingConfigs } from '../services/trackingService'
import {
  getCurrentWeekNumber,
  getCurrentWeekDateRange,
  getWeekStartDate,
  getWeekEndDate,
} from '../utils/weekCalculator'
import { formatDaysDisplay } from '../utils/formatDays'
import { extractVisionAdjectives } from '../utils/aiService'

// Cache keys
const VISION_ADJECTIVES_CACHE_KEY = 'health_summit_vision_adjectives'

// Load cached vision adjectives
const loadCachedVisionAdjectives = (visionHash) => {
  try {
    const cached = localStorage.getItem(VISION_ADJECTIVES_CACHE_KEY)
    if (cached) {
      const { hash, adjectives } = JSON.parse(cached)
      if (hash === visionHash) return adjectives
    }
  } catch (e) {
    console.warn('Failed to load cached vision adjectives:', e)
  }
  return null
}

// Save vision adjectives to cache
const saveCachedVisionAdjectives = (visionHash, adjectives) => {
  try {
    localStorage.setItem(VISION_ADJECTIVES_CACHE_KEY, JSON.stringify({
      hash: visionHash,
      adjectives
    }))
  } catch (e) {
    console.warn('Failed to cache vision adjectives:', e)
  }
}

// Simple hash function for vision text
const hashString = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString()
}
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
import TopNav from '../components/TopNav'
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

export default function Dashboard() {
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
  const [visionAdjectives, setVisionAdjectives] = useState('Your Health Vision')
  const [habitSummaries, setHabitSummaries] = useState({})
  const [habitStats, setHabitStats] = useState({})
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

  // Headroom behavior for nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setHeaderVisible(false)
      } else {
        setHeaderVisible(true)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const loadDashboardData = async () => {
      // Get current week info (sync - instant)
      const week = getCurrentWeekNumber()
      const dateRange = getCurrentWeekDateRange()
      setWeekNumber(week)
      setWeekDateRange(dateRange)

      // Get user first (single auth call)
      const userResult = await getCurrentUser()
      const userId = userResult.user?.id
      setUser(userResult.user)

      if (!userId) {
        setLoading(false)
        return
      }

      // Run all data fetches in parallel, passing userId to avoid duplicate auth calls
      const [
        habitsResult,
        reflectionResult,
        journeyResult,
        configsResult
      ] = await Promise.all([
        getCurrentWeekHabits(userId),
        getCurrentWeekReflection(userId),
        loadJourney(userId),
        getAllTrackingConfigs(userId)
      ])

      // Process reflection
      if (reflectionResult.success && reflectionResult.data) {
        setCurrentReflection(reflectionResult.data)
      }

      // Process vision (with caching for adjectives)
      if (journeyResult.success && journeyResult.data?.form_data) {
        const formData = journeyResult.data.form_data
        setVisionData({
          visionStatement: formData.visionStatement || '',
          feelingState: formData.feelingState || '',
          appearanceConfidence: formData.appearanceConfidence || '',
          futureAbilities: formData.futureAbilities || '',
          whyMatters: formData.whyMatters || ''
        })

        // Extract adjectives from vision statement (with caching)
        const fullVisionText = [
          formData.visionStatement,
          formData.feelingState,
          formData.appearanceConfidence,
          formData.futureAbilities,
          formData.whyMatters
        ].filter(Boolean).join(' ')

        if (fullVisionText) {
          const visionHash = hashString(fullVisionText)
          const cachedAdjectives = loadCachedVisionAdjectives(visionHash)

          if (cachedAdjectives) {
            setVisionAdjectives(cachedAdjectives)
          } else {
            // Don't block on this - fire and forget
            extractVisionAdjectives(fullVisionText)
              .then(adjectives => {
                setVisionAdjectives(adjectives)
                saveCachedVisionAdjectives(visionHash, adjectives)
              })
              .catch(error => console.error('Failed to extract vision adjectives:', error))
          }
        }
      }

      // Process habits
      if (habitsResult.success && habitsResult.data) {
        const data = habitsResult.data
        setCurrentHabits(data)

        const uniqueHabits = [...new Set(data.map(h => h.habit_name))]

        // Use habit names directly (no AI summarization)
        const summaryPromises = uniqueHabits.map(habitName => {
          return Promise.resolve({ habitName, summary: habitName })
        })

        // Process habit stats in parallel
        const weekStart = getWeekStartDate(week)
        const weekEnd = getWeekEndDate(week)

        const statsPromises = uniqueHabits.map(async habitName => {
          try {
            const habitData = data.filter(h => h.habit_name === habitName)
            const scheduledDays = habitData.map(h => h.day_of_week)

            const config = configsResult.success
              ? configsResult.data.find(c => c.habit_name === habitName)
              : null

            if (config && config.tracking_enabled) {
              const [streakResult, statsResult] = await Promise.all([
                getStreak(habitName, scheduledDays, config.tracking_type, userId),
                getHabitStats(habitName, weekStart, weekEnd, userId)
              ])

              return {
                habitName,
                stats: {
                  streak: streakResult.success ? streakResult.data.streak : 0,
                  weekStats: statsResult.success ? statsResult.data : null,
                  config
                }
              }
            }
            return { habitName, stats: null }
          } catch (error) {
            console.error(`Failed to fetch stats for ${habitName}:`, error)
            return { habitName, stats: null }
          }
        })

        // Wait for summaries and stats in parallel
        const [summaryResults, statsResults] = await Promise.all([
          Promise.all(summaryPromises),
          Promise.all(statsPromises)
        ])

        // Build summaries object
        const summaries = {}
        summaryResults.forEach(({ habitName, summary }) => {
          summaries[habitName] = summary
        })
        setHabitSummaries(summaries)

        // Build stats object
        const stats = {}
        statsResults.forEach(({ habitName, stats: habitStats }) => {
          if (habitStats) {
            stats[habitName] = habitStats
          }
        })
        setHabitStats(stats)
      }

      // Check if this is the user's first time on dashboard
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true)
      }

      setLoading(false)
    }

    loadDashboardData()
  }, [])

  // Refresh habits when user returns to the tab (prevents stale data)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        const habitsResult = await getCurrentWeekHabits(user.id)
        if (habitsResult.success && habitsResult.data) {
          setCurrentHabits(habitsResult.data)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false)
    localStorage.setItem('hasSeenWelcome', 'true')
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
      // Deduplicate day indices in case of duplicate entries
      const dayIndices = [...new Set(habits.map(h => h.day_of_week))].sort((a, b) => a - b)
      const dayCount = dayIndices.length

      let daysStr = ''

      // Check for special cases
      const isWeekdays = dayIndices.length === 5 &&
        dayIndices.every(d => d >= 1 && d <= 5)
      const isWeekend = dayIndices.length === 2 &&
        dayIndices.includes(0) && dayIndices.includes(6)
      const isDaily = dayIndices.length === 7

      if (isDaily) {
        daysStr = 'Daily'
      } else if (isWeekdays) {
        daysStr = 'Weekdays'
      } else if (isWeekend) {
        daysStr = 'Weekends'
      } else if (dayCount === 1) {
        // Full day name for single day
        const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        daysStr = fullDayNames[dayIndices[0]]
      } else if (dayCount === 2) {
        // Abbreviated for 2 days
        const abbrevNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        daysStr = dayIndices.map(d => abbrevNames[d]).join(', ')
      } else {
        // Single letter for 3+ days
        const singleLetter = ['S', 'M', 'T', 'W', 'Th', 'F', 'S']
        daysStr = dayIndices.map(d => singleLetter[d]).join(',')
      }

      return {
        habit: habitName,
        schedule: daysStr
      }
    })
  }

  const formattedHabits = formatHabits()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <p className="text-text-secondary">Loading your journey...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      <div className={`sticky top-0 z-10 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <TopNav />
      </div>

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

            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardHeader>
                <div className="text-meta text-summit-moss mb-1">YOUR HEALTH VISION</div>
                <CardTitle className="text-h3">
                  {visionData?.visionStatement || visionData?.feelingState || visionData?.whyMatters ? visionAdjectives : 'Create Your Vision'}
                </CardTitle>
              </CardHeader>

              <Button variant="ghost" rightIcon={<ArrowForward className="h-4 w-4" />} className="flex-shrink-0">
                {visionData?.visionStatement ? 'View & Edit Vision' : 'Create Vision'}
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
                  {formattedHabits.map((habitData, index) => {
                    const stats = habitStats[habitData.habit]
                    const hasStreak = stats && stats.streak > 0
                    const weekTotal = stats?.weekStats?.totalMetric

                    return (
                      <div
                        key={index}
                        className="flex flex-col gap-2 p-3 rounded-lg bg-summit-mint border border-summit-sage"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-body text-summit-forest font-semibold">
                            {habitSummaries[habitData.habit] || habitData.habit}
                          </p>
                          {hasStreak ? (
                            <span className="text-body-sm text-summit-emerald font-semibold flex-shrink-0">
                              🔥 {stats.streak} {stats.streak === 1 ? 'day' : 'days'}
                            </span>
                          ) : weekTotal ? (
                            <span className="text-body-sm text-text-muted flex-shrink-0">
                              ✓ {Math.round(weekTotal)} {stats.config.metric_unit}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Schedule className="h-4 w-4 text-text-muted" />
                          <p className="text-body-sm text-text-muted">
                            {habitData.schedule}
                          </p>
                        </div>
                      </div>
                    )
                  })}
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

            <Button variant="primary" rightIcon={<ArrowForward className="h-4 w-4" />}>
              {currentReflection ? 'Update Reflection' : 'Start Reflection'}
            </Button>
          </Card>
          </div>
        </div>

        {/* Coaching Section */}
        <Card className="border border-gray-200">
          <CardHeader className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={coachEric}
                alt="Coach Eric"
                className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
              />
              <CardTitle className="text-h3">Coaching</CardTitle>
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
            <CardDescription className="text-body mb-3">
              Need a hand? Schedule a session with Coach Eric to workshop challenges and make a plan.
            </CardDescription>
          </CardHeader>

          <Button
            variant="primary"
            rightIcon={<OpenInNew className="h-4 w-4" />}
            onClick={(e) => {
              e.stopPropagation()
              window.open('https://cal.com/eric-boggs/30min', '_blank', 'noopener,noreferrer')
            }}
          >
            Schedule Session
          </Button>
        </Card>
      </main>
    </div>
  )
}
