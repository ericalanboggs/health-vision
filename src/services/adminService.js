import supabase from '../lib/supabase'
import { addPilotEmail } from '../config/pilotAllowlist'

const ADMIN_EMAILS = [
  'eric.alan.boggs@gmail.com',
  'eric@summithealth.app',
]
const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.supabase.co/functions/v1') || ''

/**
 * Check if current user is admin
 */
export const isAdmin = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return ADMIN_EMAILS.includes(user?.email?.toLowerCase())
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

    // Calculate compact member duration string from created_at
    const getMemberDuration = (createdAt) => {
      if (!createdAt) return ''
      const now = new Date()
      const created = new Date(createdAt)
      const diffMs = now - created
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffDays < 1) return '<1d'
      if (diffDays < 14) return `${diffDays}d`
      if (diffDays < 60) return `${Math.floor(diffDays / 7)}w`
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`
      return `${Math.floor(diffDays / 365)}y`
    }

    // Combine data
    const usersData = profiles.map(profile => {
      const userHabits = habits?.filter(h => h.user_id === profile.id) || []
      const activeHabitsCount = new Set(userHabits.map(h => h.habit_name)).size

      return {
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
        email: profile.email || 'N/A',
        phone: profile.phone || 'N/A',
        smsOptIn: profile.sms_opt_in,
        lastLogin: profile.last_login_at,
        activeHabitsCount,
        subscriptionTier: profile.subscription_tier || 'free',
        memberDuration: getMemberDuration(profile.created_at),
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

    // Get tracking configs
    const { data: trackingConfigs, error: trackingError } = await supabase
      .from('habit_tracking_config')
      .select('habit_name, tracking_type, tracking_enabled, metric_unit, metric_target')
      .eq('user_id', userId)

    if (trackingError) throw trackingError

    // Build tracking lookup by habit name
    const trackingByHabit = {}
    trackingConfigs?.forEach(tc => {
      trackingByHabit[tc.habit_name] = tc
    })

    // Get reflections
    const { data: reflections, error: reflectionsError } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('user_id', userId)
      .order('week_number', { ascending: false })

    if (reflectionsError) throw reflectionsError

    // Get resources
    const { data: resources, error: resourcesError } = await supabase
      .from('user_resources')
      .select('*')
      .eq('user_id', userId)
      .order('week_number', { ascending: false })
      .order('created_at', { ascending: false })

    if (resourcesError) throw resourcesError

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
          createdAt: habit.created_at,
          challengeSlug: habit.challenge_slug || null,
          timezone: habit.timezone || null
        }
      }
      habitGroups[habit.habit_name].days.push(habit.day_of_week)
      if (habit.time_of_day || habit.reminder_time) {
        habitGroups[habit.habit_name].times.add(habit.time_of_day || habit.reminder_time)
      }
    })

    const groupedHabits = Object.values(habitGroups).map(group => {
      const tc = trackingByHabit[group.name]
      return {
        ...group,
        times: Array.from(group.times),
        frequency: group.days.length,
        tracking: tc ? {
          enabled: tc.tracking_enabled,
          type: tc.tracking_type,
          unit: tc.metric_unit,
          target: tc.metric_target,
        } : null,
      }
    })

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
        reflections: reflections || [],
        resources: resources || []
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

    const { data: { user: adminUser } } = await supabase.auth.getUser()
    const normalizedEmail = email.toLowerCase().trim()

    // Add to in-memory allowlist (for current session)
    addPilotEmail(normalizedEmail)

    // Store in database for persistence
    const { error: insertError } = await supabase
      .from('pilot_invites')
      .upsert({
        email: normalizedEmail,
        invited_at: new Date().toISOString(),
        invited_by: adminUser?.email || 'admin'
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
 * Clear admin SMS hold for a user (resume AI auto-replies)
 * @param {string} userId
 */
export const clearAdminSmsHold = async (userId) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

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
      body: JSON.stringify({ action: 'resume-ai', userId })
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to resume AI' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error clearing admin SMS hold:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get admin SMS hold status for a user
 * @param {string} userId
 * @returns {{ holdUntil: string } | null}
 */
export const getAdminSmsHoldStatus = async (userId) => {
  try {
    if (!await isAdmin()) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('admin_sms_hold_until')
      .eq('id', userId)
      .single()

    if (error || !data?.admin_sms_hold_until) return null

    // Check if hold is still active
    if (new Date(data.admin_sms_hold_until) <= new Date()) return null

    return { holdUntil: data.admin_sms_hold_until }
  } catch (error) {
    console.error('Error checking admin SMS hold status:', error)
    return null
  }
}

/**
 * Get SMS conversation history for a user
 * @param {string} userId
 * @param {number} limit
 */
export const getConversation = async (userId, limit = 500) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    // Fetch sms_messages and sms_reminders in parallel
    const [messagesResult, remindersResult] = await Promise.all([
      supabase
        .from('sms_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('sms_reminders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ])

    if (messagesResult.error) throw messagesResult.error
    if (remindersResult.error) throw remindersResult.error

    // Normalize reminders to match the message shape
    const normalizedReminders = (remindersResult.data || []).map((r) => ({
      id: r.id,
      direction: 'outbound',
      body: r.message,
      created_at: r.sent_at || r.created_at,
      sent_by_type: 'reminder',
      _source: 'reminder',
    }))

    // Merge, deduplicate by twilio_sid, and sort chronologically
    const all = [...(messagesResult.data || []), ...normalizedReminders]
    const seen = new Set()
    const combined = all
      .filter((msg) => {
        if (!msg.twilio_sid) return true
        if (seen.has(msg.twilio_sid)) return false
        seen.add(msg.twilio_sid)
        return true
      })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    return { success: true, data: combined }
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
 * Add a resource to a user (admin-assigned)
 */
export const adminAddResource = async (userId, { title, url, resource_type, duration_minutes, admin_note }) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('user_resources')
      .insert({
        user_id: userId,
        title,
        url,
        resource_type: resource_type || 'link',
        duration_minutes: duration_minutes || null,
        admin_note: admin_note || null,
        origin: 'admin',
        pinned: false,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error adding resource:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a resource by id
 */
export const adminDeleteResource = async (resourceId) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('user_resources')
      .delete()
      .eq('id', resourceId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting resource:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Toggle pinned status of a resource
 */
export const adminTogglePinResource = async (resourceId, currentPinned) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('user_resources')
      .update({ pinned: !currentPinned })
      .eq('id', resourceId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error toggling pin:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a habit (all rows for that habit name) for a user
 */
export const adminDeleteHabit = async (userId, habitName) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('weekly_habits')
      .delete()
      .eq('user_id', userId)
      .eq('habit_name', habitName)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting habit:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update a habit: delete old rows, insert new rows (one per day)
 */
export const adminUpdateHabit = async (userId, oldHabitName, { name, days, reminderTime, timezone, challengeSlug }) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    // Delete old rows
    const { error: deleteError } = await supabase
      .from('weekly_habits')
      .delete()
      .eq('user_id', userId)
      .eq('habit_name', oldHabitName)

    if (deleteError) throw deleteError

    // Insert new rows (one per day)
    const rows = days.map(day => ({
      user_id: userId,
      habit_name: name,
      day_of_week: day,
      reminder_time: reminderTime || null,
      time_of_day: reminderTime || null,
      timezone: timezone || null,
      challenge_slug: challengeSlug || null,
    }))

    const { error: insertError } = await supabase
      .from('weekly_habits')
      .insert(rows)

    if (insertError) throw insertError
    return { success: true }
  } catch (error) {
    console.error('Error updating habit:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Add a new habit for a user (one row per day)
 */
export const adminAddHabit = async (userId, { name, days, reminderTime, timezone }) => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    const rows = days.map(day => ({
      user_id: userId,
      habit_name: name,
      day_of_week: day,
      reminder_time: reminderTime || null,
      time_of_day: reminderTime || null,
      timezone: timezone || null,
    }))

    const { error } = await supabase
      .from('weekly_habits')
      .insert(rows)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error adding habit:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get recent SMS threads (most recent message per user)
 */
export const getRecentThreads = async () => {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('sms_messages')
      .select('id, user_id, user_name, phone, body, direction, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    // Deduplicate by user_id — keep only the most recent message per user
    const seen = new Map()
    for (const msg of data || []) {
      if (!seen.has(msg.user_id)) {
        seen.set(msg.user_id, {
          userId: msg.user_id,
          userName: msg.user_name || msg.phone || 'Unknown',
          phone: msg.phone,
          lastMessage: {
            body: msg.body,
            direction: msg.direction,
            created_at: msg.created_at,
          },
        })
      }
    }

    return { success: true, data: Array.from(seen.values()) }
  } catch (error) {
    console.error('Error fetching recent threads:', error)
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
