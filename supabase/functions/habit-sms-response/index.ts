import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS as _sendSMS } from '../_shared/sms.ts'
import { sendEmail } from '../_shared/resend.ts'

const COACH_FLAG_EMAIL = 'eric@summithealth.app'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

/** Convenience wrapper matching the old call signature */
async function sendSMSWithLog(
  to: string,
  message: string,
  supabase: ReturnType<typeof createClient>,
  userId?: string,
  userName?: string,
  sentByType?: string
) {
  const extra: Record<string, unknown> = { user_id: userId || null, user_name: userName || null }
  if (sentByType) extra.sent_by_type = sentByType
  return _sendSMS(
    { to, body: message },
    {
      supabase,
      logTable: 'sms_messages',
      extra,
    }
  )
}

interface TrackingConfig {
  habit_name: string
  tracking_type: 'boolean' | 'metric'
  tracking_enabled: boolean
  metric_unit: string | null
  metric_target: number | null
}

interface SmartParseResult {
  understood: boolean
  habits: Array<{
    habit_name: string
    value_type: 'boolean' | 'metric'
    value: boolean | number | null
    needs_clarification: boolean
    clarification_type?: 'metric_needed' | 'unit_conversion' | 'habit_selection'
    clarification_context?: Record<string, unknown>
    clarification_question?: string
  }>
  ambiguous_habits?: string[]
  clarification_question?: string
  friendly_response?: string
}

/**
 * Get today's date string in a specific timezone (YYYY-MM-DD)
 */
function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(now)
  } catch (error) {
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Get day of week (0-6, Sunday=0) in a specific timezone
 */
function getDayOfWeekInTimezone(timezone: string): number {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    })
    const weekdayStr = formatter.format(now)
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    }
    return dayMap[weekdayStr] ?? 0
  } catch (error) {
    return new Date().getDay()
  }
}

/**
 * Parse incoming SMS body for tracking response (simple parsing for followup context)
 */
function parseTrackingResponse(body: string, expectedType: 'boolean' | 'metric'): { type: 'boolean'; value: boolean } | { type: 'metric'; value: number } | null {
  const trimmed = body.trim().toLowerCase()

  // Check for pure numeric values first (including "1" and "0")
  const numMatch = trimmed.match(/^[\d.]+$/)
  if (numMatch) {
    const num = parseFloat(numMatch[0])
    if (!isNaN(num) && num >= 0) {
      if (expectedType === 'boolean') {
        return { type: 'boolean', value: num !== 0 }
      }
      return { type: 'metric', value: num }
    }
  }

  // Check for boolean keyword responses
  if (['y', 'yes', 'yeah', 'yep', 'done', 'true', '✓', '✔️', '👍'].includes(trimmed)) {
    return { type: 'boolean', value: true }
  }
  if (['n', 'no', 'nope', 'nah', 'false', 'skip', 'skipped', '👎'].includes(trimmed)) {
    return { type: 'boolean', value: false }
  }

  // Check for numbers with units (e.g., "30 min", "8 oz")
  const numWithUnitMatch = trimmed.match(/^[\d.]+/)
  if (numWithUnitMatch) {
    const num = parseFloat(numWithUnitMatch[0])
    if (!isNaN(num) && num >= 0) {
      if (expectedType === 'boolean') {
        return { type: 'boolean', value: num !== 0 }
      }
      return { type: 'metric', value: num }
    }
  }

  return null
}

/**
 * Use OpenAI to smart-parse a message against user's habits
 */
async function smartParseMessage(
  messageBody: string,
  firstName: string,
  trackingConfigs: TrackingConfig[]
): Promise<SmartParseResult> {
  if (!OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY not set - smart parsing disabled')
    return { understood: false, habits: [] }
  }

  const habitsDescription = trackingConfigs.map(c => {
    if (c.tracking_type === 'boolean') {
      return `- "${c.habit_name}" (yes/no tracking)`
    } else {
      return `- "${c.habit_name}" (tracks ${c.metric_unit || 'units'}${c.metric_target ? `, target: ${c.metric_target}` : ''})`
    }
  }).join('\n')

  const systemPrompt = `You are Summit, a friendly health habit tracking assistant. Analyze SMS messages to determine what habit(s) the user is trying to log. Respond with JSON only.`

  const userPrompt = `USER'S NAME: ${firstName}
USER'S TRACKED HABITS:
${habitsDescription}

USER'S MESSAGE: "${messageBody}"

Analyze and respond with JSON:
{
  "understood": true/false,
  "habits": [
    {
      "habit_name": "exact habit name from list",
      "value_type": "boolean" or "metric",
      "value": true/false or number or null,
      "needs_clarification": true/false,
      "clarification_type": "metric_needed" | "unit_conversion" | "habit_selection" | null,
      "clarification_context": { any relevant context },
      "clarification_question": "question if needs_clarification"
    }
  ],
  "clarification_question": "overall question if needed",
  "friendly_response": "brief confirmation under 100 chars"
}

RULES:
- Emojis: 🧘=meditation, 💧/🚰=water, 🏃=running/exercise
- Only match habits from the list above
- "8 glasses" but tracks "oz" → ask oz per glass
- Ambiguous match → ask which habit
- Metric habit + "did it" → ask for number
- Unrelated message → understood: false
- Keep questions SHORT (SMS)`

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
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text())
      return { understood: false, habits: [] }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    }

    const result = JSON.parse(jsonStr) as SmartParseResult
    console.log('Smart parse result:', JSON.stringify(result, null, 2))
    return result
  } catch (error) {
    console.error('Error in smart parsing:', error)
    return { understood: false, habits: [] }
  }
}

/**
 * Log a coach flag internally and email the admin
 */
async function handleCoachFlag(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  phone: string,
  userName: string | null,
  userMessage: string,
  coachReply: string,
  flagReason: string | null
): Promise<void> {
  const reason = flagReason || 'User may need human support'

  // Insert internal-only flag row
  await supabase.from('sms_messages').insert({
    direction: 'outbound',
    user_id: userId,
    phone,
    user_name: userName,
    body: `[COACH FLAG] ${reason}`,
    twilio_status: 'internal',
    sent_by_type: 'system',
  })

  // Email the admin with context
  const displayName = userName || phone
  try {
    await sendEmail({
      to: COACH_FLAG_EMAIL,
      subject: `[Summit Coach Flag] ${displayName}`,
      html: `
        <h2>Coach Flag: ${displayName}</h2>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>User message:</strong> "${userMessage}"</p>
        <p><strong>Summit replied:</strong> "${coachReply}"</p>
        <hr>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p style="color:#888;font-size:12px;">This flag was generated automatically by Summit's coaching fallback.</p>
      `,
    })
    console.log(`Coach flag email sent to ${COACH_FLAG_EMAIL}`)
  } catch (err) {
    console.error('Failed to send coach flag email:', err)
  }
}

/**
 * Generate a coaching response for non-habit messages
 */
async function generateCoachingResponse(
  messageBody: string,
  firstName: string,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ response: string; flagForHumanCoach: boolean; flagReason: string | null }> {
  const fallback = {
    response: `Hey ${firstName}, I hear you. I'm here if you want to talk — or just text your habits when you're ready.`,
    flagForHumanCoach: false,
    flagReason: null,
  }

  if (!OPENAI_API_KEY) return fallback

  try {
    // Load user context in parallel
    const [visionResult, reflectionsResult, smsHistoryResult] = await Promise.all([
      supabase
        .from('health_journeys')
        .select('form_data')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('weekly_reflections')
        .select('went_well, friction, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('sms_messages')
        .select('direction, body, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const vision = visionResult.data?.form_data || {}
    const reflections = reflectionsResult.data || []
    const smsHistory = (smsHistoryResult.data || []).reverse()

    const conversationContext = smsHistory
      .map((m: { direction: string; body: string }) =>
        `${m.direction === 'inbound' ? 'User' : 'Summit'}: ${m.body}`
      )
      .join('\n')

    const reflectionContext = reflections
      .map((r: { went_well: string; friction: string }) =>
        `Went well: ${r.went_well || 'n/a'} | Hard: ${r.friction || 'n/a'}`
      )
      .join('\n')

    const systemPrompt = `You are Summit, a warm and grounded health coach. The user sent a message that isn't about habit tracking. Respond with empathy and brevity.

RULES:
- If the message is simple/conversational (e.g., "thank you", "that's great", "ok", "cool", "thanks"), reply with a brief warm acknowledgment (under 50 chars). Don't offer suggestions or ask questions — just land the moment.
- For substantive messages: validate what they said, offer 1-2 brief concrete options (not commands)
- Stay under 320 characters total — this is SMS
- No emojis, no "great job", no "keep it up"
- Be warm but real. Don't sound like an app notification.
- If the user seems distressed, frustrated, or wanting to quit, set flag_for_human_coach to true

Respond with JSON only:
{
  "response": "your SMS reply under 320 chars",
  "flag_for_human_coach": true/false,
  "flag_reason": "brief reason if flagged, or null"
}`

    const userPrompt = `USER'S NAME: ${firstName}
VISION: ${vision.visionStatement || 'Not set'}
WHY IT MATTERS: ${vision.whyMatters || 'Not set'}

RECENT REFLECTIONS:
${reflectionContext || 'None'}

RECENT SMS CONVERSATION:
${conversationContext || 'None'}

NEW MESSAGE FROM USER: "${messageBody}"`

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
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('OpenAI coaching error:', response.status)
      return fallback
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content?.trim() || ''

    // Parse JSON from response
    if (content.startsWith('```')) {
      content = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(content)

    // Enforce character limit
    let coachResponse = parsed.response || fallback.response
    if (coachResponse.length > 320) {
      coachResponse = coachResponse.slice(0, 317) + '...'
    }

    return {
      response: coachResponse,
      flagForHumanCoach: !!parsed.flag_for_human_coach,
      flagReason: parsed.flag_reason || null,
    }
  } catch (error) {
    console.error('Error generating coaching response:', error)
    return fallback
  }
}

/**
 * Handle a pending clarification response
 */
async function handleClarificationResponse(
  supabase: ReturnType<typeof createClient>,
  pending: { id: string; pending_type: string; context: Record<string, unknown> },
  messageBody: string,
  profile: { id: string; first_name: string; timezone: string },
  phone: string,
  userName: string | null,
  todayStr: string
): Promise<{ handled: boolean; response?: string }> {
  const trimmed = messageBody.trim()
  const context = pending.context

  // Delete the pending clarification (we're handling it now)
  await supabase.from('sms_pending_clarification').delete().eq('id', pending.id)

  const firstName = profile.first_name || 'there'

  if (pending.pending_type === 'unit_conversion') {
    // User is telling us how many oz/units per their unit
    const num = parseFloat(trimmed)
    if (isNaN(num) || num <= 0) {
      return {
        handled: true,
        response: `Hmm, I didn't get a number. How many ${context.target_unit} per ${context.user_unit}?`
      }
    }

    const totalValue = (context.user_value as number) * num
    const habitName = context.matched_habit as string

    // Log the entry
    const { error } = await supabase.from('habit_tracking_entries').upsert({
      user_id: profile.id,
      habit_name: habitName,
      entry_date: todayStr,
      entry_source: 'sms',
      completed: null,
      metric_value: totalValue,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,habit_name,entry_date' })

    if (error) {
      console.error('Error logging entry:', error)
      return { handled: true, response: `Sorry, had trouble saving that. Try again?` }
    }

    return {
      handled: true,
      response: `Perfect! Logged ${totalValue} ${context.target_unit} for ${habitName} 💧`
    }
  }

  if (pending.pending_type === 'habit_selection') {
    // User is telling us which habit they meant
    const possibleHabits = context.possible_habits as string[]
    const userInput = context.user_input as string
    const userValue = context.user_value as (boolean | number | null)

    // Try to match their response to one of the habits
    const lowerTrimmed = trimmed.toLowerCase()
    let matchedHabit = possibleHabits.find(h =>
      h.toLowerCase() === lowerTrimmed ||
      h.toLowerCase().includes(lowerTrimmed) ||
      lowerTrimmed.includes(h.toLowerCase())
    )

    // Also check for numeric selection (1, 2, 3...)
    const numChoice = parseInt(trimmed)
    if (!matchedHabit && numChoice >= 1 && numChoice <= possibleHabits.length) {
      matchedHabit = possibleHabits[numChoice - 1]
    }

    if (!matchedHabit) {
      return {
        handled: true,
        response: `I didn't catch that. Which one: ${possibleHabits.join(' or ')}?`
      }
    }

    // Get the tracking config for this habit
    const { data: config } = await supabase
      .from('habit_tracking_config')
      .select('*')
      .eq('user_id', profile.id)
      .eq('habit_name', matchedHabit)
      .maybeSingle()

    if (!config) {
      return { handled: true, response: `Hmm, couldn't find that habit config.` }
    }

    // Determine the value to log
    let entryData: Record<string, unknown> = {
      user_id: profile.id,
      habit_name: matchedHabit,
      entry_date: todayStr,
      entry_source: 'sms',
      updated_at: new Date().toISOString(),
    }

    if (config.tracking_type === 'boolean') {
      entryData.completed = userValue !== null ? userValue : true
      entryData.metric_value = null
    } else {
      if (typeof userValue === 'number') {
        entryData.metric_value = userValue
        entryData.completed = null
      } else {
        // Need to ask for metric value
        await supabase.from('sms_pending_clarification').insert({
          user_id: profile.id,
          pending_type: 'metric_needed',
          context: { matched_habit: matchedHabit, metric_unit: config.metric_unit },
        })
        return {
          handled: true,
          response: `Got it - ${matchedHabit}! How many ${config.metric_unit || 'units'}?`
        }
      }
    }

    const { error } = await supabase.from('habit_tracking_entries').upsert(entryData, {
      onConflict: 'user_id,habit_name,entry_date'
    })

    if (error) {
      console.error('Error logging entry:', error)
      return { handled: true, response: `Sorry, had trouble saving that. Try again?` }
    }

    const valueStr = config.tracking_type === 'boolean'
      ? (entryData.completed ? '✓' : 'skipped')
      : `${entryData.metric_value} ${config.metric_unit || ''}`

    return { handled: true, response: `Logged ${matchedHabit}: ${valueStr} 🎯` }
  }

  if (pending.pending_type === 'metric_needed') {
    // User is providing the metric value
    const num = parseFloat(trimmed)
    if (isNaN(num) || num < 0) {
      return {
        handled: true,
        response: `I need a number for ${context.matched_habit}. How many ${context.metric_unit}?`
      }
    }

    const { error } = await supabase.from('habit_tracking_entries').upsert({
      user_id: profile.id,
      habit_name: context.matched_habit as string,
      entry_date: todayStr,
      entry_source: 'sms',
      completed: null,
      metric_value: num,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,habit_name,entry_date' })

    if (error) {
      console.error('Error logging entry:', error)
      return { handled: true, response: `Sorry, had trouble saving that. Try again?` }
    }

    return {
      handled: true,
      response: `Logged ${num} ${context.metric_unit} for ${context.matched_habit} ✓`
    }
  }

  if (pending.pending_type === 'boolean_needed') {
    // User is confirming yes/no
    const lowerTrimmed = trimmed.toLowerCase()
    let completed: boolean | null = null

    if (['y', 'yes', 'yeah', 'yep', 'done', '1', '✓', '👍'].includes(lowerTrimmed)) {
      completed = true
    } else if (['n', 'no', 'nope', 'nah', 'skip', '0', '👎'].includes(lowerTrimmed)) {
      completed = false
    }

    if (completed === null) {
      return { handled: true, response: `Reply Y or N for ${context.matched_habit}` }
    }

    const { error } = await supabase.from('habit_tracking_entries').upsert({
      user_id: profile.id,
      habit_name: context.matched_habit as string,
      entry_date: todayStr,
      entry_source: 'sms',
      completed,
      metric_value: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,habit_name,entry_date' })

    if (error) {
      console.error('Error logging entry:', error)
      return { handled: true, response: `Sorry, had trouble saving that. Try again?` }
    }

    return {
      handled: true,
      response: completed
        ? `${context.matched_habit} logged ✓ Nice work, ${firstName}!`
        : `Got it - ${context.matched_habit} skipped. Tomorrow's a new day!`
    }
  }

  return { handled: false }
}

serve(async (req) => {
  // Handle CORS for preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
      },
    })
  }

  try {
    // Twilio sends webhooks as form data
    const formData = await req.formData()
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString() || ''

    console.log(`=== INCOMING SMS ===`)
    console.log(`From: ${from}`)
    console.log(`Body: "${body}"`)
    console.log(`Timestamp: ${new Date().toISOString()}`)

    if (!from || !body) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get MessageSid for logging
    const messageSid = formData.get('MessageSid')?.toString() || null

    // Find user by phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', from)
      .is('deleted_at', null)
      .maybeSingle()

    if (profileError || !profile) {
      console.log(`❌ No user found for phone ${from}`)
      // Inbound message already logged by twilio-webhook
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    console.log(`✓ Found user: ${profile.id} (${profile.first_name})`)

    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null

    // Check if user has active subscription or trial
    const hasAccess = profile.subscription_status === 'active' ||
      (profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date())

    if (!hasAccess) {
      console.log(`⚠ User ${profile.id} trial expired, no active subscription`)
      const firstName = profile.first_name || 'there'
      await sendSMSWithLog(
        from,
        `${firstName}, your Summit trial has ended. Visit go.summithealth.app/pricing to keep going.`,
        supabase,
        profile.id,
        userName || undefined,
        'system'
      )
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Inbound message already logged by twilio-webhook — no duplicate insert needed

    const userTimezone = profile.timezone || 'America/Chicago'
    const todayStr = getTodayInTimezone(userTimezone)
    const firstName = profile.first_name || 'there'

    // ============================================
    // STEP 0: Check for BACKUP keyword or active backup session
    // ============================================
    const upperBody = body.toUpperCase().trim()
    const isBackupKeyword = upperBody === 'BACKUP' || upperBody.startsWith('BACKUP ')

    let hasActiveBackupSession = false
    if (!isBackupKeyword) {
      const { data: backupSession } = await supabase
        .from('sms_backup_sessions')
        .select('id')
        .eq('user_id', profile.id)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle()
      hasActiveBackupSession = !!backupSession
    }

    if (isBackupKeyword || hasActiveBackupSession) {
      console.log(`Routing to sms-backup-plan (keyword: ${isBackupKeyword}, active session: ${hasActiveBackupSession})`)
      try {
        const backupUrl = `${SUPABASE_URL}/functions/v1/sms-backup-plan`
        const backupRes = await fetch(backupUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: new URLSearchParams({ From: from, Body: body }).toString(),
        })
        console.log(`sms-backup-plan status: ${backupRes.status}`)
      } catch (backupError) {
        console.error('Error forwarding to sms-backup-plan:', backupError)
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ============================================
    // STEP 1: Check for pending clarification
    // ============================================
    const { data: pendingClarification } = await supabase
      .from('sms_pending_clarification')
      .select('*')
      .eq('user_id', profile.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pendingClarification) {
      console.log(`Found pending clarification: ${pendingClarification.pending_type}`)
      const result = await handleClarificationResponse(
        supabase,
        pendingClarification,
        body,
        profile,
        from,
        userName,
        todayStr
      )

      if (result.handled && result.response) {
        await sendSMSWithLog(from, result.response, supabase, profile.id, userName)
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ============================================
    // STEP 2: Check for recent followup context
    // ============================================
    const { data: recentFollowup } = await supabase
      .from('sms_followup_log')
      .select('*')
      .eq('user_id', profile.id)
      .gte('sent_at', `${todayStr}T00:00:00`)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentFollowup) {
      console.log(`Found followup context: ${recentFollowup.habit_name}`)

      // Get tracking config for this habit
      const { data: trackingConfig } = await supabase
        .from('habit_tracking_config')
        .select('*')
        .eq('user_id', profile.id)
        .eq('habit_name', recentFollowup.habit_name)
        .maybeSingle()

      if (trackingConfig?.tracking_enabled) {
        const configType = trackingConfig.tracking_type as 'boolean' | 'metric'
        const parsed = parseTrackingResponse(body, configType)

        if (parsed) {
          // Save the entry
          const entryData: Record<string, unknown> = {
            user_id: profile.id,
            habit_name: recentFollowup.habit_name,
            entry_date: todayStr,
            entry_source: 'sms',
            updated_at: new Date().toISOString(),
          }

          if (parsed.type === 'boolean') {
            entryData.completed = parsed.value
            entryData.metric_value = null
          } else {
            entryData.completed = null
            entryData.metric_value = parsed.value
          }

          const { error: upsertError } = await supabase
            .from('habit_tracking_entries')
            .upsert(entryData, { onConflict: 'user_id,habit_name,entry_date' })

          if (!upsertError) {
            // Build confirmation message
            let confirmationMessage: string
            if (parsed.type === 'boolean') {
              confirmationMessage = parsed.value
                ? `Got it, ${firstName}! ${recentFollowup.habit_name} ✓`
                : `Got it. Tomorrow's a new day!`
            } else {
              const unit = trackingConfig.metric_unit || 'units'
              const targetHit = trackingConfig.metric_target && parsed.value >= trackingConfig.metric_target
              confirmationMessage = targetHit
                ? `${parsed.value} ${unit} ✓ Target hit!`
                : `${parsed.value} ${unit} logged ✓`
            }

            await sendSMSWithLog(from, confirmationMessage, supabase, profile.id, userName)

            // Chain to next habit if available
            await chainToNextHabit(supabase, profile, from, userName, todayStr, userTimezone)
          }

          return new Response(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            { headers: { 'Content-Type': 'text/xml' } }
          )
        }
      }
    }

    // ============================================
    // STEP 3: Smart parsing (no context)
    // ============================================
    console.log('No followup context - attempting smart parse')

    // Get all enabled tracking configs for this user
    const { data: allConfigs } = await supabase
      .from('habit_tracking_config')
      .select('*')
      .eq('user_id', profile.id)
      .eq('tracking_enabled', true)

    if (!allConfigs || allConfigs.length === 0) {
      console.log('No tracking configs - routing to coaching fallback')
      const coachResult = await generateCoachingResponse(body, firstName, supabase, profile.id)
      await sendSMSWithLog(from, coachResult.response, supabase, profile.id, userName, 'coach')

      if (coachResult.flagForHumanCoach) {
        await handleCoachFlag(supabase, profile.id, from, userName, body, coachResult.response, coachResult.flagReason)
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Use Claude to smart-parse the message
    const parseResult = await smartParseMessage(body, firstName, allConfigs)

    if (!parseResult.understood || parseResult.habits.length === 0) {
      console.log('Smart parse: message not understood as habit logging - routing to coaching')
      const coachResult = await generateCoachingResponse(body, firstName, supabase, profile.id)
      await sendSMSWithLog(from, coachResult.response, supabase, profile.id, userName, 'coach')

      if (coachResult.flagForHumanCoach) {
        await handleCoachFlag(supabase, profile.id, from, userName, body, coachResult.response, coachResult.flagReason)
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Process matched habits
    const loggedHabits: string[] = []
    let needsClarification = false
    let clarificationQuestion = ''

    for (const habit of parseResult.habits) {
      if (habit.needs_clarification) {
        needsClarification = true

        // Store pending clarification
        await supabase.from('sms_pending_clarification').insert({
          user_id: profile.id,
          pending_type: habit.clarification_type || 'metric_needed',
          context: habit.clarification_context || { matched_habit: habit.habit_name },
        })

        clarificationQuestion = habit.clarification_question || parseResult.clarification_question || ''
        break // Handle one clarification at a time
      }

      // Log the habit entry
      const config = allConfigs.find(c => c.habit_name === habit.habit_name)
      if (!config) continue

      const entryData: Record<string, unknown> = {
        user_id: profile.id,
        habit_name: habit.habit_name,
        entry_date: todayStr,
        entry_source: 'sms',
        updated_at: new Date().toISOString(),
      }

      if (habit.value_type === 'boolean') {
        entryData.completed = habit.value
        entryData.metric_value = null
      } else {
        entryData.completed = null
        entryData.metric_value = habit.value
      }

      const { error } = await supabase
        .from('habit_tracking_entries')
        .upsert(entryData, { onConflict: 'user_id,habit_name,entry_date' })

      if (!error) {
        loggedHabits.push(habit.habit_name)
      }
    }

    // Send response
    if (needsClarification && clarificationQuestion) {
      await sendSMSWithLog(from, clarificationQuestion, supabase, profile.id, userName)
    } else if (loggedHabits.length > 0) {
      const response = parseResult.friendly_response ||
        (loggedHabits.length === 1
          ? `Logged ${loggedHabits[0]} ✓`
          : `Logged ${loggedHabits.length} habits ✓`)
      await sendSMSWithLog(from, response, supabase, profile.id, userName)
    }

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )

  } catch (error) {
    console.error('Error in habit-sms-response:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
})

/**
 * Chain to the next habit that needs followup
 */
async function chainToNextHabit(
  supabase: ReturnType<typeof createClient>,
  profile: { id: string; first_name: string; timezone: string },
  phone: string,
  userName: string | null,
  todayStr: string,
  userTimezone: string
) {
  try {
    const dayOfWeek = getDayOfWeekInTimezone(userTimezone)

    // Get all habits scheduled for today
    const { data: todayHabits } = await supabase
      .from('weekly_habits')
      .select('habit_name')
      .eq('user_id', profile.id)
      .eq('day_of_week', dayOfWeek)

    if (!todayHabits || todayHabits.length === 0) return

    // Get all tracking configs that are enabled
    const { data: allTrackingConfigs } = await supabase
      .from('habit_tracking_config')
      .select('*')
      .eq('user_id', profile.id)
      .eq('tracking_enabled', true)

    if (!allTrackingConfigs || allTrackingConfigs.length === 0) return

    // Get existing entries for today (only count actually completed/logged entries)
    const { data: existingEntries } = await supabase
      .from('habit_tracking_entries')
      .select('habit_name, completed, metric_value')
      .eq('user_id', profile.id)
      .eq('entry_date', todayStr)

    const habitsWithEntries = new Set(
      (existingEntries || [])
        .filter(e => e.completed === true || e.metric_value !== null)
        .map(e => e.habit_name)
    )

    // Find habits that need followup
    const habitsNeedingFollowup = todayHabits.filter(habit =>
      allTrackingConfigs.some(config => config.habit_name === habit.habit_name) &&
      !habitsWithEntries.has(habit.habit_name)
    )

    if (habitsNeedingFollowup.length === 0) return

    const nextHabit = habitsNeedingFollowup[0]
    const nextConfig = allTrackingConfigs.find(c => c.habit_name === nextHabit.habit_name)
    if (!nextConfig) return

    // Build the next follow-up message
    let nextMessage: string
    if (nextConfig.tracking_type === 'boolean') {
      nextMessage = `Did you complete "${nextConfig.habit_name}" today? Reply Y or N`
    } else {
      const unit = nextConfig.metric_unit || 'units'
      nextMessage = `How many ${unit} for "${nextConfig.habit_name}" today?`
    }

    await sendSMSWithLog(phone, nextMessage, supabase, profile.id, userName)

    // Log the follow-up
    await supabase.from('sms_followup_log').insert({
      user_id: profile.id,
      habit_name: nextConfig.habit_name,
      sent_at: new Date().toISOString(),
      message_sent: nextMessage,
    })

    console.log(`Sent chained followup for "${nextConfig.habit_name}"`)
  } catch (error) {
    console.error('Error in followup chaining:', error)
  }
}
