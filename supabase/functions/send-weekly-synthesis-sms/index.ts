import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

/**
 * Get Monday of the current week (in UTC) as YYYY-MM-DD
 */
function getMondayOfWeek(): string {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day // if Sunday, go back 6 days; otherwise go back to Monday
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  return monday.toISOString().split('T')[0]
}

/**
 * Pick one habit to highlight: prefer the newest (first week being tracked), fall back to most consistent.
 */
function pickHighlightHabit(
  habitSummaries: { name: string; completed: number; scheduled: number; isNew: boolean }[],
): { name: string; isNew: boolean } {
  // Prefer a new habit they completed at least once
  const newHabits = habitSummaries.filter(h => h.isNew && h.completed > 0)
  if (newHabits.length > 0) {
    return { name: newHabits[0].name, isNew: true }
  }

  // Fall back to most consistent (highest completion rate, at least 1 completed)
  const completed = habitSummaries.filter(h => h.completed > 0)
  if (completed.length === 0 && habitSummaries.length > 0) {
    return { name: habitSummaries[0].name, isNew: false }
  }
  completed.sort((a, b) => (b.completed / b.scheduled) - (a.completed / a.scheduled))
  return { name: completed[0].name, isNew: false }
}

/**
 * Generate synthesis message via OpenAI
 */
async function generateSynthesis(
  firstName: string,
  highlightHabit: { name: string; isNew: boolean },
  visionStatement: string | null,
): Promise<string> {
  const fallback = `${firstName}, you kept showing up for ${highlightHabit.name} this week. That matters.`

  if (!OPENAI_API_KEY) return fallback

  const systemPrompt = `You are Summit, a friend and health coach texting someone on Friday. One SMS, plain text, under 250 characters.

VOICE:
- Talk like a real person. Short sentences. A little texture.
- You can celebrate — "way to go", "that's real", "hell of a week" — but earn it. Be specific to the habit.
- You can encourage them to keep going and wish them a good weekend.
- Exactly one exclamation mark allowed. No more.
- NEVER sound like a greeting card. No "wonderful step", "continued progress", "proud of you", "journey", or "aligning with your vision."
- If a vision statement is provided, you can nod to where they're headed — in your own words, not theirs verbatim.

RULES:
- Name the ONE habit provided
- If it's a new habit, note they just started it
- No numbers, counts, streaks, or fractions
- No emojis
- 1-3 sentences max. Land it and stop.
- Address them by first name`

  const userPrompt = `NAME: ${firstName}
HABIT TO HIGHLIGHT: ${highlightHabit.name}${highlightHabit.isNew ? ' (just started this week)' : ''}
VISION: ${visionStatement || 'Not set'}

Write the Friday SMS (under 300 chars):`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!response.ok) {
      console.error('OpenAI synthesis error:', response.status)
      return fallback
    }

    const data = await response.json()
    let message = data.choices?.[0]?.message?.content?.trim() || ''

    // Strip quotes
    message = message.replace(/^["']|["']$/g, '')

    if (!message || message.length > 300) {
      console.log('Synthesis message empty or too long, using fallback')
      return fallback
    }

    return message
  } catch (error) {
    console.error('Error generating synthesis:', error)
    return fallback
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

    const mondayStr = getMondayOfWeek()
    const todayStr = new Date().toISOString().split('T')[0]
    const mondayTimestamp = `${mondayStr}T00:00:00Z`

    console.log(`=== Weekly Synthesis SMS ===`)
    console.log(`Week starting: ${mondayStr}, Today: ${todayStr}`)

    // Find eligible users: sms_opt_in, has phone, not deleted, has at least 1 entry this week
    const { data: usersWithEntries, error: entriesError } = await supabase
      .from('habit_tracking_entries')
      .select('user_id')
      .gte('entry_date', mondayStr)
      .lte('entry_date', todayStr)

    if (entriesError) {
      console.error('Error fetching entries:', entriesError)
      throw entriesError
    }

    const uniqueUserIds = [...new Set((usersWithEntries || []).map((e: { user_id: string }) => e.user_id))]

    if (uniqueUserIds.length === 0) {
      console.log('No users with entries this week')
      return new Response(
        JSON.stringify({ message: 'No eligible users', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Users with entries this week: ${uniqueUserIds.length}`)

    // Get profiles for eligible users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, phone, sms_opt_in, timezone, subscription_status, trial_ends_at')
      .in('id', uniqueUserIds)
      .eq('sms_opt_in', true)
      .is('deleted_at', null)
      .not('phone', 'is', null)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      console.log('No eligible profiles with SMS opt-in')
      return new Response(
        JSON.stringify({ message: 'No eligible users with SMS', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Filter to users with active subscription or active trial
    const activeSubscriptionProfiles = profiles.filter((p: { subscription_status: string; trial_ends_at: string | null }) => {
      if (p.subscription_status === 'active') return true
      if (p.trial_ends_at && new Date(p.trial_ends_at) > new Date()) return true
      return false
    })

    console.log(`Active subscription/trial users: ${activeSubscriptionProfiles.length} (filtered from ${profiles.length})`)

    if (activeSubscriptionProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with active subscription/trial', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Deduplication: check who already got a synthesis this week
    const { data: alreadySent } = await supabase
      .from('sms_messages')
      .select('user_id')
      .eq('sent_by_type', 'synthesis')
      .eq('direction', 'outbound')
      .gte('created_at', mondayTimestamp)
      .in('user_id', activeSubscriptionProfiles.map((p: { id: string }) => p.id))

    const alreadySentIds = new Set((alreadySent || []).map((r: { user_id: string }) => r.user_id))
    const eligibleProfiles = activeSubscriptionProfiles.filter((p: { id: string }) => !alreadySentIds.has(p.id))

    if (eligibleProfiles.length === 0) {
      console.log('All eligible users already received synthesis this week')
      return new Response(
        JSON.stringify({ message: 'All users already received synthesis', sent: 0, skipped: activeSubscriptionProfiles.length }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Users to send synthesis: ${eligibleProfiles.length} (skipped ${alreadySentIds.size} already sent)`)

    // Batch-load vision data and entries for all eligible users
    const eligibleIds = eligibleProfiles.map((p: { id: string }) => p.id)

    const [visionsResult, entriesResult, priorEntriesResult, habitsResult] = await Promise.all([
      supabase
        .from('health_journeys')
        .select('user_id, form_data')
        .in('user_id', eligibleIds),
      supabase
        .from('habit_tracking_entries')
        .select('user_id, habit_name, entry_date, completed, metric_value')
        .in('user_id', eligibleIds)
        .gte('entry_date', mondayStr)
        .lte('entry_date', todayStr),
      // Prior entries: any entries before this week, to detect new habits
      supabase
        .from('habit_tracking_entries')
        .select('user_id, habit_name')
        .in('user_id', eligibleIds)
        .lt('entry_date', mondayStr),
      supabase
        .from('weekly_habits')
        .select('user_id, habit_name, day_of_week')
        .in('user_id', eligibleIds)
        .is('archived_at', null),
    ])

    // Build lookup maps
    const visionMap = new Map<string, string | null>()
    for (const v of visionsResult.data || []) {
      visionMap.set(v.user_id, v.form_data?.visionStatement || null)
    }

    // Build set of habits each user had before this week
    const priorHabitMap = new Map<string, Set<string>>()
    for (const e of priorEntriesResult.data || []) {
      if (!priorHabitMap.has(e.user_id)) priorHabitMap.set(e.user_id, new Set())
      priorHabitMap.get(e.user_id)!.add(e.habit_name)
    }

    // Count tracking entries per user per habit this week
    const entryMap = new Map<string, Map<string, number>>()
    for (const e of entriesResult.data || []) {
      if (e.completed === false && e.metric_value === null) continue // skip explicit skip/incomplete
      if (!entryMap.has(e.user_id)) entryMap.set(e.user_id, new Map())
      const userEntries = entryMap.get(e.user_id)!
      userEntries.set(e.habit_name, (userEntries.get(e.habit_name) || 0) + 1)
    }

    // Count scheduled days per user per habit (Mon through today)
    const todayDow = new Date().getUTCDay() // 0=Sun
    const scheduledMap = new Map<string, Map<string, number>>()
    for (const h of habitsResult.data || []) {
      const dow = h.day_of_week
      const isInRange = todayDow === 0
        ? dow >= 1 && dow <= 6
        : dow >= 1 && dow <= todayDow
      if (!isInRange) continue

      if (!scheduledMap.has(h.user_id)) scheduledMap.set(h.user_id, new Map())
      const userScheduled = scheduledMap.get(h.user_id)!
      userScheduled.set(h.habit_name, (userScheduled.get(h.habit_name) || 0) + 1)
    }

    // Process each user
    const results: { userId: string; status: string; error?: string }[] = []

    for (const profile of eligibleProfiles) {
      const firstName = profile.first_name || 'there'
      const userId = profile.id

      // Build habit summaries with isNew flag
      const userEntries = entryMap.get(userId) || new Map()
      const userScheduled = scheduledMap.get(userId) || new Map()
      const userPriorHabits = priorHabitMap.get(userId) || new Set()

      const allHabits = new Set([...userEntries.keys(), ...userScheduled.keys()])
      const habitSummaries = [...allHabits].map(name => ({
        name,
        completed: userEntries.get(name) || 0,
        scheduled: userScheduled.get(name) || userEntries.get(name) || 0,
        isNew: !userPriorHabits.has(name),
      }))

      if (habitSummaries.length === 0) {
        console.log(`User ${userId}: no habit data to synthesize`)
        continue
      }

      const highlightHabit = pickHighlightHabit(habitSummaries)
      const visionStatement = visionMap.get(userId) || null

      const synthesisMessage = await generateSynthesis(firstName, highlightHabit, visionStatement)

      console.log(`User ${firstName} (${userId}): "${synthesisMessage}" (${synthesisMessage.length} chars)`)

      const smsResult = await sendSMS(
        { to: profile.phone, body: synthesisMessage },
        {
          supabase,
          logTable: 'sms_messages',
          extra: {
            user_id: userId,
            user_name: firstName,
            sent_by_type: 'synthesis',
          },
        }
      )

      if (smsResult.success) {
        results.push({ userId, status: 'sent' })
        console.log(`Sent synthesis to ${profile.phone}`)
      } else {
        results.push({ userId, status: 'failed', error: smsResult.error })
        console.error(`Failed synthesis for ${userId}: ${smsResult.error}`)
      }
    }

    const sent = results.filter(r => r.status === 'sent').length
    const failed = results.filter(r => r.status === 'failed').length

    console.log(`=== Synthesis complete: ${sent} sent, ${failed} failed, ${alreadySentIds.size} skipped ===`)

    return new Response(
      JSON.stringify({
        message: 'Weekly synthesis complete',
        sent,
        failed,
        skipped: alreadySentIds.size,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-weekly-synthesis-sms:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
