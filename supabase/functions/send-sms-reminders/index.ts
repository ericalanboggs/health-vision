import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

interface Habit {
  id: string
  user_id: string
  habit_name: string
  day_of_week: number
  time_of_day: string
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
 * Convert 24-hour time to 12-hour format with AM/PM
 */
function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'pm' : 'am'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`
}

/**
 * Generate a personalized reminder message using OpenAI
 */
async function generatePersonalizedMessage(
  firstName: string,
  habitName: string,
  timeOfDay: string,
  visionData: VisionData
): Promise<string> {
  // Convert time to 12-hour format with AM/PM
  const formattedTime = formatTime12Hour(timeOfDay)
  
  // Fallback to generic message if OpenAI is not configured
  if (!OPENAI_API_KEY) {
    console.log('OpenAI not configured, using generic message')
    return `Hi ${firstName}! 🏔️ Reminder: "${habitName}" is coming up at ${formattedTime}. You've got this!`
  }

  try {
    const prompt = `You are a supportive health coach sending a brief SMS reminder. Generate a personalized, motivating reminder message (max 160 characters) for this habit.

User's Health Vision: ${visionData.visionStatement || 'Not provided'}
Why It Matters: ${visionData.whyMatters || 'Not provided'}
User's Name: ${firstName}
Habit: ${habitName}
Time: ${formattedTime}

Requirements:
- Keep it under 160 characters (SMS-friendly)
- Include the 🏔️ emoji
- Connect the habit to their vision/why
- Be encouraging and personal
- Start with "Hi ${firstName}!"
- Don't use quotes around the habit name

Example: "Hi ${firstName}! 🏔️ Your walk at ${formattedTime} is a step toward that energized, clear-headed version of you. Let's go!"

Generate the message:`

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

    // Ensure message is under 160 characters
    if (message.length > 160) {
      console.log('Generated message too long, using generic')
      return `Hi ${firstName}! 🏔️ Reminder: "${habitName}" is coming up at ${formattedTime}. You've got this!`
    }

    console.log(`✨ Generated personalized message: ${message}`)
    return message

  } catch (error) {
    console.error('Error generating personalized message:', error)
    // Fallback to generic message
    return `Hi ${firstName}! 🏔️ Reminder: "${habitName}" is coming up at ${formattedTime}. You've got this!`
  }
}

serve(async (req) => {
  try {
    // Verify this is a cron job or authorized request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get current time and day of week
    const now = new Date()
    const currentDayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    console.log(`Running reminder check at ${now.toISOString()}`)
    console.log(`Day: ${currentDayOfWeek}, Hour: ${currentHour}, Minute: ${currentMinute}`)

    // Query habits that should get reminders now
    // Look for habits scheduled for today within the next hour
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

    // Filter habits by time (send reminder 15 minutes before scheduled time)
    const habitsToRemind = habits.filter((habit: Habit) => {
      // Skip habits without a time set
      if (!habit.time_of_day) {
        console.log(`Skipping habit ${habit.id} - no time_of_day set`)
        return false
      }
      
      const [habitHour, habitMinute] = habit.time_of_day.split(':').map(Number)
      
      // Calculate minutes until habit time
      const habitTimeInMinutes = habitHour * 60 + habitMinute
      const currentTimeInMinutes = currentHour * 60 + currentMinute
      const minutesUntilHabit = habitTimeInMinutes - currentTimeInMinutes

      // Send reminder 15 minutes before (between 15-30 minutes before to allow for cron timing)
      return minutesUntilHabit >= 15 && minutesUntilHabit <= 30
    })

    console.log(`${habitsToRemind.length} habits need reminders now`)

    // Get user profiles for these habits
    const userIds = [...new Set(habitsToRemind.map((h: Habit) => h.user_id))]
    console.log('User IDs to fetch:', userIds)
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
      .eq('sms_opt_in', true)
    
    console.log('Profiles query result:', profiles)

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

    // Fetch vision data for all users
    const { data: visionJourneys, error: visionError } = await supabase
      .from('health_journeys')
      .select('user_id, form_data')
      .in('user_id', userIds)

    if (visionError) {
      console.error('Error fetching vision data:', visionError)
    }

    console.log(`Found ${visionJourneys?.length || 0} user visions`)

    // Create maps for quick lookup
    const profileMap = new Map(profiles.map((p: Profile) => [p.id, p]))
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

    // Send reminders
    const results = []
    for (const habit of habitsToRemind) {
      const profile = profileMap.get(habit.user_id)
      if (!profile || !profile.phone) {
        console.log(`Skipping habit ${habit.id} - no profile or phone`)
        continue
      }

      // Check if we already sent a reminder for this habit today
      const { data: existingReminder } = await supabase
        .from('sms_reminders')
        .select('id')
        .eq('habit_id', habit.id)
        .gte('sent_at', new Date(now.setHours(0, 0, 0, 0)).toISOString())
        .single()

      if (existingReminder) {
        console.log(`Already sent reminder for habit ${habit.id} today`)
        continue
      }

      // Get user's vision data
      const visionData = visionMap.get(habit.user_id) || {}
      const firstName = profile.first_name || 'there'

      // Generate personalized message using OpenAI
      const message = await generatePersonalizedMessage(
        firstName,
        habit.habit_name,
        habit.time_of_day,
        visionData
      )

      try {
        // Send SMS via Twilio
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            },
            body: new URLSearchParams({
              To: profile.phone,
              From: TWILIO_PHONE_NUMBER!,
              Body: message,
            }),
          }
        )

        const twilioData = await twilioResponse.json()

        if (twilioResponse.ok) {
          // Log successful reminder
          await supabase.from('sms_reminders').insert({
            user_id: habit.user_id,
            habit_id: habit.id,
            phone: profile.phone,
            message,
            scheduled_for: new Date(now.setHours(parseInt(habit.time_of_day.split(':')[0]), parseInt(habit.time_of_day.split(':')[1]))).toISOString(),
            status: 'sent',
            twilio_sid: twilioData.sid,
          })

          results.push({ habitId: habit.id, status: 'sent', phone: profile.phone })
          console.log(`✓ Sent reminder to ${profile.phone} for "${habit.habit_name}"`)
        } else {
          throw new Error(twilioData.message || 'Twilio API error')
        }
      } catch (error) {
        console.error(`✗ Failed to send reminder for habit ${habit.id}:`, error)
        
        // Log failed reminder
        await supabase.from('sms_reminders').insert({
          user_id: habit.user_id,
          habit_id: habit.id,
          phone: profile.phone,
          message,
          scheduled_for: new Date(now.setHours(parseInt(habit.time_of_day.split(':')[0]), parseInt(habit.time_of_day.split(':')[1]))).toISOString(),
          status: 'failed',
          error_message: error.message,
        })

        results.push({ habitId: habit.id, status: 'failed', error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Reminder check complete',
        totalHabitsToday: habits.length,
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
