import supabase, { isSupabaseConfigured } from '../lib/supabase'
import { trackEvent } from '../lib/posthog'

/**
 * Service for managing health journey data in Supabase
 * 
 * Database Schema (create this in Supabase):
 * 
 * Table: health_journeys
 * - id: uuid (primary key, default: gen_random_uuid())
 * - user_id: uuid (nullable, for authenticated users)
 * - session_id: text (for anonymous users)
 * - form_data: jsonb (stores all form responses)
 * - current_step: text
 * - completed: boolean (default: false)
 * - created_at: timestamp (default: now())
 * - updated_at: timestamp (default: now())
 * 
 * Enable Row Level Security (RLS):
 * - Allow users to read/write their own journeys
 * - Allow anonymous users to access by session_id
 */

// Generate a unique session ID for anonymous users
const getSessionId = () => {
  let sessionId = localStorage.getItem('health_journey_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('health_journey_session_id', sessionId)
  }
  return sessionId
}

/**
 * Save or update a health journey
 */
export const saveJourney = async (formData, currentStep) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured. Journey not saved to database.')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null
    const sessionId = getSessionId()

    console.log('💾 Saving journey:', { 
      userId, 
      sessionId, 
      currentStep,
      hasVision: !!formData?.visionStatement,
      visionLength: formData?.visionStatement?.length || 0
    })

    // For authenticated users, query by user_id; for anonymous, use session_id
    let existingJourney
    if (userId) {
      const { data } = await supabase
        .from('health_journeys')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
      existingJourney = data
      console.log('🔍 Existing journey check (by user_id):', existingJourney ? 'Found' : 'Not found')
    } else {
      const { data } = await supabase
        .from('health_journeys')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle()
      existingJourney = data
      console.log('🔍 Existing journey check (by session_id):', existingJourney ? 'Found' : 'Not found')
    }

    let result
    if (existingJourney) {
      // Update existing journey
      console.log('🔄 Updating existing journey')
      const updateQuery = supabase
        .from('health_journeys')
        .update({
          form_data: formData,
          current_step: currentStep,
          updated_at: new Date().toISOString(),
          user_id: userId,
        })
      
      if (userId) {
        result = await updateQuery.eq('user_id', userId).select().single()
      } else {
        result = await updateQuery.eq('session_id', sessionId).select().single()
      }
    } else {
      // Create new journey
      console.log('➕ Creating new journey')
      result = await supabase
        .from('health_journeys')
        .insert({
          session_id: sessionId,
          user_id: userId,
          form_data: formData,
          current_step: currentStep,
          completed: false,
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('❌ Error saving journey:', result.error)
      trackEvent('journey_save_failed', { error: result.error.message })
      return { success: false, error: result.error }
    }

    console.log('✅ Journey saved successfully')
    trackEvent('journey_saved', { step: currentStep })
    return { success: true, data: result.data }
  } catch (error) {
    console.error('❌ Error in saveJourney:', error)
    trackEvent('journey_save_error', { error: error.message })
    return { success: false, error }
  }
}

/**
 * Load the current user's journey
 */
export const loadJourney = async () => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null
    const sessionId = getSessionId()

    console.log('🔍 Loading journey:', { userId, sessionId })

    // For authenticated users, query by user_id; for anonymous, use session_id
    let query = supabase.from('health_journeys').select('*')
    
    if (userId) {
      console.log('📊 Querying by user_id:', userId)
      query = query.eq('user_id', userId)
    } else {
      console.log('📊 Querying by session_id:', sessionId)
      query = query.eq('session_id', sessionId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('❌ Error loading journey:', error)
      return { success: false, error }
    }

    if (!data) {
      console.log('⚠️ No journey found')
      return { success: true, data: null }
    }

    console.log('✅ Journey loaded successfully:', {
      hasVision: !!data.form_data?.visionStatement,
      currentStep: data.current_step,
      visionLength: data.form_data?.visionStatement?.length || 0
    })

    trackEvent('journey_loaded')
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error in loadJourney:', error)
    return { success: false, error }
  }
}

/**
 * Mark journey as completed
 */
export const completeJourney = async () => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null
    const sessionId = getSessionId()

    let updateQuery = supabase
      .from('health_journeys')
      .update({
        completed: true,
        updated_at: new Date().toISOString(),
      })

    const { data, error } = userId 
      ? await updateQuery.eq('user_id', userId).select().single()
      : await updateQuery.eq('session_id', sessionId).select().single()

    if (error) {
      console.error('Error completing journey:', error)
      return { success: false, error }
    }

    trackEvent('journey_completed')
    return { success: true, data }
  } catch (error) {
    console.error('Error in completeJourney:', error)
    return { success: false, error }
  }
}

/**
 * Delete current journey
 */
export const deleteJourney = async () => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null
    const sessionId = getSessionId()

    let deleteQuery = supabase.from('health_journeys').delete()
    
    const { error } = userId
      ? await deleteQuery.eq('user_id', userId)
      : await deleteQuery.eq('session_id', sessionId)

    if (error) {
      console.error('Error deleting journey:', error)
      return { success: false, error }
    }

    // Clear session ID
    localStorage.removeItem('health_journey_session_id')
    
    trackEvent('journey_deleted')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteJourney:', error)
    return { success: false, error }
  }
}

/**
 * Get all journeys for the current user (if authenticated)
 */
export const getUserJourneys = async () => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('health_journeys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user journeys:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getUserJourneys:', error)
    return { success: false, error }
  }
}
