import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS as _sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const PROGRAM_START_DATE = Deno.env.get('PROGRAM_START_DATE') || '2026-01-12'

/** Convenience wrapper */
async function sendSMS(
  to: string,
  message: string,
  supabase: ReturnType<typeof createClient>,
  userId?: string,
  userName?: string
) {
  return _sendSMS(
    { to, body: message },
    {
      supabase,
      logTable: 'sms_messages',
      extra: { user_id: userId || null, user_name: userName || null, sent_by_type: 'system' },
    }
  )
}

function getCurrentWeekNumber(): number {
  const [year, month, day] = PROGRAM_START_DATE.split('-').map(Number)
  const programStartDate = new Date(year, month - 1, day)
  const now = new Date()
  programStartDate.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  const diffTime = now.getTime() - programStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.floor(diffDays / 7) + 1)
}

/**
 * Get the Monday-Sunday date range for the current week in user's timezone
 */
function getWeekDateRange(timezone: string): { monday: string; sunday: string } {
  const now = new Date()
  const localStr = now.toLocaleDateString('en-CA', { timeZone: timezone }) // YYYY-MM-DD
  const localDate = new Date(localStr + 'T12:00:00')
  const dayOfWeek = localDate.getDay() // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(localDate)
  monday.setDate(localDate.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    monday: monday.toISOString().split('T')[0],
    sunday: sunday.toISOString().split('T')[0],
  }
}

interface HabitSummary {
  habit_name: string
  scheduled_count: number
  completed_count: number
  target: number | null
  unit: string | null
  metric_avg: number | null
}

/**
 * Load habit tracking data for a user's week
 */
async function loadWeekData(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  timezone: string
): Promise<{
  habits: HabitSummary[]
  hasTracking: boolean
  challengeContext: { slug: string; week: number } | null
  habitNames: string[]
}> {
  const { monday, sunday } = getWeekDateRange(timezone)

  // Parallel queries
  const [habitsRes, configsRes, entriesRes, challengeRes] = await Promise.all([
    supabase
      .from('weekly_habits')
      .select('habit_name, day_of_week')
      .eq('user_id', userId),
    supabase
      .from('habit_tracking_config')
      .select('habit_name, tracking_type, metric_unit, metric_target, tracking_enabled')
      .eq('user_id', userId),
    supabase
      .from('habit_tracking_entries')
      .select('habit_name, entry_date, completed, metric_value')
      .eq('user_id', userId)
      .gte('entry_date', monday)
      .lte('entry_date', sunday),
    supabase
      .from('challenge_enrollments')
      .select('challenge_slug, current_week')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ])

  const weeklyHabits = habitsRes.data || []
  const configs = configsRes.data || []
  const entries = entriesRes.data || []

  // Build unique habit names with scheduled day counts (full week — this runs on Sunday)
  const habitMap = new Map<string, { scheduledDays: Set<number>; config: any }>()
  for (const h of weeklyHabits) {
    if (!habitMap.has(h.habit_name)) {
      const config = configs.find(c => c.habit_name === h.habit_name)
      habitMap.set(h.habit_name, { scheduledDays: new Set(), config })
    }
    habitMap.get(h.habit_name)!.scheduledDays.add(h.day_of_week)
  }

  const habitNames = Array.from(habitMap.keys())
  const hasTracking = configs.some(c => c.tracking_enabled)

  // Build summaries
  const habits: HabitSummary[] = []
  for (const [name, info] of habitMap) {
    const habitEntries = entries.filter(e => e.habit_name === name)
    const completedCount = habitEntries.filter(e => e.completed).length
    const metricValues = habitEntries
      .filter(e => e.metric_value !== null)
      .map(e => e.metric_value)
    const metricAvg = metricValues.length > 0
      ? metricValues.reduce((a, b) => a + b, 0) / metricValues.length
      : null

    habits.push({
      habit_name: name,
      scheduled_count: info.scheduledDays.size,
      completed_count: completedCount,
      target: info.config?.metric_target ?? null,
      unit: info.config?.metric_unit ?? null,
      metric_avg: metricAvg,
    })
  }

  const challengeContext = challengeRes.data
    ? { slug: challengeRes.data.challenge_slug, week: challengeRes.data.current_week }
    : null

  return { habits, hasTracking, challengeContext, habitNames }
}

/**
 * Generate AI opener — personalized week synopsis
 */
async function generateOpener(
  firstName: string,
  habits: HabitSummary[],
  hasTracking: boolean,
  challengeContext: { slug: string; week: number } | null
): Promise<string> {
  if (!OPENAI_API_KEY) {
    // Fallback without AI
    if (hasTracking && habits.length > 0) {
      const topHabit = habits.reduce((a, b) =>
        (b.completed_count / Math.max(b.scheduled_count, 1)) > (a.completed_count / Math.max(a.scheduled_count, 1)) ? b : a
      )
      return `Hi ${firstName}! Looks like you had a solid week with ${topHabit.habit_name} (${topHabit.completed_count}/${topHabit.scheduled_count} days). How do you feel the week went?`
    }
    const habitList = habits.map(h => h.habit_name).join(', ')
    return `Hi ${firstName}! Nice job staying committed to ${habitList || 'your habits'} this week. How did it go?`
  }

  let dataContext: string
  if (hasTracking && habits.some(h => h.completed_count > 0 || h.scheduled_count > 0)) {
    const summaryLines = habits.map(h => {
      const rate = h.scheduled_count > 0
        ? `${h.completed_count}/${h.scheduled_count} days`
        : 'not scheduled this week'
      const metricStr = h.metric_avg !== null && h.unit
        ? ` (avg ${Math.round(h.metric_avg)} ${h.unit})`
        : ''
      return `- ${h.habit_name}: ${rate}${metricStr}`
    })
    dataContext = `TRACKING DATA (real completion numbers):\n${summaryLines.join('\n')}`
  } else {
    const habitList = habits.map(h => h.habit_name).join(', ')
    dataContext = `NO TRACKING DATA available. User has these habits scheduled: ${habitList || 'none'}`
  }

  const challengeNote = challengeContext
    ? `User is in week ${challengeContext.week} of the "${challengeContext.slug}" challenge.`
    : ''

  const systemPrompt = `You are Summit, a warm health habit coach sending a Sunday evening reflection SMS. Write a personalized week synopsis that:

1. Greets the user by name
2. ${hasTracking ? 'Highlights what they did well (specific habits + numbers) and gently notes where they fell short' : 'Acknowledges the habits they committed to this week (by name)'}
3. ${challengeContext ? 'Mentions their challenge progress' : ''}
4. Ends with an open question like "How do you feel the week went?" or "How did it go?"

Keep it under 320 characters (SMS). Conversational and warm, not clinical. One emoji max if natural. Do NOT make up data — only reference the numbers provided.

Respond with ONLY the SMS message text.`

  const userPrompt = `User: ${firstName}\n${dataContext}\n${challengeNote}`

  try {
    const content = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    })

    if (!content.ok) {
      throw new Error(`OpenAI API error: ${content.status}`)
    }

    const data = await content.json()
    const reply = data.choices?.[0]?.message?.content || ''
    return reply.trim()
  } catch (error) {
    console.error('Error generating opener:', error)
    // Fallback
    if (hasTracking && habits.length > 0) {
      return `Hi ${firstName}! Time for your weekly reflection. How do you feel the week went?`
    }
    return `Hi ${firstName}! Nice job staying committed to your habits this week. How did it go?`
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

    // Get all users with SMS consent + active subscription
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, sms_opt_in, subscription_status, trial_ends_at, timezone, challenge_type, created_at')
      .eq('sms_opt_in', true)
      .is('deleted_at', null)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with SMS consent', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Filter to active subscription/trial, non-lite, signed up before Friday
    const fridayCutoff = new Date(now)
    fridayCutoff.setDate(fridayCutoff.getDate() - 2) // Sunday minus 2 = Friday
    fridayCutoff.setHours(0, 0, 0, 0)

    const activeProfiles = profiles.filter(p => {
      if (p.challenge_type === 'lite') return false
      if (!(p.subscription_status === 'active' ||
        (p.trial_ends_at && new Date(p.trial_ends_at) > new Date()))) return false
      // Skip users who signed up Fri/Sat/Sun — they haven't had a full week yet
      if (p.created_at && new Date(p.created_at) >= fridayCutoff) {
        console.log(`Skipping user ${p.id} — signed up ${p.created_at}, too new for reflection`)
        return false
      }
      return true
    })

    console.log(`Found ${activeProfiles.length} active users (filtered from ${profiles.length})`)

    if (activeProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active users', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get existing reflections for this week
    const userIds = activeProfiles.map(p => p.id)
    const { data: reflections } = await supabase
      .from('weekly_reflections')
      .select('user_id')
      .in('user_id', userIds)
      .eq('week_number', currentWeekNumber)

    const completedUserIds = new Set(reflections?.map(r => r.user_id) || [])

    // Get existing active reflection sessions (avoid duplicates)
    const { data: existingSessions } = await supabase
      .from('sms_reflection_sessions')
      .select('user_id')
      .in('user_id', userIds)
      .gt('expires_at', new Date().toISOString())

    const activeSessionUserIds = new Set(existingSessions?.map(s => s.user_id) || [])

    const results = []

    for (const profile of activeProfiles) {
      if (!profile.phone) {
        console.log(`Skipping user ${profile.id} — no phone`)
        continue
      }

      // Skip if already has an active reflection session
      if (activeSessionUserIds.has(profile.id)) {
        console.log(`Skipping user ${profile.id} — active reflection session exists`)
        continue
      }

      const firstName = profile.first_name || 'there'
      const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null
      const timezone = profile.timezone || 'America/Chicago'

      // Handle already-reflected users — send acknowledgment, no session
      if (completedUserIds.has(profile.id)) {
        console.log(`User ${profile.id} already reflected this week — sending acknowledgment`)
        await sendSMS(
          profile.phone,
          `Hey ${firstName}, saw your reflection for this week — nice work taking time to look back. Have a great week ahead!`,
          supabase, profile.id, userName
        )
        results.push({ userId: profile.id, status: 'already_reflected' })
        continue
      }

      // Load habit data for personalized opener
      const weekData = await loadWeekData(supabase, profile.id, timezone)

      // Generate AI opener
      const openerMessage = await generateOpener(
        firstName,
        weekData.habits,
        weekData.hasTracking,
        weekData.challengeContext
      )

      // Send the opener SMS
      const smsResult = await sendSMS(
        profile.phone,
        openerMessage,
        supabase, profile.id, userName
      )

      if (!smsResult.success) {
        console.error(`Failed to send reflection opener to user ${profile.id}:`, smsResult.error)
        results.push({ userId: profile.id, status: 'failed', error: smsResult.error })
        continue
      }

      // Create reflection session
      const sessionContext = {
        opener_message: openerMessage,
        messages: [{ role: 'assistant', content: openerMessage }],
        exchange_count: 0,
        tracking_data: weekData.hasTracking ? weekData.habits : null,
        challenge_context: weekData.challengeContext,
        habit_names: weekData.habitNames,
      }

      const { error: sessionError } = await supabase
        .from('sms_reflection_sessions')
        .insert({
          user_id: profile.id,
          week_number: currentWeekNumber,
          step: 'awaiting_reply',
          context: sessionContext,
        })

      if (sessionError) {
        console.error(`Error creating reflection session for user ${profile.id}:`, sessionError)
      }

      results.push({ userId: profile.id, status: 'sent' })
      console.log(`Sent reflection opener to ${profile.phone}`)
    }

    return new Response(
      JSON.stringify({
        message: 'Reflection reminders complete',
        weekNumber: currentWeekNumber,
        totalUsers: activeProfiles.length,
        sent: results.filter(r => r.status === 'sent').length,
        alreadyReflected: results.filter(r => r.status === 'already_reflected').length,
        failed: results.filter(r => r.status === 'failed').length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-reflection-reminders:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
