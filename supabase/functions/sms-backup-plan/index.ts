import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS as _sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

/** Convenience wrapper matching the old call signature */
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
 * Use OpenAI to generate a coaching suggestion for reducing a habit
 */
async function generateBackupSuggestion(
  habitName: string,
  currentTarget: number | null,
  currentUnit: string | null,
  currentDaysCount: number,
  firstName: string
): Promise<{ message: string; suggestedTarget: number | null; suggestedDays: number; reasoning: string }> {
  if (!OPENAI_API_KEY) {
    // Fallback without AI
    const suggestedTarget = currentTarget ? Math.round(currentTarget / 3) : null
    const suggestedDays = Math.max(2, Math.round(currentDaysCount / 2))
    const targetStr = suggestedTarget && currentUnit ? `${suggestedTarget} ${currentUnit}` : ''
    const message = `Got it — ${habitName} can feel like a lot. How about ${targetStr ? targetStr + ', ' : ''}${suggestedDays}x this week? Any effort counts. Sound good? (Y/N)`
    return { message, suggestedTarget, suggestedDays, reasoning: 'Reduced to ~1/3 target and ~1/2 frequency.' }
  }

  const systemPrompt = `You are Summit, a supportive health habit coach. The user already chose to adjust — don't re-explain why adjusting is ok. Just:
1. Acknowledge which habit and current plan briefly ("Got it — X at Y Z/wk is a lot when life's busy.")
2. Suggest a specific reduced target and frequency
3. Keep it under 250 chars (SMS-friendly), conversational, warm
4. Do NOT include motivational science claims or principles — just be direct and human
5. End with "Sound good? (Y/N)"

Respond with JSON only:
{
  "message": "the SMS to send (under 250 chars, end with Sound good? (Y/N))",
  "suggested_target": number or null,
  "suggested_days": number,
  "reasoning": "brief internal reasoning about why this reduction"
}`

  const userPrompt = `User: ${firstName}
Habit: ${habitName}
Current target: ${currentTarget ?? 'N/A'} ${currentUnit ?? ''}
Current frequency: ${currentDaysCount}x/week

Suggest a realistic but still meaningful reduced plan. The suggested_target and suggested_days must be lower than current values.`

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
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text())
      throw new Error('OpenAI API error')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    let jsonStr = content.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    }

    const result = JSON.parse(jsonStr)
    return {
      message: result.message,
      suggestedTarget: result.suggested_target,
      suggestedDays: result.suggested_days,
      reasoning: result.reasoning,
    }
  } catch (error) {
    console.error('Error generating backup suggestion:', error)
    // Fallback
    const suggestedTarget = currentTarget ? Math.max(1, Math.round(currentTarget / 3)) : null
    const suggestedDays = Math.max(2, Math.round(currentDaysCount / 2))
    const targetStr = suggestedTarget && currentUnit ? `${suggestedTarget} ${currentUnit}` : ''
    const message = `Got it — ${habitName} at ${currentTarget ?? ''} ${currentUnit ?? ''} ${currentDaysCount}x/wk is a lot when life's busy. How about ${targetStr ? targetStr + ', ' : ''}${suggestedDays}x this week? Even small effort counts. Sound good? (Y/N)`
    return { message, suggestedTarget, suggestedDays, reasoning: 'Fallback: reduced to ~1/3 target and ~1/2 frequency.' }
  }
}

/**
 * Use OpenAI to validate and parse a custom user suggestion
 */
async function parseCustomSuggestion(
  userMessage: string,
  habitName: string,
  currentTarget: number | null,
  currentUnit: string | null,
  currentDaysCount: number
): Promise<{ valid: boolean; target: number | null; days: number | null; message: string }> {
  if (!OPENAI_API_KEY) {
    return { valid: false, target: null, days: null, message: `What would work for you? e.g. "15 ${currentUnit ?? 'units'}, 3x/week"` }
  }

  const systemPrompt = `You are Summit, parsing a user's custom habit plan adjustment. Extract their preferred target and frequency. Respond with JSON only:
{
  "valid": true/false,
  "target": number or null (their preferred target value),
  "days": number or null (their preferred days per week),
  "message": "a short confirmation or clarification question (under 200 chars)"
}

If the message doesn't clearly state a plan, set valid=false and ask a clarifying question.
Keep the message SMS-friendly (under 200 chars).`

  const userPrompt = `Habit: ${habitName}
Current: ${currentTarget ?? 'N/A'} ${currentUnit ?? ''}, ${currentDaysCount}x/week
User says: "${userMessage}"

Parse what they want to change to.`

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
        temperature: 0.3,
      }),
    })

    if (!response.ok) throw new Error('OpenAI API error')

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    let jsonStr = content.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    }

    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('Error parsing custom suggestion:', error)
    return { valid: false, target: null, days: null, message: `What would work better? e.g. "15 ${currentUnit ?? 'units'}, 3x/week"` }
  }
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Try to update the habit name if it contains the old target value.
 * e.g. "Complete a 10-minute guided meditation" → "Complete a 5-minute guided meditation"
 */
function deriveNewHabitName(
  habitName: string,
  originalTarget: number | null,
  newTarget: number | null
): string | null {
  if (originalTarget === null || newTarget === null || originalTarget === newTarget) return null

  const origStr = String(originalTarget)
  const newStr = String(newTarget)

  // Match patterns like "10-minute", "10 minute", "30-min", "30 min", "64 oz", "64-oz"
  const pattern = new RegExp(`\\b${origStr}[-\\s]`, 'i')
  if (pattern.test(habitName)) {
    return habitName.replace(pattern, (match) => {
      const separator = match.charAt(match.length - 1) // '-' or ' '
      return `${newStr}${separator}`
    })
  }

  return null
}

/**
 * Apply the plan changes to the database
 */
async function applyPlanChanges(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  habitName: string,
  newTarget: number | null,
  newDays: number,
  originalTarget: number | null,
  originalUnit: string | null,
  originalDaysCount: number,
  aiReasoning: string
): Promise<{ success: boolean; error?: string; keptDays?: number[]; newHabitName?: string }> {
  try {
    let changeType = 'both'
    if (newTarget !== null && newTarget !== originalTarget && newDays === originalDaysCount) {
      changeType = 'reduce_target'
    } else if ((newTarget === null || newTarget === originalTarget) && newDays !== originalDaysCount) {
      changeType = 'reduce_days'
    }

    // 1. Update metric_target in habit_tracking_config if target changed
    if (newTarget !== null && newTarget !== originalTarget) {
      const { error: configError } = await supabase
        .from('habit_tracking_config')
        .update({ metric_target: newTarget })
        .eq('user_id', userId)
        .eq('habit_name', habitName)

      if (configError) {
        console.error('Error updating habit_tracking_config:', configError)
        return { success: false, error: 'Failed to update habit target' }
      }
    }

    // 2. Remove extra day_of_week entries if reducing frequency
    let keptDays: number[] | undefined
    if (newDays < originalDaysCount) {
      const { data: currentDayRows, error: daysError } = await supabase
        .from('weekly_habits')
        .select('id, day_of_week')
        .eq('user_id', userId)
        .eq('habit_name', habitName)
        .order('day_of_week', { ascending: true })

      if (daysError || !currentDayRows) {
        console.error('Error fetching weekly_habits:', daysError)
        return { success: false, error: 'Failed to fetch habit days' }
      }

      if (currentDayRows.length > newDays) {
        const today = new Date().getDay() // 0=Sunday
        const sorted = [...currentDayRows].sort((a, b) => {
          const distA = Math.min(
            Math.abs(a.day_of_week - today),
            7 - Math.abs(a.day_of_week - today)
          )
          const distB = Math.min(
            Math.abs(b.day_of_week - today),
            7 - Math.abs(b.day_of_week - today)
          )
          return distA - distB
        })

        const kept = sorted.slice(0, newDays)
        const toRemoveIds = currentDayRows.filter(r => !kept.some(k => k.id === r.id)).map(r => r.id)
        keptDays = kept.map(r => r.day_of_week).sort((a, b) => a - b)

        if (toRemoveIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('weekly_habits')
            .delete()
            .in('id', toRemoveIds)

          if (deleteError) {
            console.error('Error deleting weekly_habits rows:', deleteError)
            return { success: false, error: 'Failed to update habit schedule' }
          }
        }
      }
    }

    // 3. Rename habit if the name contains the old target value
    let newHabitName: string | undefined
    const derived = deriveNewHabitName(habitName, originalTarget, newTarget)
    if (derived) {
      newHabitName = derived
      console.log(`Renaming habit: "${habitName}" → "${newHabitName}"`)

      // Update across all tables that reference habit_name
      const renameOps = [
        supabase.from('weekly_habits').update({ habit_name: newHabitName }).eq('user_id', userId).eq('habit_name', habitName),
        supabase.from('habit_tracking_config').update({ habit_name: newHabitName }).eq('user_id', userId).eq('habit_name', habitName),
        supabase.from('habit_tracking_entries').update({ habit_name: newHabitName }).eq('user_id', userId).eq('habit_name', habitName),
      ]
      const results = await Promise.all(renameOps)
      for (const r of results) {
        if (r.error) console.error('Error renaming habit:', r.error)
      }
    }

    // 4. Log the change to backup_plan_log
    const { error: logError } = await supabase.from('backup_plan_log').insert({
      user_id: userId,
      habit_name: habitName,
      change_type: changeType,
      original_value: {
        target: originalTarget,
        unit: originalUnit,
        days: originalDaysCount,
      },
      new_value: {
        target: newTarget ?? originalTarget,
        unit: originalUnit,
        days: newDays,
        habit_name: newHabitName ?? habitName,
      },
      ai_reasoning: aiReasoning,
    })

    if (logError) {
      console.error('Error inserting backup_plan_log:', logError)
    }

    return { success: true, keptDays, newHabitName }
  } catch (error) {
    console.error('Error applying plan changes:', error)
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, authorization',
      },
    })
  }

  try {
    const formData = await req.formData()
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString() || ''

    console.log(`=== SMS BACKUP PLAN ===`)
    console.log(`From: ${from}`)
    console.log(`Body: "${body}"`)

    if (!from || !body) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Look up user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', from)
      .maybeSingle()

    if (profileError || !profile) {
      console.log(`No user found for phone ${from}`)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const firstName = profile.first_name || 'there'
    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null

    // Check for existing active backup session
    const { data: existingSession } = await supabase
      .from('sms_backup_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const upperBody = body.toUpperCase().trim()

    // ============================================
    // STEP: START — initiate new backup session
    // ============================================
    if (!existingSession || upperBody === 'BACKUP' || upperBody.startsWith('BACKUP')) {
      console.log('Starting new backup session')

      // Clean up any existing sessions for this user
      await supabase
        .from('sms_backup_sessions')
        .delete()
        .eq('user_id', profile.id)

      // Get user's habits with tracking config and day counts
      const { data: habits } = await supabase
        .from('weekly_habits')
        .select('habit_name, day_of_week')
        .eq('user_id', profile.id)

      if (!habits || habits.length === 0) {
        await sendSMS(
          from,
          `Hey ${firstName}, you don't have any habits set up yet. Set up habits in the app first, then text BACKUP anytime to adjust.`,
          supabase, profile.id, userName
        )
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }

      // Get tracking configs
      const { data: trackingConfigs } = await supabase
        .from('habit_tracking_config')
        .select('*')
        .eq('user_id', profile.id)

      // Aggregate habits: unique names with day counts
      const habitMap = new Map<string, { dayCount: number; target: number | null; unit: string | null }>()
      for (const h of habits) {
        if (!habitMap.has(h.habit_name)) {
          const config = trackingConfigs?.find(c => c.habit_name === h.habit_name)
          habitMap.set(h.habit_name, {
            dayCount: 0,
            target: config?.metric_target ?? null,
            unit: config?.metric_unit ?? null,
          })
        }
        habitMap.get(h.habit_name)!.dayCount++
      }

      const habitsPresented: Array<{
        habit_name: string
        current_target: number | null
        current_unit: string | null
        current_days_count: number
      }> = []

      let listText = ''
      let idx = 1
      for (const [name, info] of habitMap) {
        const targetStr = info.target && info.unit ? `${info.target} ${info.unit}, ` : ''
        listText += `${idx}. ${name} (${targetStr}${info.dayCount}x/wk)\n`
        habitsPresented.push({
          habit_name: name,
          current_target: info.target,
          current_unit: info.unit,
          current_days_count: info.dayCount,
        })
        idx++
      }

      // Create session
      await supabase.from('sms_backup_sessions').insert({
        user_id: profile.id,
        step: 'select_habit',
        context: { habits_presented: habitsPresented },
      })

      const message = `Hey ${firstName}, no worries — adjusting is a sign of self-awareness, not failure.\nWhich habit feels like too much right now?\n${listText.trim()}\nReply the number or name.`

      await sendSMS(from, message, supabase, profile.id, userName)

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ============================================
    // STEP: SELECT_HABIT — user picks a habit
    // ============================================
    if (existingSession.step === 'select_habit') {
      console.log('Processing habit selection')
      const context = existingSession.context as {
        habits_presented: Array<{
          habit_name: string
          current_target: number | null
          current_unit: string | null
          current_days_count: number
        }>
      }

      const habitsPresented = context.habits_presented
      const trimmed = body.trim()
      let selectedHabit: typeof habitsPresented[0] | undefined

      // Try numeric selection
      const numChoice = parseInt(trimmed)
      if (numChoice >= 1 && numChoice <= habitsPresented.length) {
        selectedHabit = habitsPresented[numChoice - 1]
      }

      // Try name match
      if (!selectedHabit) {
        const lower = trimmed.toLowerCase()
        selectedHabit = habitsPresented.find(h =>
          h.habit_name.toLowerCase() === lower ||
          h.habit_name.toLowerCase().includes(lower) ||
          lower.includes(h.habit_name.toLowerCase())
        )
      }

      if (!selectedHabit) {
        const names = habitsPresented.map((h, i) => `${i + 1}. ${h.habit_name}`).join('\n')
        await sendSMS(
          from,
          `Didn't catch that. Reply the number:\n${names}`,
          supabase, profile.id, userName
        )
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }

      // Generate AI suggestion
      const suggestion = await generateBackupSuggestion(
        selectedHabit.habit_name,
        selectedHabit.current_target,
        selectedHabit.current_unit,
        selectedHabit.current_days_count,
        firstName
      )

      // Update session to confirm step
      await supabase
        .from('sms_backup_sessions')
        .update({
          step: 'confirm',
          context: {
            ...context,
            selected_habit: selectedHabit.habit_name,
            original_target: selectedHabit.current_target,
            original_unit: selectedHabit.current_unit,
            original_days: selectedHabit.current_days_count,
            suggested_target: suggestion.suggestedTarget,
            suggested_days: suggestion.suggestedDays,
            ai_reasoning: suggestion.reasoning,
          },
        })
        .eq('id', existingSession.id)

      await sendSMS(from, suggestion.message, supabase, profile.id, userName)

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ============================================
    // STEP: CONFIRM — user accepts or declines
    // ============================================
    if (existingSession.step === 'confirm') {
      console.log('Processing confirmation')
      const context = existingSession.context as {
        habits_presented: Array<{
          habit_name: string
          current_target: number | null
          current_unit: string | null
          current_days_count: number
        }>
        selected_habit: string
        original_target: number | null
        original_unit: string | null
        original_days: number
        suggested_target: number | null
        suggested_days: number
        ai_reasoning: string
      }

      const trimmed = body.trim().toLowerCase()

      // Check for YES
      if (['y', 'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', '👍'].includes(trimmed)) {
        // Apply the changes
        const result = await applyPlanChanges(
          supabase,
          profile.id,
          context.selected_habit,
          context.suggested_target,
          context.suggested_days,
          context.original_target,
          context.original_unit,
          context.original_days,
          context.ai_reasoning
        )

        // Clean up session
        await supabase.from('sms_backup_sessions').delete().eq('id', existingSession.id)

        if (result.success) {
          const displayName = result.newHabitName ?? context.selected_habit
          const targetStr = context.suggested_target && context.original_unit
            ? `${context.suggested_target} ${context.original_unit}, `
            : ''
          const daysStr = result.keptDays
            ? ` on ${result.keptDays.map(d => DAY_NAMES[d]).join(', ')}`
            : ''
          const message = `Done! Updated → ${displayName}: ${targetStr}${context.suggested_days}x/wk${daysStr}.\nShowing up matters more than the duration. You've got this 💪\nText BACKUP again anytime or update your habits here: https://go.summithealth.app/habits`
          await sendSMS(from, message, supabase, profile.id, userName)
        } else {
          await sendSMS(
            from,
            `Sorry, had trouble updating that. Try texting BACKUP again?`,
            supabase, profile.id, userName
          )
        }

        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }

      // Check for NO
      if (['n', 'no', 'nope', 'nah', '👎'].includes(trimmed)) {
        // Move to custom step
        await supabase
          .from('sms_backup_sessions')
          .update({ step: 'custom' })
          .eq('id', existingSession.id)

        await sendSMS(
          from,
          `No problem! Tell me your preferred target and days (e.g. "15 ${context.original_unit ?? 'units'}, 3x/week"), or reply with a different habit name to switch.`,
          supabase, profile.id, userName
        )

        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }

      // Didn't understand — re-ask
      await sendSMS(
        from,
        `Reply Y to accept the new plan, or N to suggest your own.`,
        supabase, profile.id, userName
      )

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ============================================
    // STEP: CUSTOM — user suggests their own adjustment
    // ============================================
    if (existingSession.step === 'custom') {
      console.log('Processing custom suggestion')
      const context = existingSession.context as {
        habits_presented: Array<{
          habit_name: string
          current_target: number | null
          current_unit: string | null
          current_days_count: number
        }>
        selected_habit: string
        original_target: number | null
        original_unit: string | null
        original_days: number
        suggested_target: number | null
        suggested_days: number
        ai_reasoning: string
      }

      // Check if the user wants to switch to a different habit
      const lowerBody = body.toLowerCase()
      const otherHabits = context.habits_presented.filter(
        h => h.habit_name !== context.selected_habit
      )
      const switchToHabit = otherHabits.find(h => {
        const lowerName = h.habit_name.toLowerCase()
        // Match if user's message contains the habit name or key words from it
        return lowerBody.includes(lowerName) ||
          lowerName.split(/\s+/).some(word => word.length > 3 && lowerBody.includes(word.toLowerCase()))
      })

      if (switchToHabit) {
        console.log(`User wants to switch to habit: ${switchToHabit.habit_name}`)

        // Generate suggestion for the new habit
        const suggestion = await generateBackupSuggestion(
          switchToHabit.habit_name,
          switchToHabit.current_target,
          switchToHabit.current_unit,
          switchToHabit.current_days_count,
          firstName
        )

        // Update session to confirm step with new habit
        await supabase
          .from('sms_backup_sessions')
          .update({
            step: 'confirm',
            context: {
              ...context,
              selected_habit: switchToHabit.habit_name,
              original_target: switchToHabit.current_target,
              original_unit: switchToHabit.current_unit,
              original_days: switchToHabit.current_days_count,
              suggested_target: suggestion.suggestedTarget,
              suggested_days: suggestion.suggestedDays,
              ai_reasoning: suggestion.reasoning,
            },
          })
          .eq('id', existingSession.id)

        await sendSMS(from, suggestion.message, supabase, profile.id, userName)

        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }

      // Check if the user wants to skip/cancel the habit entirely
      const skipKeywords = ['skip', 'cancel', 'remove', 'delete', 'drop', 'nothing', 'none', 'stop doing', 'don\'t want', 'dont want', 'take it off', 'get rid']
      const wantsToSkip = skipKeywords.some(kw => lowerBody.includes(kw))

      if (wantsToSkip) {
        console.log(`User wants to skip/cancel habit: ${context.selected_habit}`)
        await supabase
          .from('sms_backup_sessions')
          .update({ step: 'nudge_skip' })
          .eq('id', existingSession.id)

        const unitStr = context.original_unit ? ` of ${context.original_unit}` : ''
        await sendSMS(
          from,
          `Even 2 minutes${unitStr} keeps the habit alive and your momentum going. Want to try a super minimal version instead? (Y/N)`,
          supabase, profile.id, userName
        )

        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }

      const parsed = await parseCustomSuggestion(
        body,
        context.selected_habit,
        context.original_target,
        context.original_unit,
        context.original_days
      )

      if (!parsed.valid || (parsed.target === null && parsed.days === null)) {
        // Ask again — but keep the session alive
        await sendSMS(from, parsed.message, supabase, profile.id, userName)

        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }

      // Apply custom changes
      const newTarget = parsed.target ?? context.original_target
      const newDays = parsed.days ?? context.original_days

      const result = await applyPlanChanges(
        supabase,
        profile.id,
        context.selected_habit,
        newTarget,
        newDays,
        context.original_target,
        context.original_unit,
        context.original_days,
        `User custom adjustment: ${body}`
      )

      // Clean up session
      await supabase.from('sms_backup_sessions').delete().eq('id', existingSession.id)

      if (result.success) {
        const displayName = result.newHabitName ?? context.selected_habit
        const targetStr = newTarget && context.original_unit
          ? `${newTarget} ${context.original_unit}, `
          : ''
        const daysStr = result.keptDays
          ? ` on ${result.keptDays.map(d => DAY_NAMES[d]).join(', ')}`
          : ''
        const message = `Done! Updated → ${displayName}: ${targetStr}${newDays}x/wk${daysStr}.\nAny effort counts — you're still in the game 💪\nText BACKUP again anytime or update your habits here: https://go.summithealth.app/habits`
        await sendSMS(from, message, supabase, profile.id, userName)
      } else {
        await sendSMS(
          from,
          `Sorry, had trouble updating that. Try texting BACKUP again?`,
          supabase, profile.id, userName
        )
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ============================================
    // STEP: NUDGE_SKIP — coaching nudge before removing a habit
    // ============================================
    if (existingSession.step === 'nudge_skip') {
      console.log('Processing nudge_skip response')
      const context = existingSession.context as {
        habits_presented: Array<{
          habit_name: string
          current_target: number | null
          current_unit: string | null
          current_days_count: number
        }>
        selected_habit: string
        original_target: number | null
        original_unit: string | null
        original_days: number
      }

      const trimmed = body.trim().toLowerCase()

      // YES — they want to try a minimal version
      if (['y', 'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', '👍'].includes(trimmed)) {
        // Generate a very minimal suggestion
        const minTarget = context.original_target ? Math.max(1, Math.round(context.original_target / 5)) : null
        const minDays = 1

        const targetStr = minTarget && context.original_unit
          ? `${minTarget} ${context.original_unit}, `
          : ''

        // Apply the minimal plan
        const result = await applyPlanChanges(
          supabase,
          profile.id,
          context.selected_habit,
          minTarget,
          minDays,
          context.original_target,
          context.original_unit,
          context.original_days,
          'User chose minimal version instead of skipping'
        )

        await supabase.from('sms_backup_sessions').delete().eq('id', existingSession.id)

        if (result.success) {
          const displayName = result.newHabitName ?? context.selected_habit
          const daysStr = result.keptDays
            ? ` on ${result.keptDays.map(d => DAY_NAMES[d]).join(', ')}`
            : ''
          const message = `Done! Updated → ${displayName}: ${targetStr}${minDays}x/wk${daysStr}.\nSmall wins add up 🙌\nText BACKUP again anytime or update your habits here: https://go.summithealth.app/habits`
          await sendSMS(from, message, supabase, profile.id, userName)
        } else {
          await sendSMS(from, `Sorry, had trouble updating that. Try texting BACKUP again?`, supabase, profile.id, userName)
        }

        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }

      // NO — they want to fully remove the habit
      if (['n', 'no', 'nope', 'nah', '👎'].includes(trimmed)) {
        // Delete all weekly_habits rows for this habit
        const { error: deleteError } = await supabase
          .from('weekly_habits')
          .delete()
          .eq('user_id', profile.id)
          .eq('habit_name', context.selected_habit)

        if (deleteError) {
          console.error('Error deleting weekly_habits:', deleteError)
        }

        // Disable tracking config
        await supabase
          .from('habit_tracking_config')
          .update({ tracking_enabled: false })
          .eq('user_id', profile.id)
          .eq('habit_name', context.selected_habit)

        // Log it
        await supabase.from('backup_plan_log').insert({
          user_id: profile.id,
          habit_name: context.selected_habit,
          change_type: 'remove',
          original_value: {
            target: context.original_target,
            unit: context.original_unit,
            days: context.original_days,
          },
          new_value: { target: 0, unit: context.original_unit, days: 0 },
          ai_reasoning: 'User chose to remove habit after nudge',
        })

        await supabase.from('sms_backup_sessions').delete().eq('id', existingSession.id)

        await sendSMS(
          from,
          `Got it — ${context.selected_habit} has been removed from your plan. No judgment, just self-awareness.\nYou can add it back anytime: https://go.summithealth.app/habits`,
          supabase, profile.id, userName
        )

        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }

      // Didn't understand
      await sendSMS(
        from,
        `Reply Y to try a minimal version, or N to remove it from your plan.`,
        supabase, profile.id, userName
      )

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Unknown step — clean up and restart
    console.log(`Unknown backup session step: ${existingSession.step}`)
    await supabase.from('sms_backup_sessions').delete().eq('id', existingSession.id)
    await sendSMS(
      from,
      `Something went wrong. Text BACKUP to start over.`,
      supabase, profile.id, userName
    )

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error) {
    console.error('Error in sms-backup-plan:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
})
