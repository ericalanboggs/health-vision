import supabase from '../lib/supabase'
import { trackEvent } from '../lib/posthog'
import { getCurrentWeekNumber } from '../utils/weekCalculator'

/**
 * Service for managing weekly habits in the Summit Pilot
 */

/**
 * Save habits for a specific week
 * @param {number} weekNumber - Week number
 * @param {Array} habits - Array of habit objects with { habit_name, day_of_week, reminder_time, timezone }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const saveHabitsForWeek = async (weekNumber, habits) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Prepare habits with user_id and week_number
    const habitsToInsert = habits.map(habit => ({
      user_id: user.id,
      week_number: weekNumber,
      habit_name: habit.habit_name,
      day_of_week: habit.day_of_week,
      reminder_time: habit.reminder_time,
      timezone: habit.timezone || 'America/Chicago',
    }))

    const { data, error } = await supabase
      .from('weekly_habits')
      .insert(habitsToInsert)
      .select()

    if (error) {
      console.error('Error saving habits:', error)
      trackEvent('habits_save_failed', { error: error.message, weekNumber })
      return { success: false, error }
    }

    trackEvent('habits_saved', { 
      weekNumber, 
      habitCount: habits.length,
      userId: user.id 
    })
    
    return { success: true, data }
  } catch (error) {
    console.error('Error in saveHabitsForWeek:', error)
    return { success: false, error }
  }
}

/**
 * Get habits for a specific week
 * @param {number} weekNumber - Week number
 * @param {string} [userId] - Optional user ID (if not provided, will fetch from auth)
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getHabitsForWeek = async (weekNumber, userId = null) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    let uid = userId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      uid = user.id
    }

    const { data, error } = await supabase
      .from('weekly_habits')
      .select('*')
      .eq('user_id', uid)
      .eq('week_number', weekNumber)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching habits:', error)
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getHabitsForWeek:', error)
    return { success: false, error }
  }
}

/**
 * Get habits for current week
 * Auto-rolls over habits from previous week if none exist for current week
 * @param {string} [userId] - Optional user ID (if not provided, will fetch from auth)
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getCurrentWeekHabits = async (userId = null) => {
  const weekNumber = getCurrentWeekNumber()

  // First, try to get habits for the current week
  const result = await getHabitsForWeek(weekNumber, userId)

  // If we have habits for this week, return them
  if (result.success && result.data && result.data.length > 0) {
    return result
  }

  // No habits for current week - try to auto-rollover from previous week
  if (weekNumber > 1) {
    const prevWeekResult = await getHabitsForWeek(weekNumber - 1, userId)

    if (prevWeekResult.success && prevWeekResult.data && prevWeekResult.data.length > 0) {
      // Copy habits from previous week to current week
      const habitsToCopy = prevWeekResult.data.map(habit => ({
        habit_name: habit.habit_name,
        day_of_week: habit.day_of_week,
        reminder_time: habit.reminder_time,
        timezone: habit.timezone,
      }))

      const copyResult = await saveHabitsForWeek(weekNumber, habitsToCopy)

      if (copyResult.success) {
        console.log(`Auto-rolled over ${habitsToCopy.length} habits from week ${weekNumber - 1} to week ${weekNumber}`)
        return copyResult
      }
    }
  }

  // No habits to rollover, return empty result
  return result
}

/**
 * Get habits for previous week
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getPreviousWeekHabits = async () => {
  const weekNumber = getCurrentWeekNumber() - 1
  if (weekNumber < 1) {
    return { success: true, data: [] }
  }
  return getHabitsForWeek(weekNumber)
}

/**
 * Delete all habits for a specific week
 * @param {number} weekNumber - Week number
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export const deleteHabitsForWeek = async (weekNumber) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { error } = await supabase
      .from('weekly_habits')
      .delete()
      .eq('user_id', user.id)
      .eq('week_number', weekNumber)

    if (error) {
      console.error('Error deleting habits:', error)
      return { success: false, error }
    }

    trackEvent('habits_deleted', { weekNumber, userId: user.id })
    return { success: true }
  } catch (error) {
    console.error('Error in deleteHabitsForWeek:', error)
    return { success: false, error }
  }
}

/**
 * Delete all habits for the current user (across all weeks)
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export const deleteAllUserHabits = async () => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { error } = await supabase
      .from('weekly_habits')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting all habits:', error)
      return { success: false, error }
    }

    trackEvent('all_habits_deleted', { userId: user.id })
    return { success: true }
  } catch (error) {
    console.error('Error in deleteAllUserHabits:', error)
    return { success: false, error }
  }
}

/**
 * Update a specific habit
 * @param {string} habitId - Habit ID
 * @param {object} updates - Fields to update
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const updateHabit = async (habitId, updates) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data, error } = await supabase
      .from('weekly_habits')
      .update(updates)
      .eq('id', habitId)
      .select()
      .single()

    if (error) {
      console.error('Error updating habit:', error)
      return { success: false, error }
    }

    trackEvent('habit_updated', { habitId })
    return { success: true, data }
  } catch (error) {
    console.error('Error in updateHabit:', error)
    return { success: false, error }
  }
}

/**
 * Delete a specific habit
 * @param {string} habitId - Habit ID
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export const deleteHabit = async (habitId) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { error } = await supabase
      .from('weekly_habits')
      .delete()
      .eq('id', habitId)

    if (error) {
      console.error('Error deleting habit:', error)
      return { success: false, error }
    }

    trackEvent('habit_deleted', { habitId })
    return { success: true }
  } catch (error) {
    console.error('Error in deleteHabit:', error)
    return { success: false, error }
  }
}

/**
 * Copy habits from one week to another
 * @param {number} fromWeek - Source week number
 * @param {number} toWeek - Destination week number
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const copyHabitsToWeek = async (fromWeek, toWeek) => {
  try {
    // Get habits from source week
    const { success, data: sourceHabits, error } = await getHabitsForWeek(fromWeek)
    
    if (!success || !sourceHabits || sourceHabits.length === 0) {
      return { success: false, error: error || 'No habits found to copy' }
    }

    // Prepare habits for new week (remove id and update week_number)
    const habitsToCopy = sourceHabits.map(habit => ({
      habit_name: habit.habit_name,
      day_of_week: habit.day_of_week,
      reminder_time: habit.reminder_time,
      timezone: habit.timezone,
    }))

    // Save to new week
    return await saveHabitsForWeek(toWeek, habitsToCopy)
  } catch (error) {
    console.error('Error in copyHabitsToWeek:', error)
    return { success: false, error }
  }
}

/**
 * Get all habits for the current user (across all weeks)
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getAllUserHabits = async (userId = null) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    let uid = userId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      uid = user.id
    }

    const { data, error } = await supabase
      .from('weekly_habits')
      .select('*')
      .eq('user_id', uid)
      .order('week_number', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching all habits:', error)
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getAllUserHabits:', error)
    return { success: false, error }
  }
}

/**
 * Check if user has habits for current week
 * @returns {Promise<boolean>}
 */
export const hasCurrentWeekHabits = async () => {
  const { success, data } = await getCurrentWeekHabits()
  return success && data && data.length > 0
}

/**
 * Get all scheduled days (day_of_week values) for a specific habit
 * @param {string} habitName - Name of the habit
 * @returns {Promise<{success: boolean, data?: number[], error?: any}>}
 */
export const getHabitScheduleDays = async (habitName) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('weekly_habits')
      .select('day_of_week')
      .eq('user_id', user.id)
      .eq('habit_name', habitName)

    if (error) {
      console.error('Error fetching habit schedule days:', error)
      return { success: false, error }
    }

    // Extract unique day_of_week values
    const days = [...new Set(data.map(h => h.day_of_week))]

    return { success: true, data: days }
  } catch (error) {
    console.error('Error in getHabitScheduleDays:', error)
    return { success: false, error }
  }
}

/**
 * Get all unique habit names for the current user
 * @returns {Promise<{success: boolean, data?: string[], error?: any}>}
 */
export const getUniqueHabitNames = async () => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('weekly_habits')
      .select('habit_name')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching unique habit names:', error)
      return { success: false, error }
    }

    // Extract unique habit names
    const names = [...new Set(data.map(h => h.habit_name))]

    return { success: true, data: names }
  } catch (error) {
    console.error('Error in getUniqueHabitNames:', error)
    return { success: false, error }
  }
}
