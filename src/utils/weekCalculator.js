/**
 * Week Calculator for Summit Pilot
 * 
 * Calculates the current week number based on a global pilot start date.
 * All users are on the same cohort schedule for easier pilot management.
 */

// Global pilot start date - set this to when the pilot begins
// Format: YYYY-MM-DD
const PILOT_START_DATE = import.meta.env.VITE_PILOT_START_DATE || '2026-01-12'


/**
 * Get the current week number for the pilot
 * Week 1 starts on PILOT_START_DATE
 * @returns {number} Current week number (1-based)
 */
export const getCurrentWeekNumber = () => {
  // Parse date as local time to avoid timezone issues
  const [year, month, day] = PILOT_START_DATE.split('-').map(Number)
  const startDate = new Date(year, month - 1, day)
  const today = new Date()
  
  // Reset time to midnight for accurate day calculation
  startDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  const diffTime = today - startDate
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  // Week number is 1-based
  const weekNumber = Math.floor(diffDays / 7) + 1
  
  // Ensure week number is at least 1 (even if before start date)
  return Math.max(1, weekNumber)
}

/**
 * Get the pilot start date
 * @returns {Date} Pilot start date
 */
export const getPilotStartDate = () => {
  // Parse date as local time to avoid timezone issues
  const [year, month, day] = PILOT_START_DATE.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date
}

/**
 * Get the start date for a specific week
 * @param {number} weekNumber - Week number (1-based)
 * @returns {Date} Start date for that week
 */
export const getWeekStartDate = (weekNumber) => {
  // Parse date as local time to avoid timezone issues
  const [year, month, day] = PILOT_START_DATE.split('-').map(Number)
  const startDate = new Date(year, month - 1, day)
  const daysToAdd = (weekNumber - 1) * 7
  startDate.setDate(startDate.getDate() + daysToAdd)
  return startDate
}

/**
 * Get the end date for a specific week
 * @param {number} weekNumber - Week number (1-based)
 * @returns {Date} End date for that week
 */
export const getWeekEndDate = (weekNumber) => {
  const startDate = getWeekStartDate(weekNumber)
  startDate.setDate(startDate.getDate() + 6)
  return startDate
}

/**
 * Format a date range for display
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {string} Formatted date range (e.g., "Jan 6 - Jan 12")
 */
export const formatDateRange = (startDate, endDate) => {
  const options = { month: 'short', day: 'numeric' }
  const start = startDate.toLocaleDateString('en-US', options)
  const end = endDate.toLocaleDateString('en-US', options)
  return `${start} - ${end}`
}

/**
 * Get formatted date range for current week
 * @returns {string} Formatted date range
 */
export const getCurrentWeekDateRange = () => {
  const weekNumber = getCurrentWeekNumber()
  const startDate = getWeekStartDate(weekNumber)
  const endDate = getWeekEndDate(weekNumber)
  return formatDateRange(startDate, endDate)
}

/**
 * Check if a specific week has passed
 * @param {number} weekNumber - Week number to check
 * @returns {boolean} True if the week has ended
 */
export const hasWeekPassed = (weekNumber) => {
  const currentWeek = getCurrentWeekNumber()
  return weekNumber < currentWeek
}

/**
 * Get days remaining in current week
 * @returns {number} Days remaining (0-6)
 */
export const getDaysRemainingInWeek = () => {
  const weekNumber = getCurrentWeekNumber()
  const weekEnd = getWeekEndDate(weekNumber)
  const today = new Date()
  
  weekEnd.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  const diffTime = weekEnd - today
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}
