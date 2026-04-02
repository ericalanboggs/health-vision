import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS as _sendSMS } from '../_shared/sms.ts'
import { loadUserContext, formatContextForPrompt } from '../_shared/user_context.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const MAX_PERSONAL_HABITS = 5

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
      extra: { user_id: userId || null, user_name: userName || null },
    }
  )
}

/**
 * Use AI to refine a user's habit description into a SMART goal
 */
async function refineHabit(
  description: string,
  existingHabits: string[],
  userContextPrompt: string,
  firstName: string,
  isRefinement: boolean,
  previousProposal?: string,
  userFeedback?: string
): Promise<{
  habit_name: string
  tracking_type: 'boolean' | 'metric'
  metric_unit: string | null
  metric_target: number | null
  frequency: number
  days: number[]
  message: string
  reasoning: string
}> {
  const existingList = existingHabits.length > 0
    ? `\nUser's current habits (avoid duplicates):\n${existingHabits.map(h => `- ${h}`).join('\n')}`
    : ''

  const refinementContext = isRefinement && previousProposal && userFeedback
    ? `\n\nPREVIOUS PROPOSAL: ${previousProposal}\nUSER FEEDBACK: "${userFeedback}"\nAdjust the proposal based on their feedback.`
    : ''

  const systemPrompt = `You are Summit, a health habit coach helping a user create a new habit via SMS. Apply SMART goal principles to refine their idea into something specific, measurable, and achievable.

${userContextPrompt}
${existingList}

RULES:
- Turn vague ideas into specific, actionable habits (e.g., "exercise more" → "20-minute morning walk")
- Choose tracking_type: "boolean" for yes/no habits (did it or didn't), "metric" for measurable habits (water intake, steps, minutes)
- For metric habits, suggest a realistic starting target and unit
- Gently pressure-test ambitious plans: if frequency is 6-7x/week, suggest starting with 3-5x and building up. Frame it as smart pacing, not limitation.
- If the habit closely matches an existing one, point it out and suggest a variation
- Assign days spread evenly across the week based on frequency
- Keep the SMS message under 320 chars. End with "Sound good? (Y/N or tell me what to change)"
- Day mapping: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
${refinementContext}

Respond with JSON only:
{
  "habit_name": "concise habit name (under 80 chars)",
  "tracking_type": "boolean" or "metric",
  "metric_unit": "unit string or null if boolean",
  "metric_target": number or null if boolean,
  "frequency": number (days per week),
  "days": [array of day_of_week numbers],
  "message": "SMS to user describing the proposed habit. Under 320 chars. End with Sound good? (Y/N or tell me what to change)",
  "reasoning": "brief internal reasoning about why this shape"
}`

  const userPrompt = isRefinement
    ? `Adjust the habit proposal based on user feedback.`
    : `User "${firstName}" wants to build a new habit. Their description: "${description}"`

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
        max_tokens: 500,
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content?.trim() || ''

    if (content.startsWith('```')) {
      content = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    }

    return JSON.parse(content)
  } catch (error) {
    console.error('Error refining habit:', error)
    // Fallback: use description as-is
    return {
      habit_name: description.slice(0, 80),
      tracking_type: 'boolean',
      metric_unit: null,
      metric_target: null,
      frequency: 3,
      days: [1, 3, 5], // Mon, Wed, Fri
      message: `How about "${description.slice(0, 40)}" 3x/week (Mon/Wed/Fri), tracked as done/not done? Sound good? (Y/N or tell me what to change)`,
      reasoning: 'Fallback: AI unavailable',
    }
  }
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDays(days: number[]): string {
  return days.sort((a, b) => a - b).map(d => DAY_NAMES[d]).join('/')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Parse form data (from Twilio webhook forwarding)
    const bodyText = await req.text()
    const params = new URLSearchParams(bodyText)
    const from = params.get('From') || ''
    const body = (params.get('Body') || '').trim()
    const upperBody = body.toUpperCase()

    console.log(`=== SMS ADD HABIT ===`)
    console.log(`From: ${from}`)
    console.log(`Body: "${body}"`)

    // Look up user by phone
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, timezone')
      .eq('phone', from)
      .is('deleted_at', null)

    if (!profiles || profiles.length === 0) {
      console.log('No user found for phone:', from)
      return emptyTwiml()
    }

    // Prefer non-lite user if multiple profiles share the phone
    const profile = profiles.find((p: any) => p.challenge_type !== 'lite') || profiles[0]
    const userId = profile.id
    const firstName = profile.first_name || 'there'
    const timezone = profile.timezone || 'America/Chicago'
    const userName = profile.first_name || null

    // Check for existing session
    const { data: existingSession } = await supabase
      .from('sms_add_habit_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle()

    // ==========================================
    // NO SESSION: Starting fresh (ADD keyword)
    // ==========================================
    if (!existingSession) {
      // Check habit cap
      const { data: currentConfigs } = await supabase
        .from('habit_tracking_config')
        .select('habit_name')
        .eq('user_id', userId)
        .eq('tracking_enabled', true)
        .is('challenge_slug', null)

      const personalHabitCount = currentConfigs?.length || 0

      if (personalHabitCount >= MAX_PERSONAL_HABITS) {
        await sendSMS(
          from,
          `You're already tracking ${personalHabitCount} habits — that's the max. To swap one out, visit go.summithealth.app/habits or text BACKUP to simplify an existing habit first.`,
          supabase, userId, userName
        )
        return emptyTwiml()
      }

      // Create session
      await supabase.from('sms_add_habit_sessions').insert({
        user_id: userId,
        step: 'describe_habit',
        context: { personal_habit_count: personalHabitCount },
      })

      const remaining = MAX_PERSONAL_HABITS - personalHabitCount
      await sendSMS(
        from,
        `Let's set up a new habit! You have room for ${remaining} more. What habit do you want to build? Describe it in a sentence.`,
        supabase, userId, userName
      )
      return emptyTwiml()
    }

    // ==========================================
    // STEP: describe_habit
    // ==========================================
    if (existingSession.step === 'describe_habit') {
      // User cancel
      if (['CANCEL', 'NEVERMIND', 'STOP', 'QUIT', 'EXIT'].includes(upperBody)) {
        await supabase.from('sms_add_habit_sessions').delete().eq('id', existingSession.id)
        await sendSMS(from, 'No worries — cancelled. Text ADD anytime to try again.', supabase, userId, userName)
        return emptyTwiml()
      }

      // Load user context for AI
      const userContext = await loadUserContext(supabase, userId, timezone)
      const userContextPrompt = formatContextForPrompt(userContext)
      const existingHabits = userContext.habits.map(h => h.habit_name)

      // Check for duplicate
      const lowerBody = body.toLowerCase()
      const duplicate = existingHabits.find(h => h.toLowerCase().includes(lowerBody) || lowerBody.includes(h.toLowerCase()))

      if (duplicate) {
        await sendSMS(
          from,
          `You already have a similar habit: "${duplicate}". Want to describe a different habit, or text CANCEL to exit?`,
          supabase, userId, userName
        )
        return emptyTwiml()
      }

      // Use AI to refine into a SMART goal
      const proposal = await refineHabit(body, existingHabits, userContextPrompt, firstName, false)

      console.log('AI proposal:', JSON.stringify(proposal, null, 2))

      // Save proposal to session and advance to smart_refine
      await supabase.from('sms_add_habit_sessions')
        .update({
          step: 'smart_refine',
          context: {
            ...existingSession.context,
            user_description: body,
            proposed_habit_name: proposal.habit_name,
            proposed_tracking_type: proposal.tracking_type,
            proposed_metric_unit: proposal.metric_unit,
            proposed_metric_target: proposal.metric_target,
            proposed_frequency: proposal.frequency,
            proposed_days: proposal.days,
            proposed_time_of_day: null, // will use default
            refinement_count: 0,
            ai_reasoning: proposal.reasoning,
          },
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .eq('id', existingSession.id)

      await sendSMS(from, proposal.message, supabase, userId, userName)
      return emptyTwiml()
    }

    // ==========================================
    // STEP: smart_refine (confirm or adjust)
    // ==========================================
    if (existingSession.step === 'smart_refine') {
      const ctx = existingSession.context

      // User cancel
      if (['CANCEL', 'NEVERMIND', 'STOP', 'QUIT', 'EXIT'].includes(upperBody)) {
        await supabase.from('sms_add_habit_sessions').delete().eq('id', existingSession.id)
        await sendSMS(from, 'No worries — cancelled. Text ADD anytime to try again.', supabase, userId, userName)
        return emptyTwiml()
      }

      // User confirms
      const isYes = /^(y|yes|yeah|yep|yup|sure|ok|okay|sounds good|do it|let's go|perfect)$/i.test(body.trim())

      if (isYes) {
        // Write the habit to the database
        const writeResult = await writeHabit(supabase, userId, timezone, ctx)

        if (writeResult.success) {
          await supabase.from('sms_add_habit_sessions').delete().eq('id', existingSession.id)
          const daysStr = formatDays(ctx.proposed_days)
          await sendSMS(
            from,
            `Done! "${ctx.proposed_habit_name}" is set for ${daysStr}. You'll get reminders on those days. Adjust times in the app anytime at go.summithealth.app/habits`,
            supabase, userId, userName
          )
        } else {
          await supabase.from('sms_add_habit_sessions').delete().eq('id', existingSession.id)
          await sendSMS(
            from,
            `Something went wrong saving your habit. Try adding it in the app at go.summithealth.app/habits — sorry about that!`,
            supabase, userId, userName
          )
        }
        return emptyTwiml()
      }

      // User says no or provides adjustment
      const isNo = /^(n|no|nah|nope)$/i.test(body.trim())
      const refinementCount = ctx.refinement_count || 0

      if (refinementCount >= 1) {
        // Already refined once — accept whatever they say this time
        if (isNo) {
          await supabase.from('sms_add_habit_sessions').delete().eq('id', existingSession.id)
          await sendSMS(
            from,
            `No problem — you can always add habits in the app at go.summithealth.app/habits. Text ADD to start over anytime.`,
            supabase, userId, userName
          )
          return emptyTwiml()
        }

        // Treat their message as a final description, use it directly
        const userContext = await loadUserContext(supabase, userId, timezone)
        const userContextPrompt = formatContextForPrompt(userContext)
        const existingHabits = userContext.habits.map(h => h.habit_name)

        const proposal = await refineHabit(
          body, existingHabits, userContextPrompt, firstName, true,
          `${ctx.proposed_habit_name} (${ctx.proposed_tracking_type}, ${ctx.proposed_frequency}x/wk)`,
          body
        )

        // Write directly without another confirmation round
        const writeCtx = {
          ...ctx,
          proposed_habit_name: proposal.habit_name,
          proposed_tracking_type: proposal.tracking_type,
          proposed_metric_unit: proposal.metric_unit,
          proposed_metric_target: proposal.metric_target,
          proposed_frequency: proposal.frequency,
          proposed_days: proposal.days,
        }

        const writeResult = await writeHabit(supabase, userId, timezone, writeCtx)

        await supabase.from('sms_add_habit_sessions').delete().eq('id', existingSession.id)

        if (writeResult.success) {
          const daysStr = formatDays(proposal.days)
          await sendSMS(
            from,
            `Done! "${proposal.habit_name}" is set for ${daysStr}. You'll get reminders on those days. Adjust anytime at go.summithealth.app/habits`,
            supabase, userId, userName
          )
        } else {
          await sendSMS(
            from,
            `Something went wrong saving your habit. Try adding it in the app at go.summithealth.app/habits — sorry about that!`,
            supabase, userId, userName
          )
        }
        return emptyTwiml()
      }

      // First refinement — AI adjusts based on feedback
      const userContext = await loadUserContext(supabase, userId, timezone)
      const userContextPrompt = formatContextForPrompt(userContext)
      const existingHabits = userContext.habits.map(h => h.habit_name)

      const feedback = isNo ? 'User said no. Suggest a simpler alternative.' : body
      const proposal = await refineHabit(
        ctx.user_description, existingHabits, userContextPrompt, firstName, true,
        `${ctx.proposed_habit_name} (${ctx.proposed_tracking_type}, ${ctx.proposed_frequency}x/wk)`,
        feedback
      )

      console.log('Refined proposal:', JSON.stringify(proposal, null, 2))

      await supabase.from('sms_add_habit_sessions')
        .update({
          context: {
            ...ctx,
            proposed_habit_name: proposal.habit_name,
            proposed_tracking_type: proposal.tracking_type,
            proposed_metric_unit: proposal.metric_unit,
            proposed_metric_target: proposal.metric_target,
            proposed_frequency: proposal.frequency,
            proposed_days: proposal.days,
            refinement_count: 1,
            ai_reasoning: proposal.reasoning,
          },
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .eq('id', existingSession.id)

      await sendSMS(from, proposal.message, supabase, userId, userName)
      return emptyTwiml()
    }

    // Unknown step — clean up
    console.log(`Unknown step: ${existingSession.step}`)
    await supabase.from('sms_add_habit_sessions').delete().eq('id', existingSession.id)
    return emptyTwiml()

  } catch (error) {
    console.error('Error in sms-add-habit:', error)
    return emptyTwiml()
  }
})

/**
 * Write the confirmed habit to weekly_habits + habit_tracking_config
 */
async function writeHabit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  timezone: string,
  ctx: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Determine reminder time: use the most common time from existing habits, or default to 08:00
    const { data: existingHabits } = await supabase
      .from('weekly_habits')
      .select('reminder_time')
      .eq('user_id', userId)
      .is('archived_at', null)

    let reminderTime = '08:00:00'
    if (existingHabits && existingHabits.length > 0) {
      const timeCounts = new Map<string, number>()
      for (const h of existingHabits) {
        const t = h.reminder_time || '08:00:00'
        timeCounts.set(t, (timeCounts.get(t) || 0) + 1)
      }
      reminderTime = [...timeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    }

    // Insert tracking config
    const { error: configError } = await supabase
      .from('habit_tracking_config')
      .upsert({
        user_id: userId,
        habit_name: ctx.proposed_habit_name,
        tracking_type: ctx.proposed_tracking_type,
        metric_unit: ctx.proposed_metric_unit || null,
        metric_target: ctx.proposed_metric_target || null,
        tracking_enabled: true,
      }, { onConflict: 'user_id,habit_name' })

    if (configError) {
      console.error('Error inserting tracking config:', configError)
      return { success: false, error: configError.message }
    }

    // Insert weekly_habits rows (one per scheduled day)
    const days: number[] = ctx.proposed_days || [1, 3, 5]
    const rows = days.map((day: number) => ({
      user_id: userId,
      habit_name: ctx.proposed_habit_name,
      day_of_week: day,
      reminder_time: reminderTime,
      time_of_day: reminderTime,
      timezone: timezone,
    }))

    const { error: habitsError } = await supabase
      .from('weekly_habits')
      .upsert(rows, { onConflict: 'user_id,habit_name,day_of_week' })

    if (habitsError) {
      console.error('Error inserting weekly habits:', habitsError)
      return { success: false, error: habitsError.message }
    }

    console.log(`Created habit "${ctx.proposed_habit_name}" for user ${userId}: ${days.length} days/week`)
    return { success: true }
  } catch (error) {
    console.error('Error writing habit:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function emptyTwiml(): Response {
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } }
  )
}
