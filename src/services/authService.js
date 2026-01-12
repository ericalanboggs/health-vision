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
    if (!supabase) {
      const error = new Error('Supabase is not configured')
      console.error('Error sending magic link:', error)
      trackEvent('magic_link_failed', { error: error.message })
      return { success: false, error }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redirect to home page which handles both hash and PKCE flows
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
    if (!supabase) {
      console.error('Error getting current user: Supabase is not configured')
      return { user: null, session: null }
    }

    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting current user:', error)
      return { user: null, session: null }
    }

    const session = data.session
    const user = session?.user || null

    console.log('getCurrentUser result:', { 
      hasSession: !!session, 
      hasUser: !!user,
      userEmail: user?.email,
      fullUser: user
    })
    
    return { user, session, success: true }
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
    if (!supabase) {
      const error = new Error('Supabase is not configured')
      console.error('Error signing out:', error)
      return { success: false, error }
    }

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
  if (!supabase) {
    console.error('Error setting up auth state listener: Supabase is not configured')
    return () => {}
  }

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
    if (!supabase) {
      const error = new Error('Supabase is not configured')
      console.error('Error upserting profile:', error)
      return { success: false, error }
    }

    const dataToUpsert = {
      id: userId,
      ...profileData
    }

    console.log('Upserting profile with data:', dataToUpsert)

    const { data, error } = await supabase
      .from('profiles')
      .upsert(dataToUpsert, { onConflict: 'id' })
      .select()

    if (error) {
      console.error('Error upserting profile:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return { success: false, error }
    }

    console.log('Profile upserted successfully:', data)
    return { success: true, data }
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
    if (!supabase) {
      const error = new Error('Supabase is not configured')
      console.error('Error getting profile:', error)
      return { success: false, error }
    }

    console.log('Getting profile for user:', userId)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle() // Use maybeSingle instead of single to handle no rows gracefully

    if (error) {
      console.error('Error getting profile:', error)
      // For 406 or other errors, treat as profile not existing
      return { success: true, data: null }
    }

    console.log('Profile data:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error in getProfile:', error)
    // Treat any error as profile not existing
    return { success: true, data: null }
  }
}

/**
 * Update last login timestamp for user
 * @param {string} userId - User ID
 * @param {string} email - User email
 */
export const updateLastLogin = async (userId, email) => {
  try {
    if (!supabase) return

    await supabase
      .from('profiles')
      .update({ 
        last_login_at: new Date().toISOString(),
        email: email 
      })
      .eq('id', userId)
  } catch (error) {
    console.error('Error updating last login:', error)
  }
}
