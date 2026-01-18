import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Check, X } from 'lucide-react'
import { getEntriesForWeek, saveEntry } from '../services/trackingService'
import { getHabitScheduleDays } from '../services/habitService'
import {
  getCurrentWeekStart,
  getWeekDates,
  formatWeekRange,
  formatDateForDB,
  getDayWithDate,
  isDateInPast,
  isToday,
  isDateInFuture,
  canNavigateToPreviousWeek,
  canNavigateToNextWeek,
  getPreviousWeekStart,
  getNextWeekStart,
  canBackfillDate
} from '../utils/habitSchedule'
import { getUnitByValue } from '../constants/metricUnits'

/**
 * WeeklyTracker - Visual week grid for tracking habit completion
 * Shows only scheduled days with navigation between weeks
 */
export default function WeeklyTracker({
  habitName,
  trackingType,
  metricUnit,
  metricTarget,
  onClose
}) {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart())
  const [scheduledDays, setScheduledDays] = useState([])
  const [entries, setEntries] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingDate, setSavingDate] = useState(null)

  const currentWeekStart = getCurrentWeekStart()
  const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime()

  // Load scheduled days and entries when habit or week changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      // Get scheduled days for this habit
      const { success: daysSuccess, data: days } = await getHabitScheduleDays(habitName)
      if (daysSuccess) {
        setScheduledDays(days || [])
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
  }, [habitName, weekStart])

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
    }

    setSavingDate(null)
  }

  const handleMetricChange = async (date, value) => {
    const dateStr = formatDateForDB(date)
    const numValue = value === '' ? null : parseFloat(value)

    // Only save if value is valid
    if (value !== '' && (isNaN(numValue) || numValue < 0)) return

    // Debounce saves for better UX
    setSavingDate(dateStr)

    if (numValue !== null) {
      const { success, data } = await saveEntry(habitName, date, numValue, 'metric')

      if (success) {
        setEntries(prev => ({
          ...prev,
          [dateStr]: data
        }))
      }
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
      <div className="border border-stone-200 rounded-lg p-4 bg-white">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
          <span className="ml-2 text-stone-600 text-sm">Loading tracker...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-stone-200 rounded-lg p-4 bg-white">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePreviousWeek}
          disabled={!canNavigateToPreviousWeek(weekStart)}
          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-sm font-medium text-stone-900">
            {formatWeekRange(weekStart)}
          </span>
          {isCurrentWeek && (
            <span className="ml-2 text-xs text-green-600 font-medium">This Week</span>
          )}
        </div>

        <button
          onClick={handleNextWeek}
          disabled={!canNavigateToNextWeek(weekStart)}
          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next week"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Days Grid */}
      {scheduledDates.length === 0 ? (
        <div className="text-center py-6 text-stone-500 text-sm">
          No scheduled days this week
        </div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(scheduledDates.length, 7)}, 1fr)` }}>
          {scheduledDates.map(date => {
            const dateStr = formatDateForDB(date)
            const entry = entries[dateStr]
            const isPast = isDateInPast(date)
            const isTodayDate = isToday(date)
            const isFuture = isDateInFuture(date)
            const isSaving = savingDate === dateStr
            const canEdit = canBackfillDate(date, currentWeekStart) || isTodayDate

            return (
              <div
                key={dateStr}
                className={`relative flex flex-col items-center p-2 rounded-lg border transition ${
                  isTodayDate
                    ? 'border-green-500 bg-green-50'
                    : isPast
                    ? 'border-stone-200 bg-stone-50'
                    : 'border-stone-200 bg-white opacity-60'
                }`}
              >
                {/* Day Label */}
                <span className={`text-xs font-medium mb-2 ${
                  isTodayDate ? 'text-green-700' : 'text-stone-600'
                }`}>
                  {getDayWithDate(date)}
                </span>

                {/* Boolean Tracking */}
                {trackingType === 'boolean' && (
                  <button
                    onClick={() => canEdit && handleBooleanToggle(date)}
                    disabled={!canEdit || isSaving}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition ${
                      entry?.completed === true
                        ? 'bg-green-500 border-green-500 text-white'
                        : entry?.completed === false
                        ? 'bg-red-100 border-red-300 text-red-600'
                        : 'bg-white border-stone-300 text-stone-400 hover:border-green-400'
                    } ${!canEdit || isSaving ? 'cursor-not-allowed opacity-50' : ''}`}
                    aria-label={entry?.completed ? 'Completed' : 'Not completed'}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : entry?.completed === true ? (
                      <Check className="w-5 h-5" />
                    ) : entry?.completed === false ? (
                      <X className="w-5 h-5" />
                    ) : null}
                  </button>
                )}

                {/* Metric Tracking */}
                {trackingType === 'metric' && (
                  <div className="w-full">
                    <input
                      type="number"
                      value={entry?.metric_value ?? ''}
                      onChange={(e) => handleMetricChange(date, e.target.value)}
                      disabled={!canEdit || isSaving}
                      placeholder="—"
                      min="0"
                      step="any"
                      className={`w-full text-center text-sm py-1.5 px-1 border rounded-lg transition ${
                        entry?.metric_value !== undefined && entry?.metric_value !== null
                          ? metricTarget && entry.metric_value >= metricTarget
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-stone-300 bg-white'
                          : 'border-stone-200 bg-stone-50 text-stone-400'
                      } ${!canEdit ? 'cursor-not-allowed' : ''} focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                      aria-label={`${getDayWithDate(date)} value`}
                    />
                    {unitLabel && (
                      <span className="block text-xs text-stone-500 text-center mt-1">
                        {unitLabel}
                      </span>
                    )}
                  </div>
                )}

                {/* Target indicator for metrics */}
                {trackingType === 'metric' && metricTarget && entry?.metric_value !== undefined && entry?.metric_value !== null && (
                  <div className="absolute -top-1 -right-1">
                    {entry.metric_value >= metricTarget ? (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend / Help Text */}
      <div className="mt-4 pt-3 border-t border-stone-200">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>
            {trackingType === 'boolean' ? 'Tap to toggle completion' : 'Enter your daily value'}
          </span>
          {metricTarget && trackingType === 'metric' && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded-full inline-block" />
              Target: {metricTarget} {unitLabel}
            </span>
          )}
        </div>
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 text-sm text-stone-600 hover:text-stone-700 hover:bg-stone-100 rounded-lg border border-stone-300 transition"
        >
          Close Tracker
        </button>
      )}
    </div>
  )
}
