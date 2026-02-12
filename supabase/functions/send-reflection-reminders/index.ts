import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const PROGRAM_START_DATE = Deno.env.get('PROGRAM_START_DATE') || '2026-01-12'
const APP_URL = 'https://summit-pilot.vercel.app'

interface Profile {
  id: string
  first_name: string
  phone: string
  sms_opt_in: boolean
}

/**
 * Get the current week number based on program start date
 */
function getCurrentWeekNumber(): number {
  const [year, month, day] = PROGRAM_START_DATE.split('-').map(Number)
  const programStartDate = new Date(year, month - 1, day)
  const now = new Date()

  // Reset time to midnight for accurate day calculation
  programStartDate.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)

  const diffTime = now.getTime() - programStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  // Ensure week number is at least 1
  return Math.max(1, weekNumber)
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
    const currentDayOfWeek = now.getDay() // 0 = Sunday
    const currentWeekNumber = getCurrentWeekNumber()

    console.log(`Running reflection reminder check at ${now.toISOString()}`)
    console.log(`Day: ${currentDayOfWeek}, Week: ${currentWeekNumber}`)

    // Only run on Sundays
    if (currentDayOfWeek !== 0) {
      return new Response(
        JSON.stringify({ message: 'Not Sunday, skipping reflection reminders' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get all users with SMS consent
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, phone, sms_opt_in')
      .eq('sms_opt_in', true)
      .is('deleted_at', null)

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

    // Get all reflections for current week
    const userIds = profiles.map((p: Profile) => p.id)
    const { data: reflections, error: reflectionsError } = await supabase
      .from('weekly_reflections')
      .select('user_id')
      .in('user_id', userIds)
      .eq('week_number', currentWeekNumber)

    if (reflectionsError) {
      console.error('Error fetching reflections:', reflectionsError)
      throw reflectionsError
    }

    console.log(`Found ${reflections?.length || 0} completed reflections for week ${currentWeekNumber}`)

    // Find users who haven't completed their reflection
    const completedUserIds = new Set(reflections?.map((r: any) => r.user_id) || [])
    const usersNeedingReminder = profiles.filter((p: Profile) => !completedUserIds.has(p.id))

    console.log(`${usersNeedingReminder.length} users need reflection reminders`)

    // Send reminders
    const results = []
    for (const profile of usersNeedingReminder) {
      if (!profile.phone) {
        console.log(`Skipping user ${profile.id} - no phone`)
        continue
      }

      // Check if we already sent a reminder today
      const { data: existingReminder } = await supabase
        .from('sms_reminders')
        .select('id')
        .eq('user_id', profile.id)
        .is('habit_id', null) // Reflection reminders don't have a habit_id
        .gte('sent_at', new Date(now.setHours(0, 0, 0, 0)).toISOString())
        .single()

      if (existingReminder) {
        console.log(`Already sent reflection reminder to user ${profile.id} today`)
        continue
      }

      const firstName = profile.first_name || 'there'
      const message = `Hi ${firstName}! 🏔️ It's the last day of the week - take a moment to reflect on your progress and plan for next week: ${APP_URL}/dashboard`

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
            user_id: profile.id,
            habit_id: null, // No habit for reflection reminders
            phone: profile.phone,
            message,
            scheduled_for: now.toISOString(),
            status: 'sent',
            twilio_sid: twilioData.sid,
          })

          results.push({ userId: profile.id, status: 'sent', phone: profile.phone })
          console.log(`✓ Sent reflection reminder to ${profile.phone}`)
        } else {
          throw new Error(twilioData.message || 'Twilio API error')
        }
      } catch (error) {
        console.error(`✗ Failed to send reflection reminder to user ${profile.id}:`, error)
        
        // Log failed reminder
        await supabase.from('sms_reminders').insert({
          user_id: profile.id,
          habit_id: null,
          phone: profile.phone,
          message,
          scheduled_for: now.toISOString(),
          status: 'failed',
          error_message: error.message,
        })

        results.push({ userId: profile.id, status: 'failed', error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Reflection reminder check complete',
        weekNumber: currentWeekNumber,
        totalUsers: profiles.length,
        remindersAttempted: results.length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-reflection-reminders function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
