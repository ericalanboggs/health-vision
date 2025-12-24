import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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

    // Create a map of user profiles
    const profileMap = new Map(profiles.map((p: Profile) => [p.id, p]))

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

      // Format the reminder message
      const firstName = profile.first_name || 'there'
      const message = `Hi ${firstName}! 🏔️ Reminder: "${habit.habit_name}" is coming up at ${habit.time_of_day}. You've got this!`

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
