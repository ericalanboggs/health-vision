import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const PILOT_START_DATE = Deno.env.get('PILOT_START_DATE') || '2026-01-12'

interface Profile {
  id: string
  first_name: string
  phone: string
  sms_opt_in: boolean
  timezone: string
  tracking_followup_time: string
}

interface TrackingConfig {
  id: string
  habit_name: string
  user_id: string
  tracking_enabled: boolean
  tracking_type: string
  metric_unit: string | null
  metric_target: number | null
}

interface Habit {
  id: string
  user_id: string
  habit_name: string
  day_of_week: number
}

/**
 * Get current time in a specific timezone
 */
function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; dayOfWeek: number; dateStr: string } {
  try {
    const now = new Date()

    // Get time parts
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    })

    const timeParts = timeFormatter.formatToParts(now)
    const hours = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0')
    const minutes = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0')
    const weekdayStr = timeParts.find(p => p.type === 'weekday')?.value || 'Sun'

    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    }
    const dayOfWeek = dayMap[weekdayStr] ?? 0

    // Get date string for today in user's timezone
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const dateStr = dateFormatter.format(now)

    return { hours, minutes, dayOfWeek, dateStr }
  } catch (error) {
    console.error(`Error getting time for timezone ${timezone}:`, error)
    const now = new Date()
    return {
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
      dayOfWeek: now.getUTCDay(),
      dateStr: now.toISOString().split('T')[0]
    }
  }
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(to: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        },
        body: new URLSearchParams({
          To: to,
          From: TWILIO_PHONE_NUMBER!,
          Body: message,
        }),
      }
    )

    const data = await response.json()

    if (response.ok) {
      return { success: true, sid: data.sid }
    } else {
      return { success: false, error: data.message || 'Twilio API error' }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const now = new Date()
    console.log(`Running habit follow-up check at ${now.toISOString()}`)

    // Check if we're within the pilot date range
    const pilotStartDate = new Date(PILOT_START_DATE)
    const pilotEndDate = new Date(pilotStartDate)
    pilotEndDate.setDate(pilotEndDate.getDate() + 21)

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (today < pilotStartDate || today > pilotEndDate) {
      console.log(`Outside pilot date range`)
      return new Response(
        JSON.stringify({ message: 'Outside pilot date range' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get all users with SMS opt-in and tracking_followup_time set
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('sms_opt_in', true)
      .not('phone', 'is', null)
      .not('tracking_followup_time', 'is', null)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No eligible users found', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${profiles.length} users with SMS opt-in and followup time`)

    const results = []

    for (const profile of profiles as Profile[]) {
      const userTimezone = profile.timezone || 'America/Chicago'
      const userLocalTime = getCurrentTimeInTimezone(userTimezone)

      // Parse user's followup time (e.g., "17:00:00")
      const [followupHour, followupMinute] = (profile.tracking_followup_time || '17:00:00').split(':').map(Number)

      // Check if it's within the followup window (within 15 minutes of their followup time)
      const userTimeInMinutes = userLocalTime.hours * 60 + userLocalTime.minutes
      const followupTimeInMinutes = followupHour * 60 + followupMinute
      const timeDiff = Math.abs(userTimeInMinutes - followupTimeInMinutes)

      if (timeDiff > 15) {
        console.log(`User ${profile.id}: Not followup time yet (current: ${userLocalTime.hours}:${userLocalTime.minutes}, followup: ${followupHour}:${followupMinute})`)
        continue
      }

      console.log(`User ${profile.id}: Within followup window`)

      // Get user's tracking configs that are enabled
      const { data: trackingConfigs, error: configError } = await supabase
        .from('habit_tracking_config')
        .select('*')
        .eq('user_id', profile.id)
        .eq('tracking_enabled', true)

      if (configError || !trackingConfigs || trackingConfigs.length === 0) {
        console.log(`User ${profile.id}: No tracking configs enabled`)
        continue
      }

      // Get user's habits for today
      const { data: todayHabits, error: habitsError } = await supabase
        .from('weekly_habits')
        .select('*')
        .eq('user_id', profile.id)
        .eq('day_of_week', userLocalTime.dayOfWeek)

      if (habitsError || !todayHabits || todayHabits.length === 0) {
        console.log(`User ${profile.id}: No habits scheduled for today`)
        continue
      }

      // Find habits that have tracking enabled
      const habitsWithTracking = todayHabits.filter((habit: Habit) =>
        trackingConfigs.some((config: TrackingConfig) => config.habit_name === habit.habit_name)
      )

      if (habitsWithTracking.length === 0) {
        console.log(`User ${profile.id}: No tracked habits for today`)
        continue
      }

      // Check for existing entries today
      const { data: existingEntries } = await supabase
        .from('habit_tracking_entries')
        .select('habit_name')
        .eq('user_id', profile.id)
        .eq('entry_date', userLocalTime.dateStr)

      const existingHabitNames = new Set(existingEntries?.map(e => e.habit_name) || [])

      // Filter to habits that don't have entries yet
      const habitsNeedingFollowup = habitsWithTracking.filter(
        (habit: Habit) => !existingHabitNames.has(habit.habit_name)
      )

      if (habitsNeedingFollowup.length === 0) {
        console.log(`User ${profile.id}: All tracked habits already have entries`)
        continue
      }

      // Check which habits already have a followup sent today
      const { data: existingFollowups } = await supabase
        .from('sms_followup_log')
        .select('habit_name')
        .eq('user_id', profile.id)
        .gte('sent_at', `${userLocalTime.dateStr}T00:00:00`)

      const habitsWithFollowupSent = new Set(existingFollowups?.map(f => f.habit_name) || [])

      // Check if there's a PENDING followup (sent but not yet answered)
      // A followup is pending if: it was sent today AND no entry exists for that habit
      const pendingFollowups = (existingFollowups || []).filter(
        f => !existingHabitNames.has(f.habit_name)
      )

      if (pendingFollowups.length > 0) {
        console.log(`User ${profile.id}: Has ${pendingFollowups.length} pending followup(s) awaiting response - skipping`)
        continue
      }

      // Filter to habits that haven't had a followup sent yet today
      const habitsNeedingFirstFollowup = habitsNeedingFollowup.filter(
        (habit: Habit) => !habitsWithFollowupSent.has(habit.habit_name)
      )

      if (habitsNeedingFirstFollowup.length === 0) {
        console.log(`User ${profile.id}: All tracked habits already have followups sent today`)
        continue
      }

      // Send followup SMS for the first habit needing followup
      const habitToFollowup = habitsNeedingFirstFollowup[0]
      const trackingConfig = trackingConfigs.find(
        (c: TrackingConfig) => c.habit_name === habitToFollowup.habit_name
      )

      if (!trackingConfig) continue

      const firstName = profile.first_name || 'there'
      let message: string

      if (trackingConfig.tracking_type === 'boolean') {
        message = `Hi ${firstName}! Did you complete "${trackingConfig.habit_name}" today? Reply Y or N`
      } else {
        const unit = trackingConfig.metric_unit || 'units'
        message = `Hi ${firstName}! How many ${unit} for "${trackingConfig.habit_name}" today? Reply with a number`
      }

      console.log(`Sending followup to ${profile.id}: "${message}"`)

      const smsResult = await sendSMS(profile.phone, message)

      // Log the followup
      await supabase.from('sms_followup_log').insert({
        user_id: profile.id,
        habit_name: trackingConfig.habit_name,
        sent_at: now.toISOString(),
        message_sent: message,
      })

      results.push({
        userId: profile.id,
        habitName: trackingConfig.habit_name,
        status: smsResult.success ? 'sent' : 'failed',
        error: smsResult.error,
      })
    }

    return new Response(
      JSON.stringify({
        message: 'Habit followup check complete',
        followupsSent: results.filter(r => r.status === 'sent').length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in habit-sms-followup:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
