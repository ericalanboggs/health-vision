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
 * Generate synthesis message via OpenAI
 */
async function generateSynthesis(
  firstName: string,
  habitSummaries: { name: string; completed: number; scheduled: number }[],
  visionStatement: string | null,
  recentReflection: { went_well: string | null; friction: string | null } | null,
): Promise<string> {
  const totalCompleted = habitSummaries.reduce((sum, h) => sum + h.completed, 0)
  const totalScheduled = habitSummaries.reduce((sum, h) => sum + h.scheduled, 0)

  const fallback = `${firstName}, you showed up ${totalCompleted} time${totalCompleted !== 1 ? 's' : ''} this week out of ${totalScheduled} scheduled. Every one of those counted. See you next week.`

  if (!OPENAI_API_KEY) return fallback

  const habitLines = habitSummaries
    .map(h => `- ${h.name}: ${h.completed}/${h.scheduled} days`)
    .join('\n')

  const systemPrompt = `You are Summit, a warm health coach writing a brief Friday synthesis SMS. One message, plain text, under 300 characters.

RULES:
- Name what they did (e.g., "You showed up for meditation 4 out of 5 days")
- If something was hard, name it gently (no shame)
- Pull one thread toward their vision/goals
- Warm, not clinical. No streaks, no gamification, no emojis
- Do NOT say "great job" or "keep it up" - be specific
- Under 300 characters, plain text only
- Address them by first name`

  const userPrompt = `NAME: ${firstName}

THIS WEEK'S HABITS:
${habitLines}

VISION: ${visionStatement || 'Not set'}

RECENT REFLECTION:
${recentReflection ? `Went well: ${recentReflection.went_well || 'n/a'}\nHard: ${recentReflection.friction || 'n/a'}` : 'None'}

Write the synthesis SMS (under 300 chars):`

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
      .select('id, first_name, phone, sms_opt_in, timezone')
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

    console.log(`Eligible users with SMS: ${profiles.length}`)

    // Deduplication: check who already got a synthesis this week
    const { data: alreadySent } = await supabase
      .from('sms_messages')
      .select('user_id')
      .eq('sent_by_type', 'synthesis')
      .eq('direction', 'outbound')
      .gte('created_at', mondayTimestamp)
      .in('user_id', profiles.map((p: { id: string }) => p.id))

    const alreadySentIds = new Set((alreadySent || []).map((r: { user_id: string }) => r.user_id))
    const eligibleProfiles = profiles.filter((p: { id: string }) => !alreadySentIds.has(p.id))

    if (eligibleProfiles.length === 0) {
      console.log('All eligible users already received synthesis this week')
      return new Response(
        JSON.stringify({ message: 'All users already received synthesis', sent: 0, skipped: profiles.length }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Users to send synthesis: ${eligibleProfiles.length} (skipped ${alreadySentIds.size} already sent)`)

    // Batch-load vision data and reflections for all eligible users
    const eligibleIds = eligibleProfiles.map((p: { id: string }) => p.id)

    const [visionsResult, reflectionsResult, entriesResult, habitsResult] = await Promise.all([
      supabase
        .from('health_journeys')
        .select('user_id, form_data')
        .in('user_id', eligibleIds),
      supabase
        .from('weekly_reflections')
        .select('user_id, went_well, friction, created_at')
        .in('user_id', eligibleIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('habit_tracking_entries')
        .select('user_id, habit_name, entry_date, completed, metric_value')
        .in('user_id', eligibleIds)
        .gte('entry_date', mondayStr)
        .lte('entry_date', todayStr),
      supabase
        .from('weekly_habits')
        .select('user_id, habit_name, day_of_week')
        .in('user_id', eligibleIds),
    ])

    // Build lookup maps
    const visionMap = new Map<string, string | null>()
    for (const v of visionsResult.data || []) {
      visionMap.set(v.user_id, v.form_data?.visionStatement || null)
    }

    // Most recent reflection per user
    const reflectionMap = new Map<string, { went_well: string | null; friction: string | null }>()
    for (const r of reflectionsResult.data || []) {
      if (!reflectionMap.has(r.user_id)) {
        reflectionMap.set(r.user_id, { went_well: r.went_well, friction: r.friction })
      }
    }

    // Count tracking entries per user per habit this week
    const entryMap = new Map<string, Map<string, number>>()
    for (const e of entriesResult.data || []) {
      if (e.completed === false && e.metric_value === null) continue // skip explicit skip/incomplete
      if (!entryMap.has(e.user_id)) entryMap.set(e.user_id, new Map())
      const userEntries = entryMap.get(e.user_id)!
      userEntries.set(e.habit_name, (userEntries.get(e.habit_name) || 0) + 1)
    }

    // Count scheduled days per user per habit (Mon-Fri = days 1-5, but use all days Mon through today's day)
    const todayDow = new Date().getUTCDay() // 0=Sun
    const scheduledMap = new Map<string, Map<string, number>>()
    for (const h of habitsResult.data || []) {
      // Count only days from Monday (1) through today
      const dow = h.day_of_week
      // Monday=1, and we include days up to todayDow
      const isInRange = todayDow === 0
        ? dow >= 1 && dow <= 6 // Sunday: count whole Mon-Sat
        : dow >= 1 && dow <= todayDow // Otherwise Mon through today
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

      // Build habit summaries
      const userEntries = entryMap.get(userId) || new Map()
      const userScheduled = scheduledMap.get(userId) || new Map()

      // Combine all habits the user had entries or schedules for
      const allHabits = new Set([...userEntries.keys(), ...userScheduled.keys()])
      const habitSummaries = [...allHabits].map(name => ({
        name,
        completed: userEntries.get(name) || 0,
        scheduled: userScheduled.get(name) || userEntries.get(name) || 0,
      }))

      if (habitSummaries.length === 0) {
        console.log(`User ${userId}: no habit data to synthesize`)
        continue
      }

      const visionStatement = visionMap.get(userId) || null
      const reflection = reflectionMap.get(userId) || null

      const synthesisMessage = await generateSynthesis(firstName, habitSummaries, visionStatement, reflection)

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
