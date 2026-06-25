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

/**
 * Get the Monday of the current week as YYYY-MM-DD (UTC)
 */
function getMondayOfWeek(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  return monday.toISOString().split('T')[0]
}

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const mondayStr = getMondayOfWeek()

    console.log(`Running Monday confidence check for week of ${mondayStr}`)

    // Get all active users with SMS opt-in, phone, not deleted.
    // Exclude Motivation Mode users — they're pre-action-stage and get the
    // weekly readiness ruler from send-daily-motivation instead, not the
    // habit-summary confidence check.
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, phone, sms_opt_in, created_at, subscription_status, trial_ends_at, deleted_at')
      .eq('sms_opt_in', true)
      .eq('motivation_mode', false)
      .not('phone', 'is', null)
      .is('deleted_at', null)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      console.log('No eligible profiles found')
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Filter to active subscription or active trial
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const eligible = profiles.filter(p => {
      // Must have active subscription or trial
      if (p.subscription_status !== 'active' && p.subscription_status !== 'trialing') {
        if (!p.trial_ends_at || new Date(p.trial_ends_at) <= now) return false
      }
      // Skip users who signed up in the last 7 days (they just got the welcome tour confidence check)
      if (new Date(p.created_at) > sevenDaysAgo) return false
      return true
    })

    console.log(`${eligible.length} eligible users (${profiles.length} total, filtered by subscription + 7-day skip)`)

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Biweekly cadence: skip anyone who got a confidence check in the last 13 days.
    // The cron runs every Monday, but this gates each user to once every ~2 weeks.
    // It's per-user off actual send history (not a global week-parity flag), so it
    // stays correct even if a weekly run is missed. 13 (not 14) days leaves a buffer
    // so the exactly-two-weeks-later run still fires.
    const userIds = eligible.map(p => p.id)
    const biweeklyCutoff = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString()
    const { data: alreadySent } = await supabase
      .from('sms_messages')
      .select('user_id')
      .in('user_id', userIds)
      .eq('sent_by_type', 'confidence_check')
      .eq('direction', 'outbound')
      .gte('created_at', biweeklyCutoff)

    const sentSet = new Set((alreadySent || []).map(s => s.user_id))

    let sentCount = 0

    for (const profile of eligible) {
      if (sentSet.has(profile.id)) {
        console.log(`Skipping ${profile.id}: confidence check sent within the last 2 weeks`)
        continue
      }

      // Load user's active habits
      const { data: habits } = await supabase
        .from('weekly_habits')
        .select('habit_name, day_of_week, reminder_time')
        .eq('user_id', profile.id)
        .is('archived_at', null)
        .order('created_at', { ascending: true })

      if (!habits || habits.length === 0) {
        console.log(`Skipping ${profile.id}: no active habits`)
        continue
      }

      // Group by habit name
      const habitGroups: Record<string, { days: number[]; time: string }> = {}
      for (const h of habits) {
        if (!habitGroups[h.habit_name]) {
          const hour = h.reminder_time ? parseInt(h.reminder_time.split(':')[0]) : 8
          habitGroups[h.habit_name] = { days: [], time: TIME_LABELS[hour] || 'Morning' }
        }
        habitGroups[h.habit_name].days.push(h.day_of_week)
      }

      // Format habit lines
      const habitLines = Object.entries(habitGroups).map(([habitName, info]) => {
        const emoji = getHabitEmoji(habitName)
        const dayStr = info.days
          .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
          .map(d => DAY_NAMES[d])
          .join(', ')
        return `${emoji} ${habitName} \u2014 ${dayStr} \u00B7 ${info.time}`
      })

      const firstName = profile.first_name || 'there'
      const message =
        `Happy Monday, ${firstName}! \u26f0\ufe0f Here's your week:\n\n` +
        habitLines.join('\n') +
        `\n\nHow confident are you feeling about this week? Reply 1-5 (5 = very confident, 1 = not at all)`

      const logOpts = {
        supabase,
        logTable: 'sms_messages' as const,
        extra: { user_id: profile.id, sent_by_type: 'confidence_check' },
      }

      const result = await sendSMS({ to: profile.phone, body: message }, logOpts)

      if (result.success) {
        console.log(`\u2713 Confidence check sent to ${profile.id} (${firstName})`)
        sentCount++

        // Create pending clarification for reply (2 hour window)
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        await supabase.from('sms_pending_clarification').insert({
          user_id: profile.id,
          pending_type: 'confidence_check',
          context: { habit_count: Object.keys(habitGroups).length },
          expires_at: expiresAt,
        })
      } else {
        console.error(`\u2717 Failed confidence check for ${profile.id}:`, result.error)
      }

      // Small delay between sends
      if (sentCount < eligible.length) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    console.log(`Confidence check: sent to ${sentCount} users`)

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in send-confidence-check:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
