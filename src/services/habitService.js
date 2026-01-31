import supabase from '../lib/supabase'
import { trackEvent } from '../lib/posthog'

/**
 * Service for managing habits in the Summit Pilot
 *
 * Note: Habits are now persistent entities (no week_number).
 * They exist until explicitly deleted. Tracking uses habit_name + entry_date.
 */

/**
 * Save habits (creates new habits, replacing any existing ones)
 * @param {Array} habits - Array of habit objects with { habit_name, day_of_week, reminder_time, timezone }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const saveHabits = async (habits) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Prepare habits with user_id (no week_number)
    const habitsToInsert = habits.map(habit => ({
      user_id: user.id,
      week_number: null, // Explicitly null - habits are persistent
      habit_name: habit.habit_name,
      day_of_week: habit.day_of_week,
      reminder_time: habit.reminder_time,
      timezone: habit.timezone || 'America/Chicago',
    }))

    // Delete existing habits for the same user/habit/day combinations first
    // This avoids unique constraint issues
    for (const habit of habitsToInsert) {
      await supabase
        .from('weekly_habits')
        .delete()
        .eq('user_id', user.id)
        .eq('habit_name', habit.habit_name)
        .eq('day_of_week', habit.day_of_week)
    }

    // Insert new habits
    const { data, error } = await supabase
      .from('weekly_habits')
      .insert(habitsToInsert)
      .select()

    if (error) {
      console.error('Error saving habits:', error)
      trackEvent('habits_save_failed', { error: error.message })
      return { success: false, error }
    }

    trackEvent('habits_saved', {
      habitCount: habits.length,
      userId: user.id
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error in saveHabits:', error)
    return { success: false, error }
  }
}

/**
 * Get all habits for the current user
 * @param {string} [userId] - Optional user ID (if not provided, will fetch from auth)
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getHabits = async (userId = null) => {
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
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching habits:', error)
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getHabits:', error)
    return { success: false, error }
  }
}

/**
 * Delete all habits for the current user
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
 * Check if user has any habits
 * @returns {Promise<boolean>}
 */
export const hasHabits = async () => {
  const { success, data } = await getHabits()
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

// ============================================================================
// BACKWARDS COMPATIBILITY ALIASES
// These maintain compatibility with existing code during transition
// ============================================================================

/**
 * @deprecated Use saveHabits() instead
 * Save habits (ignores weekNumber parameter)
 */
export const saveHabitsForWeek = async (weekNumber, habits) => {
  return saveHabits(habits)
}

/**
 * @deprecated Use getHabits() instead
 * Get habits (ignores weekNumber parameter)
 */
export const getHabitsForWeek = async (weekNumber, userId = null) => {
  return getHabits(userId)
}

/**
 * @deprecated Use getHabits() instead
 * Get current week habits (now just returns all habits)
 */
export const getCurrentWeekHabits = async (userId = null) => {
  return getHabits(userId)
}

/**
 * @deprecated Use getHabits() instead
 * Get all user habits (now just returns all habits, ignores week ordering)
 */
export const getAllUserHabits = async (userId = null) => {
  return getHabits(userId)
}

/**
 * @deprecated Use hasHabits() instead
 * Check if user has habits for current week
 */
export const hasCurrentWeekHabits = async () => {
  return hasHabits()
}

/**
 * @deprecated No longer needed - habits persist across weeks
 * Delete habits for a specific week (now deletes all habits)
 */
export const deleteHabitsForWeek = async (weekNumber) => {
  console.warn('deleteHabitsForWeek is deprecated. Use deleteAllUserHabits instead.')
  return deleteAllUserHabits()
}

/**
 * @deprecated No longer needed - habits persist across weeks
 */
export const getPreviousWeekHabits = async () => {
  console.warn('getPreviousWeekHabits is deprecated. Habits now persist across weeks.')
  return { success: true, data: [] }
}

/**
 * @deprecated No longer needed - habits persist across weeks
 */
export const copyHabitsToWeek = async (fromWeek, toWeek) => {
  console.warn('copyHabitsToWeek is deprecated. Habits now persist across weeks.')
  return { success: true, data: [] }
}
