/**
 * Shared user context loader for AI calls
 * Loads full user background in parallel and formats as a prompt-ready string.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

export interface UserContext {
  firstName: string
  visionStatement: string | null
  whyMatters: string | null
  habits: Array<{
    habit_name: string
    tracking_type: string | null
    metric_unit: string | null
    metric_target: number | null
    scheduled_days: number
    recent_completion_rate: string
    challenge_slug: string | null
    current_streak: number
    best_streak: number
    last_4_weeks_rate: string | null
    metric_average: number | null
  }>
  challengeContext: { slug: string; week: number } | null
  recentReflections: Array<{
    week_number: number
    went_well: string | null
    friction: string | null
    adjustment: string | null
  }>
  recentConversation: string[]
  guides: Array<{ title: string; url: string; topic: string | null }>
  memberSince: string | null
  subscriptionTier: string | null
  coachingSessionsRemaining: number
}

/**
 * Load full user context from the database
 */
export async function loadUserContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  timezone?: string
): Promise<UserContext> {
  const tz = timezone || 'America/Chicago'
  const now = new Date()

  // Compute this week's date range for completion rates
  const localStr = now.toLocaleDateString('en-CA', { timeZone: tz })
  const localDate = new Date(localStr + 'T12:00:00')
  const dayOfWeek = localDate.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(localDate)
  monday.setDate(localDate.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const mondayStr = monday.toISOString().split('T')[0]
  const sundayStr = sunday.toISOString().split('T')[0]

  // 4 weeks ago for historical stats
  const fourWeeksAgo = new Date(localDate)
  fourWeeksAgo.setDate(localDate.getDate() - 28)
  const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0]

  const [
    profileRes,
    visionRes,
    habitsRes,
    configsRes,
    entriesRes,
    historicalEntriesRes,
    challengeRes,
    reflectionsRes,
    smsRes,
    resourcesRes,
    coachingRes,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, created_at, subscription_tier, subscription_current_period_end')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('health_journeys')
      .select('form_data')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('weekly_habits')
      .select('habit_name, day_of_week, challenge_slug')
      .eq('user_id', userId)
      .is('archived_at', null),
    supabase
      .from('habit_tracking_config')
      .select('habit_name, tracking_type, metric_unit, metric_target, tracking_enabled, challenge_slug')
      .eq('user_id', userId),
    supabase
      .from('habit_tracking_entries')
      .select('habit_name, entry_date, completed, metric_value')
      .eq('user_id', userId)
      .gte('entry_date', mondayStr)
      .lte('entry_date', sundayStr),
    supabase
      .from('habit_tracking_entries')
      .select('habit_name, entry_date, completed, metric_value')
      .eq('user_id', userId)
      .gte('entry_date', fourWeeksAgoStr)
      .lt('entry_date', mondayStr)
      .order('entry_date', { ascending: true }),
    supabase
      .from('challenge_enrollments')
      .select('challenge_slug, current_week')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('weekly_reflections')
      .select('week_number, went_well, friction, adjustment')
      .eq('user_id', userId)
      .order('week_number', { ascending: false })
      .limit(3),
    supabase
      .from('sms_messages')
      .select('direction, body')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('user_resources')
      .select('title, url, topic, description')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('coaching_sessions')
      .select('id, billing_period_start, billing_period_end')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(10),
  ])

  const profile = profileRes.data
  const vision = visionRes.data?.form_data || {}
  const weeklyHabits = habitsRes.data || []
  const configs = configsRes.data || []
  const entries = entriesRes.data || []
  const historicalEntries = historicalEntriesRes.data || []
  const allEntries = [...historicalEntries, ...entries]
  const recentSms = (smsRes.data || []).reverse()
  const resources = resourcesRes.data || []
  const coachingSessions = coachingRes.data || []

  // Compute coaching sessions remaining
  const SESSIONS_PER_TIER: Record<string, number> = { core: 0, plus: 1, premium: 2 }
  const tier = profile?.subscription_tier || null
  const sessionsAllowed = tier ? (SESSIONS_PER_TIER[tier] ?? 0) : 0

  // Filter coaching sessions to current billing period
  let sessionsUsed = 0
  if (profile?.subscription_current_period_end && coachingSessions.length > 0) {
    const periodEnd = new Date(profile.subscription_current_period_end)
    const periodStart = new Date(periodEnd)
    periodStart.setMonth(periodStart.getMonth() - 1)
    const startStr = periodStart.toISOString().split('T')[0]
    const endStr = periodEnd.toISOString().split('T')[0]
    sessionsUsed = coachingSessions.filter((s: any) =>
      s.billing_period_start >= startStr && s.billing_period_end <= endStr
    ).length
  }
  const coachingSessionsRemaining = Math.max(0, sessionsAllowed - sessionsUsed)

  // Build habit summaries with completion rates, streaks, and historical data
  const habitMap = new Map<string, { days: Set<number>; config: any }>()
  for (const h of weeklyHabits) {
    if (!habitMap.has(h.habit_name)) {
      const config = configs.find(c => c.habit_name === h.habit_name)
      habitMap.set(h.habit_name, { days: new Set(), config })
    }
    habitMap.get(h.habit_name)!.days.add(h.day_of_week)
  }

  const habits = Array.from(habitMap.entries()).map(([name, info]) => {
    const scheduledDays = info.days.size
    const completedDays = entries.filter(e => e.habit_name === name && e.completed).length
    // Only show rate for days that have passed
    const daysPassedThisWeek = Math.min(dayOfWeek === 0 ? 7 : dayOfWeek, scheduledDays)
    const rate = daysPassedThisWeek > 0
      ? `${completedDays}/${daysPassedThisWeek}`
      : 'not yet this week'

    // Historical completion rate (last 4 weeks, excluding current week)
    const historicalCompleted = historicalEntries.filter(e => e.habit_name === name && e.completed).length
    const historicalTotal = historicalEntries.filter(e => e.habit_name === name).length
    const last4WeeksRate = historicalTotal > 0
      ? `${historicalCompleted}/${historicalTotal}`
      : null

    // Metric average (last 4 weeks + current week)
    const metricEntries = allEntries.filter(e => e.habit_name === name && e.metric_value !== null)
    const metricAverage = metricEntries.length > 0
      ? Math.round((metricEntries.reduce((sum, e) => sum + (e.metric_value || 0), 0) / metricEntries.length) * 10) / 10
      : null

    // Streak computation: count consecutive completed days backwards from today
    const habitEntries = allEntries
      .filter(e => e.habit_name === name && e.completed !== null)
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date)) // newest first

    let currentStreak = 0
    let bestStreak = 0
    let tempStreak = 0
    let streakBroken = false

    for (const e of habitEntries) {
      if (!streakBroken) {
        if (e.completed) {
          currentStreak++
        } else {
          streakBroken = true
        }
      }
      // Best streak (scan all entries oldest to newest)
    }

    // Compute best streak from oldest to newest
    const chronological = [...habitEntries].reverse()
    for (const e of chronological) {
      if (e.completed) {
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    return {
      habit_name: name,
      tracking_type: info.config?.tracking_type ?? null,
      metric_unit: info.config?.metric_unit ?? null,
      metric_target: info.config?.metric_target ?? null,
      scheduled_days: scheduledDays,
      recent_completion_rate: rate,
      challenge_slug: info.config?.challenge_slug ?? null,
      current_streak: currentStreak,
      best_streak: bestStreak,
      last_4_weeks_rate: last4WeeksRate,
      metric_average: metricAverage,
    }
  })

  return {
    firstName: profile?.first_name || 'there',
    visionStatement: vision.visionStatement || null,
    whyMatters: vision.whyMatters || null,
    habits,
    challengeContext: challengeRes.data
      ? { slug: challengeRes.data.challenge_slug, week: challengeRes.data.current_week }
      : null,
    recentReflections: reflectionsRes.data || [],
    recentConversation: recentSms.map(
      (m: { direction: string; body: string }) =>
        `${m.direction === 'inbound' ? 'User' : 'Summit'}: ${m.body}`
    ),
    guides: resources.map((r: any) => ({
      title: r.title,
      url: r.url,
      topic: r.topic || null,
    })),
    memberSince: profile?.created_at || null,
    subscriptionTier: tier,
    coachingSessionsRemaining,
  }
}

/**
 * Format user context as a prompt string for injection into AI system prompts
 */
export function formatContextForPrompt(ctx: UserContext): string {
  const lines: string[] = []

  lines.push(`USER: ${ctx.firstName}`)

  if (ctx.memberSince) {
    const days = Math.floor(
      (Date.now() - new Date(ctx.memberSince).getTime()) / (1000 * 60 * 60 * 24)
    )
    lines.push(`Member for ${days} days`)
  }

  if (ctx.visionStatement) {
    lines.push(`\nHEALTH VISION: ${ctx.visionStatement}`)
  }
  if (ctx.whyMatters) {
    lines.push(`WHY IT MATTERS: ${ctx.whyMatters}`)
  }

  if (ctx.habits.length > 0) {
    lines.push(`\nHABITS:`)
    for (const h of ctx.habits) {
      const typeStr = h.tracking_type === 'metric' && h.metric_unit
        ? ` (tracks ${h.metric_unit}${h.metric_target ? `, target: ${h.metric_target}` : ''})`
        : h.tracking_type === 'boolean' ? ' (yes/no)' : ''
      const challengeStr = h.challenge_slug ? ` [${h.challenge_slug} challenge]` : ''
      const streakStr = h.current_streak > 0 ? `, streak: ${h.current_streak} days` : ''
      const bestStr = h.best_streak > h.current_streak ? ` (best: ${h.best_streak})` : ''
      const histStr = h.last_4_weeks_rate ? `, last 4 wks: ${h.last_4_weeks_rate}` : ''
      const avgStr = h.metric_average !== null ? `, avg: ${h.metric_average} ${h.metric_unit || ''}` : ''
      lines.push(`- ${h.habit_name}${typeStr}: ${h.recent_completion_rate} this week, ${h.scheduled_days}x/wk${streakStr}${bestStr}${histStr}${avgStr}${challengeStr}`)
    }
  }

  if (ctx.challengeContext) {
    lines.push(`\nACTIVE CHALLENGE: "${ctx.challengeContext.slug}" — week ${ctx.challengeContext.week} of 4`)
  }

  if (ctx.recentReflections.length > 0) {
    lines.push(`\nRECENT REFLECTIONS:`)
    for (const r of ctx.recentReflections) {
      lines.push(`Week ${r.week_number}: Went well: ${r.went_well || 'n/a'} | Challenges: ${r.friction || 'n/a'} | Adjusting: ${r.adjustment || 'n/a'}`)
    }
  }

  if (ctx.subscriptionTier) {
    const coachStr = ctx.coachingSessionsRemaining > 0
      ? `${ctx.coachingSessionsRemaining} coaching session(s) remaining this month`
      : 'No coaching sessions available on current plan'
    lines.push(`\nSUBSCRIPTION: ${ctx.subscriptionTier} plan. ${coachStr}`)
  } else {
    lines.push(`\nSUBSCRIPTION: No active plan`)
  }

  if (ctx.guides.length > 0) {
    lines.push(`\nAVAILABLE GUIDES (mention when the user is struggling with a topic that matches a guide):`)
    for (const g of ctx.guides) {
      const topicStr = g.topic ? ` [${g.topic}]` : ''
      lines.push(`- ${g.title}${topicStr}: ${g.url}`)
    }
  }

  if (ctx.recentConversation.length > 0) {
    lines.push(`\nRECENT SMS (last ${ctx.recentConversation.length} messages):`)
    lines.push(ctx.recentConversation.join('\n'))
  }

  return lines.join('\n')
}
