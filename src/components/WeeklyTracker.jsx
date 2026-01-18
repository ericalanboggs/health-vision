import { useState, useEffect } from 'react'
import { ChevronLeft, Loader2, Check } from 'lucide-react'
import { getEntriesForWeek, saveEntry } from '../services/trackingService'
import { getHabitScheduleDays } from '../services/habitService'
import {
  getCurrentWeekStart,
  getWeekDates,
  formatDateForDB,
  getFullDayName,
  formatWeekOfHeader,
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
    <div className="py-2">
      {/* Week Header with Navigation */}
      <div className="flex items-center gap-2 mb-4">
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
      </div>

      {/* Vertical Day List */}
      {scheduledDates.length === 0 ? (
        <div className="text-center py-4 text-stone-500 text-sm">
          No scheduled days this week
        </div>
      ) : (
        <div className="space-y-2">
          {scheduledDates.map(date => {
            const dateStr = formatDateForDB(date)
            const entry = entries[dateStr]
            const isTodayDate = isToday(date)
            const isFuture = isDateInFuture(date)
            const isSaving = savingDate === dateStr
            const canEdit = canBackfillDate(date, currentWeekStart) || isTodayDate

            return (
              <div
                key={dateStr}
                className={`flex items-center justify-between py-2 ${
                  isTodayDate ? 'bg-green-50 -mx-2 px-2 rounded-lg' : ''
                } ${isFuture ? 'opacity-50' : ''}`}
              >
                {/* Full Day Name with Date */}
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

                {/* Boolean Tracking - Checkbox */}
                {trackingType === 'boolean' && (
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
                )}

                {/* Metric Tracking - Input Field */}
                {trackingType === 'metric' && (
                  <div className="flex items-center gap-2">
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
