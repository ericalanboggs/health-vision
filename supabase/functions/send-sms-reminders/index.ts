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
  reminder_time: string
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
 * Get current time in a specific timezone
 * Returns { hours, minutes, dayOfWeek }
 */
function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; dayOfWeek: number } {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    })

    const parts = formatter.formatToParts(now)
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Sun'

    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    }
    const dayOfWeek = dayMap[weekdayStr] ?? 0

    return { hours, minutes, dayOfWeek }
  } catch (error) {
    console.error(`Error getting time for timezone ${timezone}:`, error)
    // Fallback to UTC
    const now = new Date()
    return {
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
      dayOfWeek: now.getUTCDay()
    }
  }
}

/**
 * Pick a relevant emoji for a habit based on its name
 */
function getHabitEmoji(habitName: string): string {
  const name = habitName.toLowerCase()

  // Meditation / mindfulness
  if (name.includes('meditat') || name.includes('mindful') || name.includes('breath')) return '🧘'
  // Water / hydration
  if (name.includes('water') || name.includes('hydrat') || name.includes('drink')) return '🚰'
  // Running / cardio
  if (name.includes('run') || name.includes('jog') || name.includes('cardio')) return '🏃'
  // Walking
  if (name.includes('walk') || name.includes('step')) return '🚶'
  // Exercise / workout
  if (name.includes('exercis') || name.includes('workout') || name.includes('gym') || name.includes('lift') || name.includes('strength')) return '💪'
  // Yoga / stretching
  if (name.includes('yoga') || name.includes('stretch')) return '🧘'
  // Journaling / writing
  if (name.includes('journal') || name.includes('writ') || name.includes('diary')) return '📝'
  // Reading
  if (name.includes('read') || name.includes('book')) return '📚'
  // Sleep / rest
  if (name.includes('sleep') || name.includes('bed') || name.includes('rest')) return '😴'
  // Vitamins / supplements / medication
  if (name.includes('vitamin') || name.includes('supplement') || name.includes('medic') || name.includes('pill')) return '💊'
  // Eating / nutrition
  if (name.includes('eat') || name.includes('food') || name.includes('meal') || name.includes('nutrition') || name.includes('vegetable') || name.includes('fruit')) return '🥗'
  // Prayer / spiritual
  if (name.includes('pray') || name.includes('spiritual') || name.includes('gratitude') || name.includes('thank')) return '🙏'
  // Cycling / biking
  if (name.includes('bike') || name.includes('cycl')) return '🚴'
  // Swimming
  if (name.includes('swim')) return '🏊'
  // Cleaning / organizing
  if (name.includes('clean') || name.includes('organiz') || name.includes('tidy')) return '🧹'
  // Learning / studying
  if (name.includes('learn') || name.includes('study') || name.includes('course')) return '🎓'
  // Music / practice
  if (name.includes('music') || name.includes('piano') || name.includes('guitar') || name.includes('practic')) return '🎵'
  // Cooking
  if (name.includes('cook') || name.includes('recipe')) return '👨‍🍳'
  // Phone / screen time
  if (name.includes('phone') || name.includes('screen')) return '📱'
  // Nature / outdoors
  if (name.includes('nature') || name.includes('outdoor') || name.includes('hike')) return '🌲'

  // Default fallback
  return '✨'
}

/**
 * Generate a personalized reminder message using OpenAI
 * Supports multiple habits with emoji representation
 */
async function generatePersonalizedMessage(
  firstName: string,
  habits: { name: string; time: string }[],
  visionData: VisionData
): Promise<string> {
  const habitCount = habits.length
  const habitNames = habits.map(h => h.name).join(', ')
  const firstHabitTime = formatTime12Hour(habits[0].time)

  // Generate emojis for all habits
  const emojis = habits.map(h => getHabitEmoji(h.name)).join('')

  // Fallback message generator (uses smart emoji selection)
  const generateFallback = () => {
    if (habitCount === 1) {
      return `Hi ${firstName}! ${emojis} Time for ${habits[0].name.toLowerCase()} at ${firstHabitTime}. You've got this!`
    }
    return `Hi ${firstName}! ${habitCount} habits today ${emojis}. Starting at ${firstHabitTime}. You've got this!`
  }

  // Fallback if OpenAI is not configured
  if (!OPENAI_API_KEY) {
    console.log('OpenAI not configured, using fallback with smart emojis')
    return generateFallback()
  }

  try {
    const prompt = `You are a supportive health coach sending a brief SMS reminder. Generate a personalized message.

User's Name: ${firstName}
Number of Habits Today: ${habitCount}
Habits: ${habitNames}
First Habit Time: ${firstHabitTime}
User's Health Vision: ${visionData.visionStatement || 'Living healthier'}
Why It Matters: ${visionData.whyMatters || 'To feel better'}

Requirements:
- MUST be under 155 characters total
- Start with "Hi ${firstName}!"
- Choose 1 relevant emoji per habit (e.g., 🧘 for meditation, 🚰 for water, 🏃 for running, 📝 for journaling, 💊 for vitamins, 🥗 for healthy eating, 😴 for sleep, 📚 for reading)
- If multiple habits: "Hi ${firstName}! ${habitCount} habits today [emojis]. [Brief vision connection]. You've got this!"
- If single habit: "Hi ${firstName}! [emoji] Time for [habit] at ${firstHabitTime}. [Brief encouragement]"
- Keep the vision connection SHORT (5-8 words max)
- End with "You've got this!" or similar short encouragement

Examples:
- "Hi ${firstName}! 2 habits today 🧘🚰. Building your calm, energized self. You've got this!"
- "Hi ${firstName}! 🏃 Time for your run at ${firstHabitTime}. One step closer to your summit!"
- "Hi ${firstName}! 3 habits today 📝🥗💊. Investing in future you. Let's go!"

Generate the message (under 155 chars):`

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
            content: 'You are a supportive health coach. Write very brief SMS reminders under 155 characters. Always pick relevant emojis for each habit.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 80,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    let message = data.choices[0]?.message?.content?.trim()

    if (!message) {
      throw new Error('No message generated')
    }

    // Remove any quotes that might wrap the message
    message = message.replace(/^["']|["']$/g, '')

    // Ensure message is under 160 characters (leave room for "Reply STOP to opt out")
    if (message.length > 155) {
      console.log('Generated message too long, using fallback')
      return generateFallback()
    }

    console.log(`✨ Generated message (${message.length} chars): ${message}`)
    return message

  } catch (error) {
    console.error('Error generating personalized message:', error)
    return generateFallback()
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

    // Filter out habits without reminder_time set (use reminder_time, fallback to time_of_day)
    const habitsWithTime = habits.filter((h: Habit) => h.reminder_time || h.time_of_day)

    if (habitsWithTime.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No habits with reminder times set for today', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get unique user IDs
    const userIds = [...new Set(habitsWithTime.map((h: Habit) => h.user_id))]
    console.log('User IDs with habits today:', userIds)
    
    // Get user profiles with SMS consent
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
      .eq('sms_opt_in', true)
      .is('deleted_at', null)

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

    // Group habits by user
    const habitsByUser = new Map<string, Habit[]>()
    for (const habit of habitsWithTime) {
      if (!habitsByUser.has(habit.user_id)) {
        habitsByUser.set(habit.user_id, [])
      }
      habitsByUser.get(habit.user_id)!.push(habit)
    }

    // Send ONE consolidated reminder per user per day (before their first habit)
    const results = []
    const currentTimeInMinutes = currentHour * 60 + currentMinute

    for (const [userId, userHabits] of habitsByUser.entries()) {
      const profile = profileMap.get(userId)
      if (!profile || !profile.phone) {
        console.log(`Skipping user ${userId} - no profile or phone`)
        continue
      }

      // Get current time in USER'S timezone (habit times are stored in user's local time)
      const userTimezone = profile.timezone || 'America/Chicago'
      const userLocalTime = getCurrentTimeInTimezone(userTimezone)
      const userCurrentTimeInMinutes = userLocalTime.hours * 60 + userLocalTime.minutes

      console.log(`User ${profile.first_name} (${userId}): Local time ${userLocalTime.hours}:${userLocalTime.minutes.toString().padStart(2, '0')} (${userTimezone})`)

      // Filter habits to only those for today in user's timezone
      const todayHabits = userHabits.filter(h => h.day_of_week === userLocalTime.dayOfWeek)
      if (todayHabits.length === 0) {
        console.log(`User ${userId}: No habits for today (${userLocalTime.dayOfWeek}) in their timezone`)
        continue
      }

      // Check if we already sent a daily reminder to this user today
      const { data: existingReminder } = await supabase
        .from('sms_reminders')
        .select('id')
        .eq('user_id', userId)
        .gte('sent_at', new Date(now.setHours(0, 0, 0, 0)).toISOString())
        .maybeSingle()

      if (existingReminder) {
        console.log(`Already sent daily reminder to user ${userId} today`)
        continue
      }

      // Helper to get the effective reminder time (prefer reminder_time, fallback to time_of_day)
      const getEffectiveTime = (habit: Habit): string => habit.reminder_time || habit.time_of_day

      // Sort habits by time to find the earliest one
      const sortedHabits = todayHabits.sort((a, b) => getEffectiveTime(a).localeCompare(getEffectiveTime(b)))

      // Get the earliest habit time
      const firstHabit = sortedHabits[0]
      const effectiveTime = getEffectiveTime(firstHabit)
      const [firstHabitHour, firstHabitMinute] = effectiveTime.split(':').map(Number)
      const firstHabitTimeInMinutes = firstHabitHour * 60 + firstHabitMinute
      const minutesUntilFirstHabit = firstHabitTimeInMinutes - userCurrentTimeInMinutes

      // Only send if we're 15-30 minutes before the first habit
      if (minutesUntilFirstHabit < 15 || minutesUntilFirstHabit > 30) {
        console.log(`User ${userId}: First habit at ${effectiveTime}, ${minutesUntilFirstHabit} min away (local time) - outside reminder window`)
        continue
      }

      console.log(`User ${userId}: First habit at ${effectiveTime}, ${minutesUntilFirstHabit} min away (local time) - sending reminder!`)

      // Get user's vision data
      const visionData = visionMap.get(userId) || {}
      const firstName = profile.first_name || 'there'

      // Build habits array for message generation
      const habitsForMessage = sortedHabits.map(h => ({
        name: h.habit_name,
        time: getEffectiveTime(h)
      }))

      // Generate personalized message with emojis for all habits
      const personalizedMessage = await generatePersonalizedMessage(firstName, habitsForMessage, visionData)

      // Add opt-out footer
      const message = `${personalizedMessage} Reply STOP to opt out.`

      console.log(`Message length: ${message.length} characters (${sortedHabits.length} habits)`)

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
          // Log successful reminder (store first habit ID as reference)
          await supabase.from('sms_reminders').insert({
            user_id: userId,
            habit_id: sortedHabits[0].id,
            phone: profile.phone,
            message,
            scheduled_for: now.toISOString(),
            status: 'sent',
            twilio_sid: twilioData.sid,
          })

          results.push({ userId, status: 'sent', phone: profile.phone, habitCount: sortedHabits.length })
          console.log(`✓ Sent daily reminder to ${profile.phone} with ${sortedHabits.length} habits`)
        } else {
          throw new Error(twilioData.message || 'Twilio API error')
        }
      } catch (error) {
        console.error(`✗ Failed to send reminder to user ${userId}:`, error)
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Log failed reminder
        await supabase.from('sms_reminders').insert({
          user_id: userId,
          habit_id: sortedHabits[0].id,
          phone: profile.phone,
          message,
          scheduled_for: now.toISOString(),
          status: 'failed',
          error_message: errorMessage,
        })

        results.push({ userId, status: 'failed', error: errorMessage })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Daily reminder check complete',
        totalHabitsToday: habits.length,
        usersWithHabits: habitsByUser.size,
        remindersSent: results.filter(r => r.status === 'sent').length,
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
