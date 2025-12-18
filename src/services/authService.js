import supabase from '../lib/supabase'
import { trackEvent } from '../lib/posthog'
import { isPilotApproved } from '../config/pilotAllowlist'

/**
 * Send a magic link to the user's email
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export const sendMagicLink = async (email) => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redirect to home page, which will handle the auth tokens
        emailRedirectTo: `${window.location.origin}/`,
      },
    })

    if (error) {
      console.error('Error sending magic link:', error)
      trackEvent('magic_link_failed', { error: error.message })
      return { success: false, error }
    }

    trackEvent('magic_link_sent', { email })
    return { success: true }
  } catch (error) {
    console.error('Error in sendMagicLink:', error)
    trackEvent('magic_link_error', { error: error.message })
    return { success: false, error }
  }
}

/**
 * Check if an email has pilot access
 * @param {string} email - Email address to check
 * @returns {Promise<boolean>}
 */
export const checkPilotAccess = async (email) => {
  try {
    const hasAccess = isPilotApproved(email)
    
    trackEvent('pilot_access_checked', { 
      email, 
      hasAccess 
    })
    
    return hasAccess
  } catch (error) {
    console.error('Error checking pilot access:', error)
    trackEvent('pilot_access_check_error', { error: error.message })
    return false
  }
}

/**
 * Get the current authenticated user
 * @returns {Promise<{user: any | null, session: any | null}>}
 */
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting current user:', error)
      return { user: null, session: null }
    }

    const session = data.session
    const user = session?.user || null

    console.log('getCurrentUser result:', { hasSession: !!session, hasUser: !!user })
    
    return { user, session }
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return { user: null, session: null }
  }
}

/**
 * Sign out the current user
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error signing out:', error)
      return { success: false, error }
    }

    trackEvent('user_signed_out')
    return { success: true }
  } catch (error) {
    console.error('Error in signOut:', error)
    return { success: false, error }
  }
}

/**
 * Listen to auth state changes
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })

  return () => subscription.unsubscribe()
}

/**
 * Create or update user profile
 * @param {string} userId - User ID
 * @param {object} profileData - Profile data to save
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export const upsertProfile = async (userId, profileData) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error upserting profile:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in upsertProfile:', error)
    return { success: false, error }
  }
}

/**
 * Get user profile
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // Profile might not exist yet - this is okay
      if (error.code === 'PGRST116') {
        return { success: true, data: null }
      }
      console.error('Error getting profile:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getProfile:', error)
    return { success: false, error }
  }
}
