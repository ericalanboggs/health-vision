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
  /**
   * True if the habit has real completion data this week — both
   * tracking_enabled AND at least one tracking entry logged.
   * False = scheduled but we have no engagement data (either tracking
   * is off, or it's on but the user didn't log anything this week).
   * The opener must NOT assume untracked habits failed.
   */
  tracked: boolean
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
      .eq('user_id', userId)
      .is('archived_at', null),
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

    // A habit is "tracked" for opener purposes only if the user actually
    // engaged with tracking this week. tracking_enabled alone isn't enough —
    // a habit with the toggle on but zero entries is functionally untracked,
    // and treating completed_count=0 as a real "0/7 failure" shames users
    // for not logging when they may have done the habit just fine.
    habits.push({
      habit_name: name,
      scheduled_count: info.scheduledDays.size,
      completed_count: completedCount,
      target: info.config?.metric_target ?? null,
      unit: info.config?.metric_unit ?? null,
      metric_avg: metricAvg,
      tracked: info.config?.tracking_enabled === true && habitEntries.length > 0,
    })
  }

  const challengeContext = challengeRes.data
    ? { slug: challengeRes.data.challenge_slug, week: challengeRes.data.current_week }
    : null

  return { habits, hasTracking, challengeContext, habitNames }
}

/**
 * Generate AI opener — personalized week synopsis.
 *
 * Splits habits into TRACKED (have real completion data) and UNTRACKED
 * (scheduled but user opted out of tracking — we have no completion data
 * and must NOT assume they failed). The model is told this explicitly.
 */
async function generateOpener(
  firstName: string,
  habits: HabitSummary[],
  _hasTracking: boolean,
  challengeContext: { slug: string; week: number } | null
): Promise<string> {
  const tracked = habits.filter(h => h.tracked)
  const untracked = habits.filter(h => !h.tracked)

  // ── Fallback (no API key) ────────────────────────────────────
  if (!OPENAI_API_KEY) {
    if (tracked.length > 0) {
      const top = tracked.reduce((a, b) =>
        (b.completed_count / Math.max(b.scheduled_count, 1)) >
        (a.completed_count / Math.max(a.scheduled_count, 1)) ? b : a
      )
      const untrackedNote = untracked.length > 0
        ? ` ${untracked.map(h => h.habit_name).join(', ')} were on your plate too.`
        : ''
      return `Hey ${firstName}! Solid week — ${top.completed_count}/${top.scheduled_count} on ${top.habit_name}.${untrackedNote} How'd the week feel?`
    }
    const habitList = habits.map(h => h.habit_name).join(', ')
    return `Hey ${firstName}! Nice job staying with ${habitList || 'your habits'} this week. How did it go?`
  }

  // ── Build the data context ───────────────────────────────────
  let dataContext = ''
  if (tracked.length > 0) {
    const lines = tracked.map(h => {
      const rate = h.scheduled_count > 0
        ? `${h.completed_count}/${h.scheduled_count} days`
        : `${h.completed_count} days`
      const metricStr = h.metric_avg !== null && h.unit
        ? ` (avg ${Math.round(h.metric_avg)} ${h.unit})`
        : ''
      return `- ${h.habit_name}: ${rate}${metricStr}`
    })
    dataContext += `TRACKED HABITS (real completion data — celebrate specifically):\n${lines.join('\n')}\n\n`
  }
  if (untracked.length > 0) {
    const names = untracked.map(h => h.habit_name).join(', ')
    dataContext += `UNTRACKED HABITS (scheduled but the user is NOT actively tracking — you have NO completion data for these. Acknowledge by name only, neutrally. Do NOT assume they did or didn't happen):\n${names}\n\n`
  }
  if (!dataContext) {
    dataContext = `User had no habits scheduled this week.\n\n`
  }

  const challengeNote = challengeContext
    ? `CHALLENGE: week ${challengeContext.week} of the "${challengeContext.slug}" challenge.`
    : ''

  // ── System prompt ────────────────────────────────────────────
  const systemPrompt = `You are Summit, a warm, energetic health coach sending a Sunday evening reflection SMS to kick off a multi-turn conversation.

DATA YOU GET:
- TRACKED habits: real completion numbers (X/Y days). Reference these specifically.
- UNTRACKED habits: names only. The user has these scheduled but is not actively tracking them. You DO NOT KNOW whether they happened. Acknowledge by name only, neutrally. Do NOT assume they didn't happen, and do NOT use phrases like "haven't started yet" or "room to grow".
- Challenge context (optional).

VOICE:
- Warm, energetic, sincerely encouraging — a friend / coach who's pumped about your win.
- Celebrate specifically — earn it with the data. "Rocked", "crushed", "nailed" are fine when tied to a real habit + number.
- Up to THREE exclamation marks total. Don't fake the energy — no exclamations on neutral statements.
- 1–2 emojis OK if they fit. Don't stack them. Don't lead the message with one.

ENCOURAGED:
- "rocked", "nailed", "crushed", "way to show up"
- "love seeing that", "huge", "real win", "solid"
- "stuck with it", "that counts", "showing up"
- Specific celebrations tied to the data

BANNED:
- "room to grow", "haven't started yet"
- "Remember, it's all about progress!"
- "journey", "your path forward", "you got this"
- Made-up numbers, fake streaks, generic praise without data
- Assumptions about untracked habits

STRUCTURE:
1. Greet by first name.
2. If TRACKED data exists in the prompt: celebrate specifically (habit + numbers, exact habit names from the data).
3. ONLY IF an "UNTRACKED HABITS" section appears in the prompt data: name those habits in a single neutral phrase using "plus" or "also". Use the exact habit names verbatim from the prompt. If no UNTRACKED HABITS section is in the prompt, DO NOT mention untracked habits at all — do not invent any, do not echo any names that aren't in the prompt data.
4. Open question — "How did the week feel?" / "What stood out?" / "How'd it go?"

LENGTH: Under 320 characters. 2-3 sentences. Land it and stop.

CRITICAL: Never write a habit name that doesn't appear in the prompt data. If you can't find a habit in the data, leave it out — do not fabricate, paraphrase, or use placeholder examples.

Respond with ONLY the SMS message text — no quotes, no preamble.`

  const userPrompt = `User: ${firstName}\n\n${dataContext}${challengeNote}`

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
    const reply = (data.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '')
    return reply
  } catch (error) {
    console.error('Error generating opener:', error)
    if (tracked.length > 0) {
      return `Hey ${firstName}! Time for your weekly reflection — how did it go?`
    }
    return `Hey ${firstName}! Nice job staying with your habits this week. How did it go?`
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
      .eq('motivation_mode', false) // Motivation Mode users are off the action-stage track
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
