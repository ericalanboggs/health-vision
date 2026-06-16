import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const DAY_NAMES: Record<number, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat'
}

const TIME_LABELS: Record<number, string> = {
  6: 'Early Morning', 8: 'Mid-Morning', 12: 'Lunch', 13: 'Early Afternoon',
  15: 'Afternoon', 17: 'After Work', 21: 'Before Bedtime'
}

function getHabitEmoji(habitName: string): string {
  const name = habitName.toLowerCase()
  if (name.includes('meditat') || name.includes('mindful') || name.includes('breath')) return '\u{1F9D8}'
  if (name.includes('water') || name.includes('hydrat') || name.includes('drink')) return '\u{1F6B0}'
  if (name.includes('run') || name.includes('jog') || name.includes('cardio')) return '\u{1F3C3}'
  if (name.includes('walk') || name.includes('step')) return '\u{1F6B6}'
  if (name.includes('exercis') || name.includes('workout') || name.includes('gym') || name.includes('lift') || name.includes('strength') || name.includes('bodyweight') || name.includes('squat') || name.includes('push')) return '\u{1F4AA}'
  if (name.includes('yoga') || name.includes('stretch')) return '\u{1F9D8}'
  if (name.includes('journal') || name.includes('writ') || name.includes('diary') || name.includes('reflect')) return '\u{1F4DD}'
  if (name.includes('read') || name.includes('book')) return '\u{1F4DA}'
  if (name.includes('sleep') || name.includes('bed') || name.includes('rest')) return '\u{1F634}'
  if (name.includes('vitamin') || name.includes('supplement') || name.includes('medic') || name.includes('pill')) return '\u{1F48A}'
  if (name.includes('eat') || name.includes('food') || name.includes('meal') || name.includes('nutrition') || name.includes('vegetable') || name.includes('fruit')) return '\u{1F957}'
  if (name.includes('pray') || name.includes('spiritual') || name.includes('gratitude') || name.includes('thank')) return '\u{1F64F}'
  if (name.includes('danc')) return '\u{1F483}'
  if (name.includes('bike') || name.includes('cycl')) return '\u{1F6B4}'
  if (name.includes('swim')) return '\u{1F3CA}'
  if (name.includes('clean') || name.includes('organiz') || name.includes('tidy')) return '\u{1F9F9}'
  if (name.includes('learn') || name.includes('study') || name.includes('course')) return '\u{1F393}'
  if (name.includes('music') || name.includes('piano') || name.includes('guitar') || name.includes('practic')) return '\u{1F3B5}'
  if (name.includes('cook') || name.includes('recipe')) return '\u{1F468}\u{200D}\u{1F373}'
  if (name.includes('phone') || name.includes('screen')) return '\u{1F4F1}'
  if (name.includes('nature') || name.includes('outdoor') || name.includes('hike')) return '\u{1F332}'
  if (name.includes('hiit') || name.includes('interval')) return '\u{1F525}'
  return '\u{2728}'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { userId } = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Look up user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, phone, sms_opt_in, motivation_mode')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Only send if user has opted in to SMS and has a phone, and is not in Motivation Mode
    // (Motivation Mode users are off the action-stage track)
    if (!profile.sms_opt_in || !profile.phone || profile.motivation_mode) {
      console.log(`Skipping welcome tour SMS for user ${userId}: sms_opt_in=${profile.sms_opt_in}, phone=${!!profile.phone}, motivation_mode=${profile.motivation_mode}`)
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const name = profile.first_name || 'there'
    const logOpts = {
      supabase,
      logTable: 'sms_messages' as const,
      extra: { user_id: userId, sent_by_type: 'system' },
    }

    // Text 1: Congrats + orientation
    const text1 =
      `Hey ${name}! Congrats on setting up your vision and first habits on Summit \u26f0\ufe0f \u2014 that's a big step.\n\n` +
      `Here's how this works: if you have habit tracking turned on, I'll check in with reminders and quick follow-ups to help you stay on track. ` +
      `You can always text me questions, ask for motivation, or just let me know how things are going.\n\n` +
      `This is your space \u2014 use it however helps you most.`

    const result1 = await sendSMS({ to: profile.phone, body: text1 }, logOpts)
    if (!result1.success) {
      console.error('Failed to send welcome tour text 1:', result1.error)
    }

    // Brief delay so messages arrive in order
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Text 2: BACKUP keyword
    const text2 =
      `One more thing: if your week gets hectic or your habits aren't feeling right, just text BACKUP and I'll help you adjust your plan on the fly. ` +
      `No guilt, no pressure \u2014 just a quick pivot to keep you moving forward.`

    const result2 = await sendSMS({ to: profile.phone, body: text2 }, logOpts)
    if (!result2.success) {
      console.error('Failed to send welcome tour text 2:', result2.error)
    }

    // Brief delay so messages arrive in order
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Text 3: Coach Eric intro + booking link
    const text3 =
      `By the way \u2014 I'm Eric, the coach behind Summit \u26f0\ufe0f. If you'd like to walk through the app together or talk about your goals, I'd love that. ` +
      `Book a free 15-min call anytime: https://cal.com/summit-health/15min`

    const result3 = await sendSMS({ to: profile.phone, body: text3 }, logOpts)
    if (!result3.success) {
      console.error('Failed to send welcome tour text 3:', result3.error)
    }

    // Brief delay so messages arrive in order
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Text 4: Habit summary + confidence question
    // Load user's habits
    const { data: habits } = await supabase
      .from('weekly_habits')
      .select('habit_name, day_of_week, reminder_time')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: true })

    if (habits && habits.length > 0) {
      // Group by habit name
      const habitGroups: Record<string, { days: number[]; time: string }> = {}
      for (const h of habits) {
        if (!habitGroups[h.habit_name]) {
          const hour = h.reminder_time ? parseInt(h.reminder_time.split(':')[0]) : 8
          habitGroups[h.habit_name] = { days: [], time: TIME_LABELS[hour] || 'Morning' }
        }
        habitGroups[h.habit_name].days.push(h.day_of_week)
      }

      // Format each habit line
      const habitLines = Object.entries(habitGroups).map(([habitName, info]) => {
        const emoji = getHabitEmoji(habitName)
        const dayStr = info.days
          .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
          .map(d => DAY_NAMES[d])
          .join(', ')
        return `${emoji} ${habitName} \u2014 ${dayStr} \u00B7 ${info.time}`
      })

      const text4 =
        `Here's what you're starting with:\n\n` +
        habitLines.join('\n') +
        `\n\nHow confident are you in tackling these this week? Reply 1-5 (5 = very confident, 1 = not at all)`

      const result4 = await sendSMS({ to: profile.phone, body: text4 }, logOpts)
      if (!result4.success) {
        console.error('Failed to send welcome tour text 4:', result4.error)
      }

      // Create pending clarification for confidence reply (2 hour expiry)
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      await supabase.from('sms_pending_clarification').insert({
        user_id: userId,
        pending_type: 'confidence_check',
        context: { habit_count: Object.keys(habitGroups).length },
        expires_at: expiresAt,
      })
    }

    console.log(`Welcome tour SMS sent to user ${userId} (${name})`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    console.error('Error in send-welcome-tour-sms:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
