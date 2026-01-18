/**
 * Habit Schedule Utilities
 *
 * Helper functions for managing habit tracking schedules,
 * determining scheduled days, and handling week navigation.
 */

const PILOT_START_DATE = import.meta.env.VITE_PILOT_START_DATE || '2026-01-12'

/**
 * Day name to number mapping (matches database day_of_week values)
 * Sunday = 0, Monday = 1, etc.
 */
export const DAY_MAP = {
  'Sun': 0,
  'Mon': 1,
  'Tue': 2,
  'Wed': 3,
  'Thu': 4,
  'Fri': 5,
  'Sat': 6
}

/**
 * Reverse mapping: number to short day name
 */
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Get the start of the current week (Monday)
 * @returns {Date} Monday of current week at midnight
 */
export const getCurrentWeekStart = () => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  // Adjust for Monday start (day 0 = Sunday, so Monday is 1)
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - daysToSubtract)
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

/**
 * Get the start of a week containing a specific date (Monday)
 * @param {Date} date - Any date in the target week
 * @returns {Date} Monday of that week at midnight
 */
export const getWeekStartForDate = (date) => {
  const d = new Date(date)
  const dayOfWeek = d.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() - daysToSubtract)
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

/**
 * Get all dates for a week starting from a given Monday
 * @param {Date} weekStart - Monday of the week
 * @returns {Date[]} Array of 7 dates (Mon-Sun)
 */
export const getWeekDates = (weekStart) => {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    dates.push(date)
  }
  return dates
}

/**
 * Get dates for only the scheduled days in a week
 * @param {Date} weekStart - Monday of the week
 * @param {number[]} scheduledDays - Array of day_of_week values (0-6)
 * @returns {Date[]} Array of dates for scheduled days only
 */
export const getScheduledDaysForWeek = (weekStart, scheduledDays) => {
  const weekDates = getWeekDates(weekStart)
  return weekDates.filter(date => {
    const dayOfWeek = date.getDay()
    return scheduledDays.includes(dayOfWeek)
  })
}

/**
 * Check if a specific day should be shown based on scheduled days
 * @param {number[]} scheduledDays - Array of day_of_week values (0-6)
 * @param {number} dayOfWeek - Day to check (0-6)
 * @returns {boolean} True if the day is scheduled
 */
export const shouldShowDay = (scheduledDays, dayOfWeek) => {
  return scheduledDays.includes(dayOfWeek)
}

/**
 * Check if a date can be backfilled (edited after the fact)
 * Backfill is only allowed for dates within the current week
 * @param {Date} date - The date to check
 * @param {Date} currentWeekStart - Monday of current week
 * @returns {boolean} True if backfill is allowed
 */
export const canBackfillDate = (date, currentWeekStart) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)

  const weekEnd = new Date(currentWeekStart)
  weekEnd.setDate(currentWeekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // Date must be within current week and not in the future
  return checkDate >= currentWeekStart && checkDate <= today && checkDate <= weekEnd
}

/**
 * Check if a date is in the past (before today)
 * @param {Date} date - The date to check
 * @returns {boolean} True if the date is in the past
 */
export const isDateInPast = (date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)

  return checkDate < today
}

/**
 * Check if a date is today
 * @param {Date} date - The date to check
 * @returns {boolean} True if the date is today
 */
export const isToday = (date) => {
  const today = new Date()
  const checkDate = new Date(date)

  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if a date is in the future
 * @param {Date} date - The date to check
 * @returns {boolean} True if the date is in the future
 */
export const isDateInFuture = (date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)

  return checkDate > today
}

/**
 * Get the previous week's start date
 * @param {Date} currentWeekStart - Current week's Monday
 * @returns {Date} Previous week's Monday
 */
export const getPreviousWeekStart = (currentWeekStart) => {
  const prevWeek = new Date(currentWeekStart)
  prevWeek.setDate(currentWeekStart.getDate() - 7)
  return prevWeek
}

/**
 * Get the next week's start date
 * @param {Date} currentWeekStart - Current week's Monday
 * @returns {Date} Next week's Monday
 */
export const getNextWeekStart = (currentWeekStart) => {
  const nextWeek = new Date(currentWeekStart)
  nextWeek.setDate(currentWeekStart.getDate() + 7)
  return nextWeek
}

/**
 * Check if navigation to a previous week is allowed
 * Prevents navigating before the pilot start date
 * @param {Date} weekStart - Monday of the week to check
 * @returns {boolean} True if can navigate to previous week
 */
export const canNavigateToPreviousWeek = (weekStart) => {
  const [year, month, day] = PILOT_START_DATE.split('-').map(Number)
  const pilotStart = new Date(year, month - 1, day)
  const pilotWeekStart = getWeekStartForDate(pilotStart)

  const prevWeekStart = getPreviousWeekStart(weekStart)
  return prevWeekStart >= pilotWeekStart
}

/**
 * Check if navigation to the next week is allowed
 * Prevents navigating beyond current week (no future weeks)
 * @param {Date} weekStart - Monday of the week to check
 * @returns {boolean} True if can navigate to next week
 */
export const canNavigateToNextWeek = (weekStart) => {
  const currentWeekStart = getCurrentWeekStart()
  return weekStart < currentWeekStart
}

/**
 * Format a week range for display
 * @param {Date} weekStart - Monday of the week
 * @returns {string} Formatted string like "Jan 13 - Jan 19"
 */
export const formatWeekRange = (weekStart) => {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const options = { month: 'short', day: 'numeric' }
  const startStr = weekStart.toLocaleDateString('en-US', options)
  const endStr = weekEnd.toLocaleDateString('en-US', options)

  return `${startStr} - ${endStr}`
}

/**
 * Format a date for database storage (YYYY-MM-DD)
 * @param {Date} date - The date to format
 * @returns {string} ISO date string
 */
export const formatDateForDB = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a date string from database (YYYY-MM-DD)
 * @param {string} dateStr - ISO date string
 * @returns {Date} Parsed date
 */
export const parseDateFromDB = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get a short day label for display (e.g., "M", "Tu", "W")
 * @param {Date} date - The date
 * @returns {string} Short day label
 */
export const getShortDayLabel = (date) => {
  const labels = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa']
  return labels[date.getDay()]
}

/**
 * Get day label with date number (e.g., "Mon 13")
 * @param {Date} date - The date
 * @returns {string} Day label with date
 */
export const getDayWithDate = (date) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${dayNames[date.getDay()]} ${date.getDate()}`
}
