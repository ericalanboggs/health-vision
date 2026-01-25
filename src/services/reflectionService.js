import supabase from '../lib/supabase'
import { trackEvent } from '../lib/posthog'
import { getCurrentWeekNumber } from '../utils/weekCalculator'

/**
 * Service for managing weekly reflections in the Summit Pilot
 */

/**
 * Save a weekly reflection
 * @param {number} weekNumber - Week number
 * @param {object} reflection - Reflection data with { went_well, friction, adjustment }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const saveReflection = async (weekNumber, reflection) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Check if reflection already exists for this week
    const { data: existing } = await supabase
      .from('weekly_reflections')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_number', weekNumber)
      .maybeSingle()

    let result

    console.log('Saving reflection:', { weekNumber, reflection, isUpdate: !!existing })

    if (existing) {
      // Update existing reflection
      result = await supabase
        .from('weekly_reflections')
        .update({
          went_well: reflection.went_well,
          friction: reflection.friction,
          adjustment: reflection.adjustment,
          app_feedback: reflection.app_feedback || null
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // Create new reflection
      result = await supabase
        .from('weekly_reflections')
        .insert({
          user_id: user.id,
          week_number: weekNumber,
          went_well: reflection.went_well,
          friction: reflection.friction,
          adjustment: reflection.adjustment,
          app_feedback: reflection.app_feedback || null
        })
        .select()
        .single()
    }

    const { data, error } = result

    if (error) {
      console.error('Error saving reflection:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      trackEvent('reflection_save_failed', { error: error.message, weekNumber })
      return { success: false, error }
    }

    trackEvent('reflection_saved', { 
      weekNumber, 
      userId: user.id,
      isUpdate: !!existing
    })
    
    return { success: true, data }
  } catch (error) {
    console.error('Error in saveReflection:', error)
    return { success: false, error }
  }
}

/**
 * Get reflection for a specific week
 * @param {number} weekNumber - Week number
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getReflectionForWeek = async (weekNumber, userId = null) => {
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
      .from('weekly_reflections')
      .select('*')
      .eq('user_id', uid)
      .eq('week_number', weekNumber)
      .maybeSingle()

    if (error) {
      console.error('Error fetching reflection:', error)
      return { success: false, error }
    }

    return { success: true, data: data || null }
  } catch (error) {
    console.error('Error in getReflectionForWeek:', error)
    return { success: false, error }
  }
}

/**
 * Get reflection for a specific week (alias for getReflectionForWeek)
 * @param {number} weekNumber - Week number
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getReflectionByWeek = getReflectionForWeek

/**
 * Get reflection for current week
 * @param {string} [userId] - Optional user ID (if not provided, will fetch from auth)
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getCurrentWeekReflection = async (userId = null) => {
  const weekNumber = getCurrentWeekNumber()
  return getReflectionForWeek(weekNumber, userId)
}

/**
 * Get reflection for previous week
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getPreviousWeekReflection = async () => {
  const weekNumber = getCurrentWeekNumber() - 1
  if (weekNumber < 1) {
    return { success: true, data: null }
  }
  return getReflectionForWeek(weekNumber)
}

/**
 * Get all reflections for the current user
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getAllReflections = async () => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('user_id', user.id)
      .order('week_number', { ascending: false })

    if (error) {
      console.error('Error fetching all reflections:', error)
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getAllReflections:', error)
    return { success: false, error }
  }
}

/**
 * Check if user has reflection for current week
 * @returns {Promise<boolean>}
 */
export const hasCurrentWeekReflection = async () => {
  const { success, data } = await getCurrentWeekReflection()
  return success && data !== null
}
