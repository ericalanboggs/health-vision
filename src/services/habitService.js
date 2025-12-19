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
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getHabitsForWeek = async (weekNumber) => {
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
      .select('*')
      .eq('user_id', user.id)
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
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getCurrentWeekHabits = async () => {
  const weekNumber = getCurrentWeekNumber()
  return getHabitsForWeek(weekNumber)
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
export const getAllUserHabits = async () => {
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
      .select('*')
      .eq('user_id', user.id)
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
