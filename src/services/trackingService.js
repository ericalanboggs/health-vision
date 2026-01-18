import supabase from '../lib/supabase'
import { trackEvent } from '../lib/posthog'
import { formatDateForDB } from '../utils/habitSchedule'
import { getSuggestionFromKeywords } from '../constants/metricUnits'

/**
 * Service for managing habit tracking configuration and entries
 */

// ============================================================================
// Tracking Configuration Management
// ============================================================================

/**
 * Get tracking configuration for a specific habit
 * @param {string} habitName - Name of the habit
 * @returns {Promise<{success: boolean, data?: object, error?: any}>}
 */
export const getTrackingConfig = async (habitName) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('habit_tracking_config')
      .select('*')
      .eq('user_id', user.id)
      .eq('habit_name', habitName)
      .maybeSingle()

    if (error) {
      console.error('Error fetching tracking config:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getTrackingConfig:', error)
    return { success: false, error }
  }
}

/**
 * Get all tracking configurations for the current user
 * @returns {Promise<{success: boolean, data?: object[], error?: any}>}
 */
export const getAllTrackingConfigs = async () => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('habit_tracking_config')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching all tracking configs:', error)
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getAllTrackingConfigs:', error)
    return { success: false, error }
  }
}

/**
 * Save or update tracking configuration for a habit
 * @param {string} habitName - Name of the habit
 * @param {object} config - Configuration object
 * @param {boolean} config.tracking_enabled - Whether tracking is enabled
 * @param {string} config.tracking_type - 'boolean' or 'metric'
 * @param {string} [config.metric_unit] - Unit for metric tracking
 * @param {number} [config.metric_target] - Target value for metrics
 * @returns {Promise<{success: boolean, data?: object, error?: any}>}
 */
export const saveTrackingConfig = async (habitName, config) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const configData = {
      user_id: user.id,
      habit_name: habitName,
      tracking_enabled: config.tracking_enabled,
      tracking_type: config.tracking_type,
      metric_unit: config.metric_unit || null,
      metric_target: config.metric_target || null,
      ai_suggested_unit: config.ai_suggested_unit || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('habit_tracking_config')
      .upsert(configData, {
        onConflict: 'user_id,habit_name'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving tracking config:', error)
      return { success: false, error }
    }

    trackEvent('tracking_config_saved', {
      habitName,
      trackingEnabled: config.tracking_enabled,
      trackingType: config.tracking_type
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error in saveTrackingConfig:', error)
    return { success: false, error }
  }
}

/**
 * Enable tracking for a habit
 * @param {string} habitName - Name of the habit
 * @param {string} trackingType - 'boolean' or 'metric'
 * @param {string} [metricUnit] - Unit for metric tracking
 * @param {number} [metricTarget] - Target value for metrics
 * @returns {Promise<{success: boolean, data?: object, error?: any}>}
 */
export const enableTracking = async (habitName, trackingType, metricUnit, metricTarget) => {
  return saveTrackingConfig(habitName, {
    tracking_enabled: true,
    tracking_type: trackingType,
    metric_unit: metricUnit,
    metric_target: metricTarget
  })
}

/**
 * Disable tracking for a habit
 * @param {string} habitName - Name of the habit
 * @returns {Promise<{success: boolean, data?: object, error?: any}>}
 */
export const disableTracking = async (habitName) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('habit_tracking_config')
      .update({
        tracking_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('habit_name', habitName)
      .select()
      .single()

    if (error) {
      console.error('Error disabling tracking:', error)
      return { success: false, error }
    }

    trackEvent('tracking_disabled', { habitName })

    return { success: true, data }
  } catch (error) {
    console.error('Error in disableTracking:', error)
    return { success: false, error }
  }
}

// ============================================================================
// Tracking Entry Management
// ============================================================================

/**
 * Get tracking entries for a habit within a date range
 * @param {string} habitName - Name of the habit
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<{success: boolean, data?: object[], error?: any}>}
 */
export const getEntriesForDateRange = async (habitName, startDate, endDate) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('habit_tracking_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('habit_name', habitName)
      .gte('entry_date', formatDateForDB(startDate))
      .lte('entry_date', formatDateForDB(endDate))
      .order('entry_date', { ascending: true })

    if (error) {
      console.error('Error fetching entries:', error)
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getEntriesForDateRange:', error)
    return { success: false, error }
  }
}

/**
 * Get tracking entries for a habit for a specific week
 * @param {string} habitName - Name of the habit
 * @param {Date} weekStart - Monday of the week
 * @returns {Promise<{success: boolean, data?: object[], error?: any}>}
 */
export const getEntriesForWeek = async (habitName, weekStart) => {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  return getEntriesForDateRange(habitName, weekStart, weekEnd)
}

/**
 * Get a tracking entry for a specific date
 * @param {string} habitName - Name of the habit
 * @param {Date} date - The date to get entry for
 * @returns {Promise<{success: boolean, data?: object, error?: any}>}
 */
export const getEntryForDate = async (habitName, date) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('habit_tracking_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('habit_name', habitName)
      .eq('entry_date', formatDateForDB(date))
      .maybeSingle()

    if (error) {
      console.error('Error fetching entry:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getEntryForDate:', error)
    return { success: false, error }
  }
}

/**
 * Save a tracking entry (upsert)
 * @param {string} habitName - Name of the habit
 * @param {Date} date - The date for the entry
 * @param {boolean|number} value - Completion status (boolean) or metric value (number)
 * @param {string} type - 'boolean' or 'metric'
 * @param {string} [source='app'] - Entry source ('app' or 'sms')
 * @returns {Promise<{success: boolean, data?: object, error?: any}>}
 */
export const saveEntry = async (habitName, date, value, type, source = 'app') => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const entryData = {
      user_id: user.id,
      habit_name: habitName,
      entry_date: formatDateForDB(date),
      completed: type === 'boolean' ? value : null,
      metric_value: type === 'metric' ? value : null,
      entry_source: source,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('habit_tracking_entries')
      .upsert(entryData, {
        onConflict: 'user_id,habit_name,entry_date'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving entry:', error)
      return { success: false, error }
    }

    trackEvent('tracking_entry_saved', {
      habitName,
      type,
      source,
      date: formatDateForDB(date)
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error in saveEntry:', error)
    return { success: false, error }
  }
}

/**
 * Delete a tracking entry
 * @param {string} habitName - Name of the habit
 * @param {Date} date - The date of the entry to delete
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export const deleteEntry = async (habitName, date) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { error } = await supabase
      .from('habit_tracking_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('habit_name', habitName)
      .eq('entry_date', formatDateForDB(date))

    if (error) {
      console.error('Error deleting entry:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteEntry:', error)
    return { success: false, error }
  }
}

// ============================================================================
// AI Suggestions
// ============================================================================

/**
 * Get AI suggestion for tracking type and unit for a habit
 * First tries the edge function, falls back to keyword matching
 * @param {string} habitName - Name of the habit
 * @returns {Promise<{success: boolean, data?: object, error?: any}>}
 */
export const getAiSuggestion = async (habitName) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    // Try to call the edge function
    const { data, error } = await supabase.functions.invoke('habit-ai-suggest', {
      body: { habitName }
    })

    if (error) {
      console.warn('AI suggestion edge function failed, using keyword fallback:', error)
      // Fall back to keyword matching
      const suggestion = getSuggestionFromKeywords(habitName)
      return { success: true, data: suggestion }
    }

    return { success: true, data }
  } catch (error) {
    console.warn('Error in getAiSuggestion, using keyword fallback:', error)
    // Fall back to keyword matching
    const suggestion = getSuggestionFromKeywords(habitName)
    return { success: true, data: suggestion }
  }
}

// ============================================================================
// Statistics and Analytics
// ============================================================================

/**
 * Get completion statistics for a habit
 * @param {string} habitName - Name of the habit
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<{success: boolean, data?: object, error?: any}>}
 */
export const getHabitStats = async (habitName, startDate, endDate) => {
  try {
    const { success, data: entries, error } = await getEntriesForDateRange(habitName, startDate, endDate)

    if (!success || error) {
      return { success: false, error }
    }

    const stats = {
      totalEntries: entries.length,
      completedCount: entries.filter(e => e.completed === true).length,
      metricEntries: entries.filter(e => e.metric_value !== null),
      completionRate: 0,
      averageMetric: null,
      totalMetric: null
    }

    // Calculate completion rate for boolean tracking
    if (stats.totalEntries > 0) {
      stats.completionRate = Math.round((stats.completedCount / stats.totalEntries) * 100)
    }

    // Calculate metric averages if applicable
    if (stats.metricEntries.length > 0) {
      const total = stats.metricEntries.reduce((sum, e) => sum + parseFloat(e.metric_value), 0)
      stats.totalMetric = total
      stats.averageMetric = Math.round((total / stats.metricEntries.length) * 10) / 10
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error in getHabitStats:', error)
    return { success: false, error }
  }
}
