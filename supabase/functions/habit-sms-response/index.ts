import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

/**
 * Get today's date string in a specific timezone (YYYY-MM-DD)
 */
function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(now)
  } catch (error) {
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Get day of week (0-6, Sunday=0) in a specific timezone
 */
function getDayOfWeekInTimezone(timezone: string): number {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    })
    const weekdayStr = formatter.format(now)
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    }
    return dayMap[weekdayStr] ?? 0
  } catch (error) {
    return new Date().getDay()
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

/**
 * Parse incoming SMS body for tracking response
 */
function parseTrackingResponse(body: string): { type: 'boolean'; value: boolean } | { type: 'metric'; value: number } | null {
  const trimmed = body.trim().toLowerCase()

  // Check for boolean responses
  if (['y', 'yes', 'yeah', 'yep', 'done', '1', 'true'].includes(trimmed)) {
    return { type: 'boolean', value: true }
  }
  if (['n', 'no', 'nope', 'nah', '0', 'false', 'skip', 'skipped'].includes(trimmed)) {
    return { type: 'boolean', value: false }
  }

  // Check for numeric responses
  const numMatch = trimmed.match(/^[\d.]+/)
  if (numMatch) {
    const num = parseFloat(numMatch[0])
    if (!isNaN(num) && num >= 0) {
      return { type: 'metric', value: num }
    }
  }

  return null
}

serve(async (req) => {
  // Handle CORS for preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
      },
    })
  }

  try {
    // Twilio sends webhooks as form data
    const formData = await req.formData()
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString() || ''

    console.log(`Received SMS from ${from}: "${body}"`)

    if (!from || !body) {
      // Return empty TwiML response
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Find user by phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', from)
      .maybeSingle()

    if (profileError || !profile) {
      console.log(`No user found for phone ${from}`)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const userTimezone = profile.timezone || 'America/Chicago'
    const todayStr = getTodayInTimezone(userTimezone)

    // Get the most recent followup sent to this user today
    const { data: recentFollowup, error: followupError } = await supabase
      .from('sms_followup_log')
      .select('*')
      .eq('user_id', profile.id)
      .gte('sent_at', `${todayStr}T00:00:00`)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!recentFollowup) {
      console.log(`No recent followup found for user ${profile.id}`)
      // Send a helpful response
      await sendSMS(from, `Thanks for your message! You can track habits through the app at any time.`)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const habitName = recentFollowup.habit_name

    // Get tracking config for this habit
    const { data: trackingConfig } = await supabase
      .from('habit_tracking_config')
      .select('*')
      .eq('user_id', profile.id)
      .eq('habit_name', habitName)
      .maybeSingle()

    if (!trackingConfig || !trackingConfig.tracking_enabled) {
      console.log(`Tracking not enabled for habit "${habitName}"`)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Parse the response
    const parsed = parseTrackingResponse(body)

    if (!parsed) {
      // Send error message
      let helpMessage: string
      if (trackingConfig.tracking_type === 'boolean') {
        helpMessage = `I didn't understand that. Reply Y or N for "${habitName}".`
      } else {
        helpMessage = `I didn't understand that. Reply with a number for "${habitName}".`
      }
      await sendSMS(from, helpMessage)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Check if types match
    const configType = trackingConfig.tracking_type
    if (parsed.type !== configType) {
      let helpMessage: string
      if (configType === 'boolean') {
        helpMessage = `"${habitName}" is tracked as yes/no. Reply Y or N.`
      } else {
        helpMessage = `"${habitName}" is tracked as a number. Reply with a number (e.g., 30).`
      }
      await sendSMS(from, helpMessage)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Save the entry
    const entryData: Record<string, unknown> = {
      user_id: profile.id,
      habit_name: habitName,
      entry_date: todayStr,
      entry_source: 'sms',
      updated_at: new Date().toISOString(),
    }

    if (parsed.type === 'boolean') {
      entryData.completed = parsed.value
      entryData.metric_value = null
    } else {
      entryData.completed = null
      entryData.metric_value = parsed.value
    }

    const { error: upsertError } = await supabase
      .from('habit_tracking_entries')
      .upsert(entryData, {
        onConflict: 'user_id,habit_name,entry_date'
      })

    if (upsertError) {
      console.error('Error saving entry:', upsertError)
      await sendSMS(from, `Sorry, there was an error saving your response. Please try again.`)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Send confirmation
    let confirmationMessage: string
    const firstName = profile.first_name || 'there'

    if (parsed.type === 'boolean') {
      if (parsed.value) {
        confirmationMessage = `Great job, ${firstName}! Logged "${habitName}" as complete for today.`
      } else {
        confirmationMessage = `Got it, ${firstName}. "${habitName}" marked as not done today. Tomorrow's a new day!`
      }
    } else {
      const unit = trackingConfig.metric_unit || 'units'
      confirmationMessage = `Logged ${parsed.value} ${unit} for "${habitName}". `

      if (trackingConfig.metric_target && parsed.value >= trackingConfig.metric_target) {
        confirmationMessage += `You hit your target! Great job, ${firstName}!`
      } else if (trackingConfig.metric_target) {
        const remaining = trackingConfig.metric_target - parsed.value
        confirmationMessage += `${remaining} more to hit your daily goal of ${trackingConfig.metric_target}.`
      } else {
        confirmationMessage += `Keep it up, ${firstName}!`
      }
    }

    await sendSMS(from, confirmationMessage)

    console.log(`Successfully logged ${parsed.type} entry for ${habitName}`)

    // Check if there are more habits to follow up on (conversational chaining)
    try {
      const dayOfWeek = getDayOfWeekInTimezone(userTimezone)

      // Get all habits scheduled for today
      const { data: todayHabits } = await supabase
        .from('weekly_habits')
        .select('habit_name')
        .eq('user_id', profile.id)
        .eq('day_of_week', dayOfWeek)

      if (todayHabits && todayHabits.length > 0) {
        // Get all tracking configs that are enabled
        const { data: allTrackingConfigs } = await supabase
          .from('habit_tracking_config')
          .select('*')
          .eq('user_id', profile.id)
          .eq('tracking_enabled', true)

        if (allTrackingConfigs && allTrackingConfigs.length > 0) {
          // Get existing entries for today
          const { data: existingEntries } = await supabase
            .from('habit_tracking_entries')
            .select('habit_name')
            .eq('user_id', profile.id)
            .eq('entry_date', todayStr)

          const habitsWithEntries = new Set(existingEntries?.map(e => e.habit_name) || [])

          // Find habits that: are scheduled today, have tracking enabled, don't have entries yet
          const habitsNeedingFollowup = todayHabits.filter(habit =>
            allTrackingConfigs.some(config => config.habit_name === habit.habit_name) &&
            !habitsWithEntries.has(habit.habit_name)
          )

          if (habitsNeedingFollowup.length > 0) {
            const nextHabit = habitsNeedingFollowup[0]
            const nextConfig = allTrackingConfigs.find(c => c.habit_name === nextHabit.habit_name)

            if (nextConfig) {
              // Build the next follow-up message
              let nextMessage: string
              if (nextConfig.tracking_type === 'boolean') {
                nextMessage = `Did you complete "${nextConfig.habit_name}" today? Reply Y or N`
              } else {
                const unit = nextConfig.metric_unit || 'units'
                nextMessage = `How many ${unit} for "${nextConfig.habit_name}" today? Reply with a number`
              }

              // Send the next follow-up
              await sendSMS(from, nextMessage)

              // Log the follow-up
              await supabase.from('sms_followup_log').insert({
                user_id: profile.id,
                habit_name: nextConfig.habit_name,
                sent_at: new Date().toISOString(),
                message_sent: nextMessage,
              })

              console.log(`Sent chained followup for "${nextConfig.habit_name}"`)
            }
          }
        }
      }
    } catch (chainError) {
      // Don't fail the response if chaining fails
      console.error('Error in followup chaining:', chainError)
    }

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )

  } catch (error) {
    console.error('Error in habit-sms-response:', error)
    // Return empty TwiML response to acknowledge receipt
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
})
