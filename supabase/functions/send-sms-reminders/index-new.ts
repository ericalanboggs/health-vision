import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const PILOT_START_DATE = Deno.env.get('PILOT_START_DATE') || '2026-01-12'

interface Habit {
  id: string
  user_id: string
  habit_name: string
  day_of_week: number
  time_of_day?: string
  reminder_time?: string
  week_number: number
}

interface Profile {
  id: string
  first_name: string
  phone: string
  sms_opt_in: boolean
  timezone: string
}

interface VisionData {
  visionStatement?: string
  whyMatters?: string
  feelingState?: string
  futureAbilities?: string
}

/**
 * Convert UTC time to user's local time and format as 12-hour with AM/PM
 */
function formatTime12Hour(time24: string, userTimezone: string = 'America/Chicago'): string {
  const [hours, minutes] = time24.split(':').map(Number)
  
  // Create a date object with the time in the user's timezone
  const now = new Date()
  now.setHours(hours, minutes, 0, 0)
  
  // Format in user's timezone
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: userTimezone
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(now)
    .replace(' ', '')
    .toLowerCase()
}

/**
 * Generate a consolidated personalized reminder message using OpenAI
 */
async function generateConsolidatedMessage(
  firstName: string,
  habits: Habit[],
  visionData: VisionData,
  userTimezone: string
): Promise<string> {
  // Format habits list with user's local time
  const habitList = habits
    .map(h => `${formatTime12Hour(h.time_of_day || h.reminder_time || '', userTimezone)} - ${h.habit_name}`)
    .join(', ')
  
  // Fallback to generic message if OpenAI is not configured
  if (!OPENAI_API_KEY) {
    console.log('OpenAI not configured, using generic message')
    return `Hi ${firstName}! 🏔️ Today's habits: ${habitList}. You've got this!` 
  }

  try {
    const prompt = `You are a supportive health coach sending a brief SMS reminder for multiple habits. Generate a consolidated, motivating reminder message (max 160 characters) for today's habits.

User's Health Vision: ${visionData.visionStatement || 'Not provided'}
Why It Matters: ${visionData.whyMatters || 'Not provided'}
User's Name: ${firstName}
Today's Habits: ${habitList}

Requirements:
- Keep it under 160 characters (SMS-friendly)
- Include 🏔️ emoji
- Connect habits to their vision/why
- Be encouraging and personal
- Start with "Hi ${firstName}!"
- List all habits with times
- Don't use quotes around habit names

Example: Hi ${firstName}! 🏔️ Today: 9am - Morning walk, 2pm - Healthy lunch. Steps toward that energized you!

Generate message:`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a supportive health coach who writes brief, personalized SMS reminders that connect habits to users\' health visions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const message = data.choices[0]?.message?.content?.trim()

    if (!message) {
      throw new Error('No message generated')
    }

    if (message.length > 160) {
      console.log('Generated message too long, using generic')
      return `Hi ${firstName}! 🏔️ Today's habits: ${habitList}. You've got this!` 
    }

    console.log(`✨ Generated consolidated message: ${message}`)
    return message

  } catch (error) {
    console.error('Error generating consolidated message:', error)
    return `Hi ${firstName}! 🏔️ Today's habits: ${habitList}. You've got this!` 
  }
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(phone: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
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
          To: phone,
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const now = new Date()
    const currentDayOfWeek = now.getDay()

    console.log(`Running reminder check at ${now.toISOString()}`)
    console.log(`Day: ${currentDayOfWeek}`)

    // Check pilot date range
    const pilotStartDate = new Date(PILOT_START_DATE)
    const pilotEndDate = new Date(pilotStartDate)
    pilotEndDate.setDate(pilotEndDate.getDate() + 21)
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    if (today < pilotStartDate || today > pilotEndDate) {
      console.log(`Outside pilot date range`)
      return new Response(
        JSON.stringify({ 
          message: 'Outside pilot date range - no reminders sent',
          pilotStartDate: pilotStartDate.toISOString(),
          pilotEndDate: pilotEndDate.toISOString(),
          currentDate: today.toISOString()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Query ALL habits scheduled for today
    const { data: habits, error: habitsError } = await supabase
      .from('weekly_habits')
      .select('*')
      .eq('day_of_week', currentDayOfWeek)

    if (habitsError) {
      console.error('Error fetching habits:', habitsError)
      throw habitsError
    }

    console.log(`Found ${habits?.length || 0} habits for today`)

    if (!habits || habits.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No habits scheduled for today', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get user profiles to access timezones
    const allUserIds = [...new Set(habits.map((h: Habit) => h.user_id))]
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, timezone, sms_opt_in, first_name, phone')
      .in('id', allUserIds)
    
    if (allProfilesError) {
      console.error('Error fetching profiles:', allProfilesError)
      throw allProfilesError
    }

    const profileMap = new Map(allProfiles?.map((p: Profile) => [p.id, p]) || [])

    // Filter habits by time (send reminder 30-60 minutes before scheduled time)
    const habitsToRemind = habits.filter((habit: Habit) => {
      const habitTime = habit.time_of_day || habit.reminder_time
      
      if (!habitTime) {
        console.log(`Skipping habit ${habit.id} - no time set`)
        return false
      }
      
      const profile = profileMap.get(habit.user_id)
      const userTimezone = profile?.timezone || 'America/Chicago'
      
      // Parse habit time (stored in user's local timezone)
      const [habitHour, habitMinute] = habitTime.split(':').map(Number)
      
      // Get current time in user's timezone
      const nowInUserTZ = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
      const currentHourLocal = nowInUserTZ.getHours()
      const currentMinuteLocal = nowInUserTZ.getMinutes()
      
      // Calculate minutes until habit time (in user's local time)
      const habitTimeInMinutes = habitHour * 60 + habitMinute
      const currentTimeInMinutes = currentHourLocal * 60 + currentMinuteLocal
      const minutesUntilHabit = habitTimeInMinutes - currentTimeInMinutes

      console.log(`Habit ${habit.id}: time=${habitTime}, userTZ=${userTimezone}, currentLocal=${currentHourLocal}:${currentMinuteLocal}, minutesUntil=${minutesUntilHabit}`)

      // Send reminder 30-60 minutes before habit time
      return minutesUntilHabit >= 30 && minutesUntilHabit <= 60
    })

    console.log(`${habitsToRemind.length} habits need reminders now`)

    if (habitsToRemind.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No habits in reminder window', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get profiles with SMS consent
    const userIds = [...new Set(habitsToRemind.map((h: Habit) => h.user_id))]
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
      .eq('sms_opt_in', true)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`Found ${profiles?.length || 0} users with SMS consent`)

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with SMS consent', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch vision data
    const { data: visionJourneys, error: visionError } = await supabase
      .from('health_journeys')
      .select('user_id, form_data')
      .in('user_id', userIds)

    if (visionError) {
      console.error('Error fetching vision data:', visionError)
    }

    const visionMap = new Map(
      visionJourneys?.map((v: any) => [
        v.user_id,
        {
          visionStatement: v.form_data?.visionStatement,
          whyMatters: v.form_data?.whyMatters,
          feelingState: v.form_data?.feelingState,
          futureAbilities: v.form_data?.futureAbilities,
        }
      ]) || []
    )

    // Group habits by user for consolidation
    const habitsByUser = new Map<string, Habit[]>()
    for (const habit of habitsToRemind) {
      const userHabits = habitsByUser.get(habit.user_id) || []
      userHabits.push(habit)
      habitsByUser.set(habit.user_id, userHabits)
    }

    console.log(`Grouped habits for ${habitsByUser.size} users`)

    // Send reminders - ONE PER USER
    const results = []
    const profileMapConsent = new Map(profiles.map((p: Profile) => [p.id, p]))

    for (const [userId, userHabits] of habitsByUser) {
      const profile = profileMapConsent.get(userId)
      if (!profile || !profile.phone) {
        console.log(`Skipping user ${userId} - no profile or phone`)
        continue
      }

      // Check if we already sent a reminder for this user today
      const isTestUser = userId === 'a4286912-80dc-4b17-b04b-33ce776c1026'
      
      if (!isTestUser) {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const { data: existingReminder } = await supabase
          .from('sms_reminders')
          .select('id')
          .eq('user_id', userId)
          .gte('sent_at', todayStart)
          .limit(1)
          .maybeSingle()

        if (existingReminder) {
          console.log(`Already sent reminder for user ${userId} today`)
          continue
        }
      } else {
        console.log(`Test user detected - skipping duplicate check`)
      }

      const visionData = visionMap.get(userId) || {}
      const firstName = profile.first_name || 'there'

      // Generate consolidated message for ALL user's habits
      const message = await generateConsolidatedMessage(
        firstName,
        userHabits,
        visionData,
        profile.timezone || 'America/Chicago'
      )

      // Send ONE SMS per user
      const smsResult = await sendSMS(profile.phone, message)

      if (smsResult.success) {
        // Log successful reminder for ALL habits (consolidated)
        for (const habit of userHabits) {
          await supabase.from('sms_reminders').insert({
            user_id: userId,
            habit_id: habit.id,
            phone: profile.phone,
            message,
            scheduled_for: new Date(now.setHours(
              parseInt((habit.time_of_day || habit.reminder_time || '00:00').split(':')[0]), 
              parseInt((habit.time_of_day || habit.reminder_time || '00:00').split(':')[1])
            )).toISOString(),
            status: 'sent',
            twilio_sid: smsResult.sid,
          })
        }

        results.push({ 
          userId, 
          habitCount: userHabits.length,
          status: 'sent', 
          phone: profile.phone,
          message 
        })
        console.log(`✓ Sent consolidated reminder to ${profile.phone} for ${userHabits.length} habits`)
      } else {
        // Log failed reminder for ALL habits
        for (const habit of userHabits) {
          await supabase.from('sms_reminders').insert({
            user_id: userId,
            habit_id: habit.id,
            phone: profile.phone,
            message,
            scheduled_for: new Date(now.setHours(
              parseInt((habit.time_of_day || habit.reminder_time || '00:00').split(':')[0]), 
              parseInt((habit.time_of_day || habit.reminder_time || '00:00').split(':')[1])
            )).toISOString(),
            status: 'failed',
            error_message: smsResult.error,
          })
        }

        results.push({ 
          userId, 
          habitCount: userHabits.length,
          status: 'failed', 
          error: smsResult.error 
        })
        console.error(`✗ Failed to send consolidated reminder for user ${userId}: ${smsResult.error}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Reminder check complete',
        totalHabitsToday: habits.length,
        usersToRemind: habitsByUser.size,
        remindersAttempted: results.length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-sms-reminders function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
