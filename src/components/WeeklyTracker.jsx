import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react'
import { getEntriesForWeek, saveEntry, getStreak } from '../services/trackingService'
import { getHabitScheduleDays } from '../services/habitService'
import {
  getCurrentWeekStart,
  getWeekDates,
  formatDateForDB,
  getFullDayName,
  formatWeekOfHeader,
  isToday,
  isDateInFuture,
  canNavigateToPreviousWeek,
  canNavigateToNextWeek,
  getPreviousWeekStart,
  getNextWeekStart
} from '../utils/habitSchedule'
import { getUnitByValue } from '../constants/metricUnits'

// Celebratory messages for successful entry
const CELEBRATION_MESSAGES = [
  'Nice!',
  'Great job!',
  'Good effort!',
  'Heck yes!',
  'Awesome!',
  'Keep it up!',
  'Crushed it!',
  'Way to go!',
  'You rock!',
  'Nailed it!',
  'On fire!',
  'Boom!',
  'Yes!',
  'Killing it!',
  'Legend!',
]

/**
 * Get a random celebration with a unique timestamp for animation key
 */
function getRandomCelebration() {
  return {
    message: CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)],
    timestamp: Date.now()
  }
}

// Confetti particle configurations
const CONFETTI_PARTICLES = [
  { x: 0, y: -25, color: '#22c55e' },
  { x: 18, y: -18, color: '#16a34a' },
  { x: -18, y: -18, color: '#4ade80' },
  { x: 25, y: 0, color: '#fbbf24' },
  { x: -25, y: 0, color: '#f59e0b' },
  { x: 12, y: -22, color: '#86efac' },
  { x: -12, y: -22, color: '#fb923c' },
  { x: 0, y: -30, color: '#a3e635' },
]

/**
 * Mini confetti component that appears near the field
 */
function MiniConfetti() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible', zIndex: 50 }}>
      {CONFETTI_PARTICLES.map((particle, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
          style={{
            backgroundColor: particle.color,
            animation: `confetti-burst-${i} 0.7s ease-out forwards`,
            animationDelay: `${i * 0.02}s`,
          }}
        />
      ))}
      <style>{`
        ${CONFETTI_PARTICLES.map((p, i) => `
          @keyframes confetti-burst-${i} {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            80% {
              opacity: 1;
            }
            100% {
              transform: translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) scale(0.5);
              opacity: 0;
            }
          }
        `).join('')}
      `}</style>
    </div>
  )
}

/**
 * WeeklyTracker - Vertical list for tracking habit completion
 * Shows only scheduled days with navigation between weeks
 */
export default function WeeklyTracker({
  habitName,
  trackingType,
  metricUnit,
  metricTarget
}) {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart())
  const [scheduledDays, setScheduledDays] = useState([])
  const [entries, setEntries] = useState({})
  const [localInputs, setLocalInputs] = useState({}) // Track typing separately
  const [loading, setLoading] = useState(true)
  const [savingDate, setSavingDate] = useState(null)
  const [celebrations, setCelebrations] = useState({}) // Track which fields are celebrating
  const [streak, setStreak] = useState(0)

  const currentWeekStart = getCurrentWeekStart()
  const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime()

  // Load streak
  const loadStreak = async (days) => {
    const { success, data } = await getStreak(habitName, days, trackingType)
    if (success && data) {
      setStreak(data.streak)
    }
  }

  // Load scheduled days and entries when habit or week changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      // Get scheduled days for this habit
      const { success: daysSuccess, data: days } = await getHabitScheduleDays(habitName)
      if (daysSuccess) {
        setScheduledDays(days || [])
        // Load streak after we have scheduled days
        loadStreak(days || [])
      }

      // Get entries for this week
      const { success: entriesSuccess, data: weekEntries } = await getEntriesForWeek(habitName, weekStart)
      if (entriesSuccess && weekEntries) {
        // Convert entries array to a map keyed by date string
        const entriesMap = {}
        weekEntries.forEach(entry => {
          entriesMap[entry.entry_date] = entry
        })
        setEntries(entriesMap)
      }

      setLoading(false)
    }

    loadData()
  }, [habitName, weekStart, trackingType])

  const handlePreviousWeek = () => {
    if (canNavigateToPreviousWeek(weekStart)) {
      setWeekStart(getPreviousWeekStart(weekStart))
    }
  }

  const handleNextWeek = () => {
    if (canNavigateToNextWeek(weekStart)) {
      setWeekStart(getNextWeekStart(weekStart))
    }
  }

  const handleBooleanToggle = async (date) => {
    const dateStr = formatDateForDB(date)
    const currentEntry = entries[dateStr]
    const newValue = currentEntry?.completed !== true

    setSavingDate(dateStr)

    const { success, data } = await saveEntry(habitName, date, newValue, 'boolean')

    if (success) {
      setEntries(prev => ({
        ...prev,
        [dateStr]: data
      }))

      // Trigger celebration when marking as completed, remove if unchecked
      if (newValue === true) {
        setCelebrations(prev => ({
          ...prev,
          [dateStr]: getRandomCelebration()
        }))
      } else {
        // Remove celebration when unchecking
        setCelebrations(prev => {
          const { [dateStr]: _, ...rest } = prev
          return rest
        })
      }

      // Reload streak after saving
      loadStreak(scheduledDays)
    }

    setSavingDate(null)
  }

  // Handle typing - just update local state, don't save yet
  const handleMetricChange = (date, value) => {
    const dateStr = formatDateForDB(date)
    setLocalInputs(prev => ({
      ...prev,
      [dateStr]: value
    }))
  }

  // Handle blur - save to database when user clicks out
  const handleMetricBlur = async (date) => {
    const dateStr = formatDateForDB(date)
    const value = localInputs[dateStr]

    // If no local change, nothing to save
    if (value === undefined) return

    // Empty value - clear the entry
    if (value === '') {
      setEntries(prev => ({
        ...prev,
        [dateStr]: { ...prev[dateStr], metric_value: null }
      }))
      // Clear local input after updating entries
      setLocalInputs(prev => {
        const { [dateStr]: _, ...rest } = prev
        return rest
      })
      return
    }

    const numValue = parseFloat(value)

    // Invalid value - revert to previous, clear local
    if (isNaN(numValue) || numValue < 0) {
      setLocalInputs(prev => {
        const { [dateStr]: _, ...rest } = prev
        return rest
      })
      return
    }

    // Update entries immediately with the new value (optimistic update)
    setEntries(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], metric_value: numValue }
    }))

    // Clear local input now that entries has the value
    setLocalInputs(prev => {
      const { [dateStr]: _, ...rest } = prev
      return rest
    })

    // Save to database in background
    setSavingDate(dateStr)
    const { success, data } = await saveEntry(habitName, date, numValue, 'metric')
    if (success) {
      setEntries(prev => ({
        ...prev,
        [dateStr]: data
      }))

      // Trigger celebration for successful metric entry
      setCelebrations(prev => ({
        ...prev,
        [dateStr]: getRandomCelebration()
      }))

      // Reload streak after saving
      loadStreak(scheduledDays)
    }
    setSavingDate(null)
  }

  const weekDates = getWeekDates(weekStart)
  const unitInfo = getUnitByValue(metricUnit)
  const unitLabel = unitInfo?.label?.split(' ')[0] || metricUnit || ''

  // Filter to only show scheduled days
  const scheduledDates = weekDates.filter(date => scheduledDays.includes(date.getDay()))

  if (loading) {
    return (
      <div className="py-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
          <span className="ml-2 text-stone-600 text-sm">Loading tracker...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2" style={{ overflow: 'visible' }}>
      {/* Week Header with Navigation and Streak */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousWeek}
            disabled={!canNavigateToPreviousWeek(weekStart)}
            className="p-1 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-stone-700">
            {formatWeekOfHeader(weekStart)}
          </span>
          <button
            onClick={handleNextWeek}
            disabled={!canNavigateToNextWeek(weekStart)}
            className="p-1 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Streak Display */}
        {streak > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-base">🔥</span>
            <span className="text-sm font-medium text-stone-600">
              {streak} day streak
            </span>
          </div>
        )}
      </div>

      {/* Vertical Day List */}
      {scheduledDates.length === 0 ? (
        <div className="text-center py-4 text-stone-500 text-sm">
          No scheduled days this week
        </div>
      ) : (
        <div className="space-y-2" style={{ overflow: 'visible' }}>
          {scheduledDates.map(date => {
            const dateStr = formatDateForDB(date)
            const entry = entries[dateStr]
            const isTodayDate = isToday(date)
            const isFuture = isDateInFuture(date)
            const isSaving = savingDate === dateStr
            const canEdit = !isFuture // Allow editing any past or current date
            const celebration = celebrations[dateStr]

            return (
              <div
                key={dateStr}
                style={{ overflow: 'visible' }}
                className={`flex items-center justify-between py-2 ${
                  isTodayDate ? 'bg-green-50 -mx-2 px-2 rounded-lg' : ''
                } ${isFuture ? 'opacity-50' : ''}`}
              >
                {/* Full Day Name with Date */}
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${
                    isTodayDate ? 'font-medium text-green-700' : 'text-stone-700'
                  }`}>
                    {getFullDayName(date)}
                    {isTodayDate ? (
                      <span className="ml-2 text-xs text-green-600">(Today)</span>
                    ) : (
                      <span className="ml-2 text-stone-500">({date.getMonth() + 1}/{date.getDate()})</span>
                    )}
                  </span>
                  {/* Celebration message */}
                  {celebration && (
                    <span className="text-sm font-medium text-green-600 animate-fade-in">
                      {celebration.message}
                    </span>
                  )}
                </div>

                {/* Boolean Tracking - Checkbox */}
                {trackingType === 'boolean' && (
                  <div className="relative" style={{ overflow: 'visible' }}>
                    {celebration && <MiniConfetti key={celebration.timestamp} />}
                    <button
                      onClick={() => canEdit && handleBooleanToggle(date)}
                      disabled={!canEdit || isSaving}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                        entry?.completed === true
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-stone-300 hover:border-green-400'
                      } ${!canEdit || isSaving ? 'cursor-not-allowed opacity-50' : ''}`}
                      aria-label={entry?.completed ? 'Completed' : 'Not completed'}
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : entry?.completed === true ? (
                        <Check className="w-4 h-4" />
                      ) : null}
                    </button>
                  </div>
                )}

                {/* Metric Tracking - Input Field */}
                {trackingType === 'metric' && (
                  <div className="flex items-center gap-2" style={{ overflow: 'visible' }}>
                    <div className="relative" style={{ overflow: 'visible' }}>
                      {celebration && <MiniConfetti key={celebration.timestamp} />}
                      <input
                        type="text"
                        inputMode="decimal"
                        value={localInputs[dateStr] !== undefined ? localInputs[dateStr] : (entry?.metric_value ?? '')}
                        onChange={(e) => handleMetricChange(date, e.target.value)}
                        onBlur={() => handleMetricBlur(date)}
                        disabled={!canEdit || isSaving}
                        placeholder="—"
                        className={`w-20 text-center text-sm py-1.5 px-2 border rounded-lg transition ${
                          entry?.metric_value !== undefined && entry?.metric_value !== null
                            ? metricTarget && entry.metric_value >= metricTarget
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-stone-300 bg-white'
                            : 'border-stone-200 bg-white text-stone-400'
                        } ${!canEdit ? 'cursor-not-allowed opacity-50' : ''} focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                        aria-label={`${getFullDayName(date)} value`}
                      />
                    </div>
                    {unitLabel && (
                      <span className="text-xs text-stone-500 w-12">
                        {unitLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
