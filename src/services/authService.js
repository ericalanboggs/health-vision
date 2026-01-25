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
    // First check static allowlist
    const hasStaticAccess = isPilotApproved(email)

    if (hasStaticAccess) {
      trackEvent('pilot_access_checked', { email, hasAccess: true, source: 'static' })
      return true
    }

    // Then check database for invites
    if (supabase) {
      const { data, error } = await supabase
        .from('pilot_invites')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (data && !error) {
        trackEvent('pilot_access_checked', { email, hasAccess: true, source: 'database' })
        return true
      }
    }

    trackEvent('pilot_access_checked', { email, hasAccess: false })
    return false
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
 * Sign in with Google OAuth
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const signInWithGoogle = async () => {
  try {
    if (!supabase) {
      const error = new Error('Supabase is not configured')
      console.error('Error signing in with Google:', error)
      trackEvent('google_sign_in_failed', { error: error.message })
      return { success: false, error }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })

    if (error) {
      console.error('Error signing in with Google:', error)
      trackEvent('google_sign_in_failed', { error: error.message })
      return { success: false, error }
    }

    // Check if Google user email is on allowlist
    if (data?.user?.email) {
      const hasAccess = isPilotApproved(data.user.email)
      if (!hasAccess) {
        // Sign out user if not on allowlist
        await supabase.auth.signOut()
        return { 
          success: false, 
          error: { message: 'Email not approved for pilot program. Please contact eric.alan.boggs@gmail.com for access.' }
        }
      }
    }

    trackEvent('google_sign_in_success')
    return { success: true, data }
  } catch (error) {
    console.error('Error in signInWithGoogle:', error)
    trackEvent('google_sign_in_failed', { error: error.message })
    return { success: false, error }
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
