import supabase from '../lib/supabase'
import { addPilotEmail } from '../config/pilotAllowlist'

const ADMIN_EMAIL = 'eric.alan.boggs@gmail.com'
const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.supabase.co/functions/v1') || ''

/**
 * Check if current user is admin
 */
export const isAdmin = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.email === ADMIN_EMAIL
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Get all users with pilot readiness data
 */
export const getAllUsers = async () => {
  try {
    const adminCheck = await isAdmin()
    console.log('Admin check:', adminCheck)
    
    if (!adminCheck) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get all profiles
    console.log('Fetching profiles...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('Profiles result:', { profiles, profilesError })
    
    if (profilesError) throw profilesError

    // Get all health journeys
    const { data: journeys, error: journeysError } = await supabase
      .from('health_journeys')
      .select('user_id, form_data, updated_at')

    if (journeysError) throw journeysError

    // Get all habits
    const { data: habits, error: habitsError } = await supabase
      .from('weekly_habits')
      .select('user_id, habit_name, week_number')

    if (habitsError) throw habitsError

    // Combine data
    const usersData = profiles.map(profile => {
      const journey = journeys?.find(j => j.user_id === profile.id)
      const userHabits = habits?.filter(h => h.user_id === profile.id) || []

      // Calculate pilot readiness
      const hasLoggedIn = !!profile.last_login_at || profile.profile_completed
      const hasHealthVision = !!(journey?.form_data?.visionStatement)
      const activeHabitsCount = new Set(userHabits.map(h => h.habit_name)).size
      const hasActiveHabits = activeHabitsCount > 0

      const pilotReady = hasLoggedIn && hasHealthVision && hasActiveHabits

      return {
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
        email: profile.email || 'N/A',
        phone: profile.phone || 'N/A',
        smsOptIn: profile.sms_opt_in,
        lastLogin: profile.last_login_at,
        activeHabitsCount,
        pilotReady,
        hasLoggedIn,
        hasHealthVision,
        hasActiveHabits,
        createdAt: profile.created_at
      }
    })

    return { success: true, data: usersData }
  } catch (error) {
    console.error('Error fetching all users:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get detailed user data for admin view
 */
export const getUserDetail = async (userId) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) throw profileError

    // Get health journey
    const { data: journey, error: journeyError } = await supabase
      .from('health_journeys')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (journeyError && journeyError.code !== 'PGRST116') throw journeyError

    // Get habits
    const { data: habits, error: habitsError } = await supabase
      .from('weekly_habits')
      .select('*')
      .eq('user_id', userId)
      .order('week_number', { ascending: false })

    if (habitsError) throw habitsError

    // Get reflections
    const { data: reflections, error: reflectionsError } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('user_id', userId)
      .order('week_number', { ascending: false })

    if (reflectionsError) throw reflectionsError

    // Calculate pilot readiness
    const hasLoggedIn = profile.profile_completed
    const hasHealthVision = !!(journey?.form_data?.visionStatement)
    const activeHabitsCount = new Set(habits?.map(h => h.habit_name) || []).size
    const hasActiveHabits = activeHabitsCount > 0
    const pilotReady = hasLoggedIn && hasHealthVision && hasActiveHabits

    // Group habits by name
    const habitGroups = {}
    habits?.forEach(habit => {
      if (!habitGroups[habit.habit_name]) {
        habitGroups[habit.habit_name] = {
          name: habit.habit_name,
          weekNumber: habit.week_number,
          days: [],
          times: new Set(),
          createdAt: habit.created_at
        }
      }
      habitGroups[habit.habit_name].days.push(habit.day_of_week)
      if (habit.time_of_day || habit.reminder_time) {
        habitGroups[habit.habit_name].times.add(habit.time_of_day || habit.reminder_time)
      }
    })

    const groupedHabits = Object.values(habitGroups).map(group => ({
      ...group,
      times: Array.from(group.times),
      frequency: group.days.length
    }))

    return {
      success: true,
      data: {
        profile: {
          id: profile.id,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
          email: profile.email || 'N/A',
          phone: profile.phone || 'N/A',
          smsOptIn: profile.sms_opt_in,
          createdAt: profile.created_at,
          lastLogin: profile.last_login_at,
          timezone: profile.timezone,
          subscriptionTier: profile.subscription_tier || null,
          subscriptionStatus: profile.subscription_status || null,
          subscriptionCurrentPeriodEnd: profile.subscription_current_period_end || null,
        },
        pilotReadiness: {
          ready: pilotReady,
          hasLoggedIn,
          hasHealthVision,
          hasActiveHabits
        },
        healthVision: journey?.form_data || null,
        habits: groupedHabits,
        reflections: reflections || []
      }
    }
  } catch (error) {
    console.error('Error fetching user detail:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Invite a user to the pilot program
 * Adds email to allowlist and sends invitation email
 */
export const inviteUser = async (email) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Add to in-memory allowlist (for current session)
    addPilotEmail(normalizedEmail)

    // Store in database for persistence
    const { error: insertError } = await supabase
      .from('pilot_invites')
      .upsert({
        email: normalizedEmail,
        invited_at: new Date().toISOString(),
        invited_by: ADMIN_EMAIL
      }, {
        onConflict: 'email'
      })

    if (insertError) {
      console.error('Error storing invite:', insertError)
      // Continue anyway - the email sending is more important
    }

    // Get auth token for function call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' }
    }

    // Call the invite email function
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-invite-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ email: normalizedEmail })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Error sending invite email:', result)
      return { success: false, error: result.error || 'Failed to send invitation email' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error inviting user:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send SMS to one or more users
 * @param {Array<{userId: string, phone: string, name: string}>} recipients
 * @param {string} message
 */
export const sendAdminSMS = async (recipients, message) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get auth token for function call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-admin-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ recipients, message })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Error sending admin SMS:', result)
      return { success: false, error: result.error || 'Failed to send SMS' }
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending admin SMS:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get SMS conversation history for a user
 * @param {string} userId
 * @param {number} limit
 */
export const getConversation = async (userId, limit = 50) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get coaching sessions for a user in a billing period
 */
export const getCoachingSessions = async (userId, start, end) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('billing_period_start', start)
      .eq('billing_period_end', end)
      .order('session_date', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching coaching sessions:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Log a coaching session for a user
 */
export const logCoachingSession = async (userId, { durationMinutes, notes, billingPeriodStart, billingPeriodEnd }) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('coaching_sessions')
      .insert({
        user_id: userId,
        duration_minutes: durationMinutes,
        notes: notes || null,
        logged_by: 'admin',
        billing_period_start: billingPeriodStart,
        billing_period_end: billingPeriodEnd,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error logging coaching session:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete users and all their data
 * @param {string[]} userIds
 */
export const deleteUsers = async (userIds) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    console.log('Deleting users:', userIds)

    // Delete from all related tables (cascade)
    // Order matters due to foreign key constraints

    // Delete SMS messages
    const { error: smsError } = await supabase
      .from('sms_messages')
      .delete()
      .in('user_id', userIds)
    if (smsError) console.error('Error deleting SMS messages:', smsError)

    // Delete SMS reminders
    const { error: remindersError } = await supabase
      .from('sms_reminders')
      .delete()
      .in('user_id', userIds)
    if (remindersError) console.error('Error deleting SMS reminders:', remindersError)

    // Delete SMS followup log
    const { error: followupError } = await supabase
      .from('sms_followup_log')
      .delete()
      .in('user_id', userIds)
    if (followupError) console.error('Error deleting SMS followup log:', followupError)

    // Delete weekly reflections
    const { error: reflectionsError } = await supabase
      .from('weekly_reflections')
      .delete()
      .in('user_id', userIds)
    if (reflectionsError) console.error('Error deleting weekly reflections:', reflectionsError)

    // Delete weekly habits
    const { error: habitsError } = await supabase
      .from('weekly_habits')
      .delete()
      .in('user_id', userIds)
    if (habitsError) console.error('Error deleting weekly habits:', habitsError)

    // Delete habit tracking entries
    const { error: trackingEntriesError } = await supabase
      .from('habit_tracking_entries')
      .delete()
      .in('user_id', userIds)
    if (trackingEntriesError) console.error('Error deleting habit tracking entries:', trackingEntriesError)

    // Delete habit tracking config
    const { error: trackingConfigError } = await supabase
      .from('habit_tracking_config')
      .delete()
      .in('user_id', userIds)
    if (trackingConfigError) console.error('Error deleting habit tracking config:', trackingConfigError)

    // Delete health journeys
    const { error: journeysError } = await supabase
      .from('health_journeys')
      .delete()
      .in('user_id', userIds)
    if (journeysError) console.error('Error deleting health journeys:', journeysError)

    // Delete pilot feedback
    const { error: feedbackError } = await supabase
      .from('pilot_feedback')
      .delete()
      .in('user_id', userIds)
    if (feedbackError) console.error('Error deleting pilot feedback:', feedbackError)

    // Delete profiles (this should cascade to auth.users via FK if configured)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .in('id', userIds)

    if (profileError) {
      console.error('Error deleting profiles:', profileError)
      throw profileError
    }

    console.log(`Successfully deleted ${userIds.length} user(s)`)
    return { success: true, deleted: userIds.length }
  } catch (error) {
    console.error('Error deleting users:', error)
    return { success: false, error: error.message }
  }
}
