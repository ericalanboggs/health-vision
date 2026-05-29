import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS as _sendSMS } from '../_shared/sms.ts'
import { sendEmail } from '../_shared/resend.ts'
import { loadUserContext, formatContextForPrompt } from '../_shared/user_context.ts'
import { SUMMIT_LINKS } from '../_shared/summit_links.ts'
import { coachKnowledgeBlock } from '../_shared/coach_knowledge.ts'

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
  goal_updates?: Array<{
    habit_name: string
    metric_target?: number
    metric_unit?: string
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
 * Fuzzy-match an AI-returned habit_name against the user's actual configs.
 * The AI sometimes paraphrases (e.g. returns "Strength training or yoga" when
 * the real name is "Did you strength train or yoga today?"), which would silently
 * drop the entry under strict equality. This matcher does:
 *   1. exact match
 *   2. case/whitespace-insensitive match
 *   3. token-set Jaccard with stopword removal + light stemming
 */
const HABIT_STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'do', 'did', 'does', 'you', 'your', 'i', 'me', 'my',
  'today', 'for', 'of', 'in', 'on', 'at', 'to', 'and', 'or', 'how', 'much', 'many',
  'what', 'when', 'with', 'have', 'has', 'be', 'was', 'were', 'min', 'mins',
  'minute', 'minutes',
])

function stemHabitToken(word: string): string {
  if (word.length <= 4) return word
  // Doubled-consonant -ing: running → run, swimming → swim
  if (word.length >= 6 && word.endsWith('ing') && word[word.length - 4] === word[word.length - 5]) {
    return word.slice(0, -4)
  }
  if (word.endsWith('ing')) return word.slice(0, -3)
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

function tokenizeHabitName(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter(t => t && !HABIT_STOPWORDS.has(t))
      .map(stemHabitToken)
  )
}

function findHabitConfig<T extends { habit_name: string }>(configs: T[], aiName: string): T | undefined {
  if (!aiName) return undefined

  // 1. Exact
  let match = configs.find(c => c.habit_name === aiName)
  if (match) return match

  // 2. Case/whitespace-insensitive
  const aiLower = aiName.toLowerCase().trim()
  match = configs.find(c => c.habit_name.toLowerCase().trim() === aiLower)
  if (match) return match

  // 3. Token-set Jaccard
  const aiTokens = tokenizeHabitName(aiName)
  if (aiTokens.size === 0) return undefined

  let best: T | undefined
  let bestScore = 0
  for (const c of configs) {
    const cTokens = tokenizeHabitName(c.habit_name)
    if (cTokens.size === 0) continue
    const intersection = [...aiTokens].filter(t => cTokens.has(t)).length
    const union = new Set([...aiTokens, ...cTokens]).size
    const jaccard = intersection / union
    if (jaccard > bestScore) {
      bestScore = jaccard
      best = c
    }
  }

  if (bestScore >= 0.3) {
    console.log(`Fuzzy-matched habit "${aiName}" → "${best?.habit_name}" (Jaccard ${bestScore.toFixed(2)})`)
    return best
  }

  console.log(`No habit match for "${aiName}" (best Jaccard ${bestScore.toFixed(2)})`)
  return undefined
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

  // Boolean affirmative — match natural replies like "Yes I did", "yeah did it",
  // not just bare "yes". Word boundary stops false positives like "yesterday".
  if (/^(✓|✔️|👍|✅|💯)/.test(trimmed)) {
    return { type: 'boolean', value: true }
  }
  if (/^(y|yes|yeah|yep|yup|ya|yea|did|done|finished|completed|sure|true|got it|i did|i have|i've)\b/.test(trimmed)) {
    return { type: 'boolean', value: true }
  }
  if (/^(👎|❌)/.test(trimmed)) {
    return { type: 'boolean', value: false }
  }
  if (/^(n|no|nope|nah|skip|skipped|missed|forgot|false|didn't|did not|haven't|i didn't|i haven't|not yet|not today)\b/.test(trimmed)) {
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
  trackingConfigs: TrackingConfig[],
  userContextPrompt?: string
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

  const contextBlock = userContextPrompt
    ? `\n\nUSER BACKGROUND:\n${userContextPrompt}\n`
    : ''

  const systemPrompt = `You are Summit, a friendly health habit tracking assistant. Analyze SMS messages to determine what habit(s) the user is trying to log. Use the user's background to better understand their message and provide more personalized confirmations. Respond with JSON only.${contextBlock}`

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
  "goal_updates": [
    {
      "habit_name": "exact habit name from list",
      "metric_target": number,
      "metric_unit": "unit string or omit if unchanged"
    }
  ],
  "clarification_question": "overall question if needed",
  "friendly_response": "brief confirmation under 100 chars"
}

RULES:
- Emojis: 🧘=meditation, 💧/🚰=water, 🏃=running/exercise
- CRITICAL: habit_name MUST be the EXACT string from USER'S TRACKED HABITS above, character-for-character including punctuation, capitalization, and question marks. Do NOT paraphrase, shorten, or rephrase the habit name. Copy it verbatim.
- Only match habits from the list above
- "8 glasses" but tracks "oz" → ask oz per glass
- Ambiguous match → ask which habit
- Metric habit + "did it" → ask for number
- If user sets or changes a goal/target (e.g., "I want to drink 80 oz"), return it in goal_updates — NOT in habits
- goal_updates is for changing the target, habits is for logging today's value
- Unrelated message → understood: false
- CRITICAL: If the user is ASKING about their habits (e.g., "what are my habits?", "tell me my habits", "which habits do I have?") rather than LOGGING a habit, return understood: false. Questions about habits are not habit entries.
- Similarly, if the user asks for tips, advice, motivation, or information, return understood: false. Only return understood: true when the user is reporting that they did or didn't do a habit.
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
        // Force valid JSON so a non-JSON reply can't break the JSON.parse below.
        // Requires "JSON" in the prompt (present: "Respond with JSON only").
        response_format: { type: 'json_object' },
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
  userContextPrompt?: string
): Promise<{ response: string; flagForHumanCoach: boolean; flagReason: string | null }> {
  const fallback = {
    response: `Hey ${firstName}, I hear you. I'm here if you want to talk — or just text your habits when you're ready.`,
    flagForHumanCoach: false,
    flagReason: null,
  }

  if (!OPENAI_API_KEY) return fallback

  try {
    const contextBlock = userContextPrompt || `USER: ${firstName}`

    // Shared coaching brain: voice (from SUMMIT_COACH_VOICE.md) + MI method +
    // clinical guardrail + any condition slices relevant to this user. We pass
    // the formatted context as the haystack so topic slices (e.g. hypertension
    // for a healthy-hearts user) get selected from their vision/habits/challenge.
    const coachingKnowledge = coachKnowledgeBlock(contextBlock)

    const systemPrompt = `You are Summit, a warm and grounded health coach. The user sent a message that isn't about habit tracking. Respond with empathy and brevity. Use their background to make your response personal and relevant — reference their vision, recent patterns, or reflections when it fits naturally. Don't force it.

${coachingKnowledge}

RULES:
- CRITICAL: You CANNOT log, track, save, or record habits from this response — that pipeline already ran and decided this message wasn't a tracking entry. NEVER use words like "logged", "tracked", "recorded", "saved", "noted", or any phrase implying you wrote their habit to the system (e.g. "got that down", "marked complete"). If they say they did something, acknowledge their effort but DO NOT claim it was tracked. If you think they meant to log a habit, tell them to reply with the habit name + value or text the habit directly.
- CRITICAL: If the user asks for a link, URL, or to "go to" / "open" / "show me" / "link me to" any page (dashboard, habits, vision, reflection, guides, coaching, challenges, profile, pricing), respond ONLY with a brief one-liner and the exact URL from SUMMIT LINKS below. Do NOT add coaching suggestions, vision references, or other content. ALWAYS prefix URLs with https:// so they are clickable in SMS. Example: "Here's your dashboard: https://go.summithealth.app/dashboard"
- CRITICAL: If the user asks a question (e.g., "what are my habits?", "can you give me tips?"), answer it fully in your response. Never give a teaser like "Here are your habits!" without listing them. The user cannot see a follow-up — every SMS must be self-contained.
- If the user asks about their habits, list them by name from their background context. Include streaks and completion rates when available.
- If the user asks "how am I doing?" or about progress, reference their completion rates, streaks, and recent reflections from their background context.
- If the user asks for tips or advice on a specific habit, give 1-2 specific, actionable tips in the response itself.
- If the user asks a "how do I...?" question about Summit features, answer using the SUMMIT FAQ below.
- If the message is simple/conversational (e.g., "thank you", "that's great", "ok", "cool", "thanks"), reply with a brief warm acknowledgment (under 50 chars). Don't offer suggestions or ask questions — just land the moment.
- For substantive messages: validate what they said, offer 1-2 brief concrete options (not commands)
- Stay under 480 characters total — this is SMS, but completeness matters more than brevity
- No "great job", no "keep it up" (emoji guidance is in the VOICE & METHOD block below)
- Be warm but real. Don't sound like an app notification.
- If the user seems distressed, frustrated, or wanting to quit, set flag_for_human_coach to true

HELPING WITH HABITS:
- When the user asks for help with a habit, help directly first: give 1-2 specific, actionable tips and share a relevant guide link from AVAILABLE GUIDES if one matches the topic.
- If you can see from RECENT SMS that this is the 3rd+ exchange on the SAME struggle, OR the user signals deeper frustration ("I've tried everything", "I can't seem to", "I don't know what to do"), suggest a coaching session.
- If SUBSCRIPTION shows coaching sessions remaining: "This sounds like a great topic for a coaching session with Coach Eric. You've got one available — book at go.summithealth.app/coaching"
- If NO coaching sessions available (core tier or sessions used up): still suggest coaching as a valuable next step, and mention upgrading. Say something like: "A coaching session would be perfect for working through this. Upgrade to Plus for monthly 1-on-1 time with Coach Eric — go.summithealth.app/pricing"
- Suggest coaching at most once per topic. If they don't take it, respect that and keep helping with tips.
SMART ROUTING — when you detect intent that matches an existing feature, route the user there instead of trying to handle it yourself:
- Wants to add a new habit → "Text ADD to set up a new habit right here. Summit will help you define it and get it on your schedule."
- Feeling overwhelmed, wants to reduce or simplify a habit → "Text BACKUP and Summit will suggest a more manageable plan for any habit."
- Wants to hide or clean up old challenge habits → "Text ARCHIVE to tidy up habits from a completed challenge."
- Wants to change their schedule, days, or reminder times → "You can adjust your schedule in the app at go.summithealth.app/habits"
- Wants to start a challenge → "Check out the challenges at go.summithealth.app/challenges — there are 5 to choose from."
- Wants to see their progress or weekly summary → "Your weekly digest has all your stats. You can also check go.summithealth.app/guides for your latest one."
- Wants to cancel or quit a habit → suggest BACKUP first ("Before removing it, text BACKUP — sometimes a smaller version of the habit is all you need"). Only mention go.summithealth.app/habits for full removal.
- Wants to talk to someone / wants more support → suggest coaching (follow HELPING WITH HABITS rules above)

SUMMIT'S APPROACH TO HABITS (use when the user asks how Summit works, how to build habits, what makes Summit different, or what the philosophy/approach is):
Summit helps habits stick through 8 principles:
1. Right-sized to your reality — AI tailors habits to the time you actually have and areas you care about, so you start with something doable.
2. Anchored to your vision — every habit connects to the health vision you defined, so on hard days you remember what you're building toward.
3. Prompted at the right moments — reminders and followups arrive when you said you'd be available, not at arbitrary times.
4. Reflection builds self-awareness — weekly reflections help you notice patterns, catch friction early, and evolve your approach.
5. Adjusting beats quitting — text BACKUP to downshift a habit instead of abandoning it. Pivoting is the skill that makes habits last.
6. Coaching tone, not policing — Summit encourages without guilt-tripping. Supportive but accountable.
7. Knowledge fills the gaps — personalized weekly digests deliver research-backed resources matched to your specific habits.
8. Human connection when you need it — AI handles daily rhythm, but real coaching sessions with Coach Eric are there for deeper support.
The bottom line: habits stick when they're small enough to start, meaningful enough to care about, and supported enough to survive real life.

${SUMMIT_LINKS}

SUMMIT FAQ (use when the user asks about features):
- Dashboard: Your home base — shows your vision, this week's habits, reflection status, and guides. go.summithealth.app/dashboard
- Habits: View, edit, or archive your habits. You can have up to 5 personal habits. go.summithealth.app/habits
- Add a habit: Text ADD to create a new habit via SMS, or go to go.summithealth.app/add-habit in the app.
- Vision: Your health vision — what you're working toward and why it matters. You can revisit and refine it anytime. go.summithealth.app/vision
- Challenges: 4-week guided programs with one focus area per week. One active challenge at a time. go.summithealth.app/challenges
- BACKUP: Feeling overwhelmed? Text BACKUP to get a suggested reduced plan for any habit.
- Reflections: Every Sunday you'll get a text to reflect on your week. You can also write reflections anytime at go.summithealth.app/reflection
- Guides: Your personalized resource library — articles, videos, and tips from your weekly digest. go.summithealth.app/guides
- Coaching: 1-on-1 sessions with Coach Eric on Plus and Premium plans. go.summithealth.app/coaching. Or book a free intro call: cal.com/summit-health/15min
- Follow-up time: Change when you get daily check-in texts in your Profile under "Habit Preferences." go.summithealth.app/profile-setup
- Subscription: Manage your plan, billing, or cancel at go.summithealth.app/profile-setup — tap "Manage Subscription."
- Cancel/pause SMS: Text STOP anytime to stop all SMS.
- ARCHIVE: Text ARCHIVE to shelve habits from a completed challenge. Restore them anytime from the Habits page.

Respond with JSON only:
{
  "response": "your SMS reply under 480 chars",
  "flag_for_human_coach": true/false,
  "flag_reason": "brief reason if flagged, or null"
}`

    const userPrompt = `${contextBlock}

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
        // Force valid JSON so a conversational/longer coaching reply can't break
        // the hand-rolled JSON.parse below and silently drop to the fallback.
        // Requires the word "JSON" in the prompt (present: "Respond with JSON only").
        response_format: { type: 'json_object' },
        max_tokens: 700,
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

    // Safeguard against phantom logging confirmations. The coaching path cannot
    // write entries — if the model claims it did, replace with a safe ack so we
    // don't mislead the user about what's in their data.
    const PHANTOM_LOG_PATTERN = /\b(logged|tracked|recorded|saved|noted)\b|got (it|that) (down|in)|marked (it )?(complete|done)/i
    if (PHANTOM_LOG_PATTERN.test(coachResponse)) {
      console.warn(`Coaching response contained phantom log language, replacing: "${coachResponse}"`)
      coachResponse = `Hey ${firstName} — I'm here. If you meant to log a habit, reply with the habit name plus how you did (e.g. "walk 30 min" or "yoga done").`
    }

    if (coachResponse.length > 480) {
      coachResponse = coachResponse.slice(0, 477) + '...'
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

  if (pending.pending_type === 'confidence_check') {
    const num = parseInt(trimmed)

    if (isNaN(num) || num < 1 || num > 5) {
      // Re-create the pending clarification so they can try again
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      await supabase.from('sms_pending_clarification').insert({
        user_id: profile.id,
        pending_type: 'confidence_check',
        context,
        expires_at: expiresAt,
      })
      return {
        handled: true,
        response: `Just reply with a number 1-5 (5 = very confident, 1 = not at all).`
      }
    }

    if (num === 5) {
      return {
        handled: true,
        response: `Love the confidence, ${firstName}! You've got a solid plan. I'll check in at your scheduled times to help you stay on track \u{1F4AA}`
      }
    }

    if (num >= 3) {
      return {
        handled: true,
        response: `That's real \u2014 and honestly, a great place to start. If anything feels off this week, text BACKUP and I'll help you adjust. You can also text me anytime for tips on any habit \u{1F4AC}`
      }
    }

    // num is 1 or 2
    return {
      handled: true,
      response: `Totally OK \u2014 the goal isn't perfection, it's finding what fits. Three ways to make this easier:\n\n1. Text BACKUP to simplify any habit\n2. Text me for tips on getting started\n3. Book 15 min with Coach Eric: cal.com/summit-health/15min\n\nYou're not behind \u2014 you're starting \u{1F331}`
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

    // Find user by phone number (prefer non-lite user if multiple profiles share a phone)
    const { data: matchedProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', from)
      .is('deleted_at', null)

    const profile = matchedProfiles && matchedProfiles.length > 0
      ? matchedProfiles.find(p => p.challenge_type !== 'lite') || matchedProfiles[0]
      : null

    if (profileError || !profile) {
      console.log(`❌ No user found for phone ${from}`)
      // Inbound message already logged by twilio-webhook
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    console.log(`✓ Found user: ${profile.id} (${profile.first_name})`)

    const adminHoldActive = profile.admin_sms_hold_until && new Date(profile.admin_sms_hold_until) > new Date()
    if (adminHoldActive) {
      console.log(`⏸ Admin SMS hold active until ${profile.admin_sms_hold_until} — will suppress AI coaching replies but allow habit tracking`)
    }

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

    // STEP 0b: Check for active add-habit session
    const isAddKeyword = upperBody === 'ADD' || upperBody === 'NEW HABIT'
    let hasActiveAddHabitSession = false
    if (!isAddKeyword) {
      const { data: addHabitSession } = await supabase
        .from('sms_add_habit_sessions')
        .select('id')
        .eq('user_id', profile.id)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle()
      hasActiveAddHabitSession = !!addHabitSession
    }

    if (isAddKeyword || hasActiveAddHabitSession) {
      console.log(`Routing to sms-add-habit (keyword: ${isAddKeyword}, active session: ${hasActiveAddHabitSession})`)
      try {
        const addHabitUrl = `${SUPABASE_URL}/functions/v1/sms-add-habit`
        const addHabitRes = await fetch(addHabitUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: new URLSearchParams({ From: from, Body: body }).toString(),
        })
        console.log(`sms-add-habit status: ${addHabitRes.status}`)
      } catch (addError) {
        console.error('Error forwarding to sms-add-habit:', addError)
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Safety net: Check for active reflection session (primary check is in twilio-webhook)
    const { data: reflectionSession } = await supabase
      .from('sms_reflection_sessions')
      .select('id')
      .eq('user_id', profile.id)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle()

    if (reflectionSession) {
      console.log(`Routing to sms-reflection-response (active reflection session) for user ${profile.id}`)
      try {
        const reflectionUrl = `${SUPABASE_URL}/functions/v1/sms-reflection-response`
        const reflectionRes = await fetch(reflectionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: new URLSearchParams({ From: from, Body: body }).toString(),
        })
        console.log(`sms-reflection-response status: ${reflectionRes.status}`)
      } catch (reflectionError) {
        console.error('Error forwarding to sms-reflection-response:', reflectionError)
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
    // Look back 24 hours (not just today) so overnight replies still match
    // ============================================
    const lookbackTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentFollowup } = await supabase
      .from('sms_followup_log')
      .select('*')
      .eq('user_id', profile.id)
      .gte('sent_at', lookbackTime)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Only treat this inbound as a follow-up answer if the follow-up question is
    // the MOST RECENT thing Summit said. If we've exchanged messages since (e.g.
    // a coaching conversation), a bare "no"/"yes"/number belongs to that thread,
    // not to an hours-old habit prompt — let it fall through to coaching.
    // (Chains still work: the latest chained follow-up IS the last thing said.)
    let followupIsLastThingSaid = false
    if (recentFollowup) {
      const { data: lastOutbound } = await supabase
        .from('sms_messages')
        .select('body')
        .eq('user_id', profile.id)
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      followupIsLastThingSaid =
        (lastOutbound?.body || '').trim() === (recentFollowup.message_sent || '').trim()
      if (!followupIsLastThingSaid) {
        console.log(`Followup for "${recentFollowup.habit_name}" exists but Summit has spoken since — treating "${body.slice(0, 40)}" as conversation, not a habit answer`)
      }
    }

    if (recentFollowup && followupIsLastThingSaid) {
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
          // Log entry for the date the followup was about (in user's timezone, not UTC)
          let followupDate = todayStr
          if (recentFollowup.sent_at) {
            try {
              const sentDate = new Date(recentFollowup.sent_at)
              const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: userTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
              followupDate = formatter.format(sentDate)
            } catch {
              followupDate = recentFollowup.sent_at.split('T')[0]
            }
          }
          const entryData: Record<string, unknown> = {
            user_id: profile.id,
            habit_name: recentFollowup.habit_name,
            entry_date: followupDate,
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

    // If admin hold is active, suppress AI coaching/smart-parse replies
    // (Steps 1 & 2 above still handle direct habit tracking responses)
    if (adminHoldActive) {
      console.log(`⏸ Admin SMS hold — suppressing AI reply for unrecognized message`)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    console.log('No followup context - attempting smart parse')

    // Load full user context for AI calls
    const userContext = await loadUserContext(supabase, profile.id, profile.timezone)
    const userContextPrompt = formatContextForPrompt(userContext)

    // Get tracking configs for ACTIVE (non-archived) habits only.
    // Configs for archived habits hang around in the table and would otherwise
    // pollute the AI's habit menu, leading to misidentified logs.
    const [configsRes, activeHabitsRes] = await Promise.all([
      supabase
        .from('habit_tracking_config')
        .select('*')
        .eq('user_id', profile.id)
        .eq('tracking_enabled', true),
      supabase
        .from('weekly_habits')
        .select('habit_name')
        .eq('user_id', profile.id)
        .is('archived_at', null),
    ])
    const activeHabitNames = new Set((activeHabitsRes.data || []).map((h: { habit_name: string }) => h.habit_name))
    const allConfigs = (configsRes.data || []).filter(c => activeHabitNames.has(c.habit_name))

    if (allConfigs.length === 0) {
      console.log('No active tracking configs - routing to coaching fallback')
      const coachResult = await generateCoachingResponse(body, firstName, userContextPrompt)
      await sendSMSWithLog(from, coachResult.response, supabase, profile.id, userName, 'coach')

      if (coachResult.flagForHumanCoach) {
        await handleCoachFlag(supabase, profile.id, from, userName, body, coachResult.response, coachResult.flagReason)
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Use OpenAI to smart-parse the message
    const parseResult = await smartParseMessage(body, firstName, allConfigs, userContextPrompt)

    if (!parseResult.understood || parseResult.habits.length === 0) {
      console.log('Smart parse: message not understood as habit logging - routing to coaching')
      const coachResult = await generateCoachingResponse(body, firstName, userContextPrompt)
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

      // Log the habit entry — skip if value is null (user didn't actually report doing it)
      const config = findHabitConfig(allConfigs, habit.habit_name)
      if (!config) continue
      if (habit.value === null || habit.value === undefined) continue
      // Use the matched config's actual habit_name (AI may have paraphrased)
      const matchedHabitName = config.habit_name

      const entryData: Record<string, unknown> = {
        user_id: profile.id,
        habit_name: matchedHabitName,
        entry_date: todayStr,
        entry_source: 'sms',
        updated_at: new Date().toISOString(),
      }

      // Coerce value type to the config's actual tracking_type — the AI sometimes
      // returns boolean for a metric habit (e.g. "yes I did" without a number).
      if (config.tracking_type === 'boolean') {
        entryData.completed = typeof habit.value === 'boolean' ? habit.value : habit.value !== 0
        entryData.metric_value = null
      } else {
        if (typeof habit.value === 'number') {
          entryData.completed = null
          entryData.metric_value = habit.value
        } else if (habit.value === true) {
          // User said yes/done for a metric habit — log as completed without a number
          entryData.completed = true
          entryData.metric_value = null
        } else {
          entryData.completed = false
          entryData.metric_value = null
        }
      }

      const { error } = await supabase
        .from('habit_tracking_entries')
        .upsert(entryData, { onConflict: 'user_id,habit_name,entry_date' })

      if (!error) {
        loggedHabits.push(matchedHabitName)
      } else {
        console.error(`Failed to upsert entry for "${matchedHabitName}":`, error)
      }
    }

    // Process goal updates (e.g., "I want to drink 80 oz of water a day")
    const updatedGoals: string[] = []
    if (parseResult.goal_updates?.length) {
      for (const update of parseResult.goal_updates) {
        const updateData: Record<string, unknown> = {}
        if (update.metric_target !== undefined) updateData.metric_target = update.metric_target
        if (update.metric_unit) updateData.metric_unit = update.metric_unit

        if (Object.keys(updateData).length > 0) {
          // Resolve AI-returned name back to a real config (handles paraphrases)
          const goalConfig = findHabitConfig(allConfigs, update.habit_name)
          if (!goalConfig) continue

          const { error } = await supabase
            .from('habit_tracking_config')
            .update(updateData)
            .eq('user_id', profile.id)
            .eq('habit_name', goalConfig.habit_name)

          if (!error) {
            updatedGoals.push(goalConfig.habit_name)
            console.log(`Updated goal for "${goalConfig.habit_name}": ${JSON.stringify(updateData)}`)
          } else {
            console.error(`Error updating goal for "${goalConfig.habit_name}":`, error)
          }
        }
      }
    }

    // Send response
    if (needsClarification && clarificationQuestion) {
      await sendSMSWithLog(from, clarificationQuestion, supabase, profile.id, userName)
    } else if (loggedHabits.length > 0 || updatedGoals.length > 0) {
      const response = parseResult.friendly_response ||
        (loggedHabits.length === 1
          ? `Logged ${loggedHabits[0]} ✓`
          : loggedHabits.length > 1
            ? `Logged ${loggedHabits.length} habits ✓`
            : `Updated goal for ${updatedGoals[0]} ✓`)
      await sendSMSWithLog(from, response, supabase, profile.id, userName)
    } else {
      // Smart parse returned habits but none had values (e.g., user asked a question)
      // Fall through to coaching response
      console.log('Smart parse matched habits but no values logged - routing to coaching')
      const coachResult = await generateCoachingResponse(body, firstName, userContextPrompt)
      await sendSMSWithLog(from, coachResult.response, supabase, profile.id, userName, 'coach')

      if (coachResult.flagForHumanCoach) {
        await handleCoachFlag(supabase, profile.id, from, userName, body, coachResult.response, coachResult.flagReason)
      }
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
  profile: { id: string; first_name: string; timezone: string; tracking_followup_time?: string | null },
  phone: string,
  userName: string | null,
  todayStr: string,
  userTimezone: string
) {
  try {
    // Don't chain followups outside the user's followup window.
    // A late reply (e.g. midnight reply to an 8pm prompt) shouldn't trigger
    // new prompts while the user is asleep.
    const trackingFollowupTime = profile.tracking_followup_time || '17:00:00'
    const [followupHour, followupMinute] = trackingFollowupTime.split(':').map(Number)
    const followupMinutes = followupHour * 60 + followupMinute

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
    const parts = timeFormatter.formatToParts(new Date())
    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    const currentMinutes = currentHour * 60 + currentMinute

    // Normalize for midnight wrap-around so late-evening followup_times still work
    let minutesFromFollowup = currentMinutes - followupMinutes
    if (minutesFromFollowup < -720) minutesFromFollowup += 1440
    if (minutesFromFollowup > 720) minutesFromFollowup -= 1440

    // Lower bound: don't chain before the followup window opens.
    if (minutesFromFollowup < -15) {
      console.log(`Skipping chain — before followup window (${minutesFromFollowup} min from ${trackingFollowupTime})`)
      return
    }
    // Upper bound: never send a chained prompt after 11pm local, regardless of
    // when the user's followup time is. An absolute bedtime ceiling is correct
    // for any followup_time (a relative offset would let a late followup_time
    // chain past midnight).
    if (currentHour >= 23) {
      console.log(`Skipping chain — past 11pm local (${currentHour}:${currentMinute})`)
      return
    }

    const dayOfWeek = getDayOfWeekInTimezone(userTimezone)

    // Get all active (non-archived) habits scheduled for today
    const { data: todayHabits } = await supabase
      .from('weekly_habits')
      .select('habit_name')
      .eq('user_id', profile.id)
      .eq('day_of_week', dayOfWeek)
      .is('archived_at', null)

    if (!todayHabits || todayHabits.length === 0) return

    // Get all tracking configs that are enabled
    const { data: allTrackingConfigs } = await supabase
      .from('habit_tracking_config')
      .select('*')
      .eq('user_id', profile.id)
      .eq('tracking_enabled', true)

    if (!allTrackingConfigs || allTrackingConfigs.length === 0) return

    // Check entries for BOTH today (user timezone) and the UTC date to handle timezone edge cases
    const nowUtcDate = new Date().toISOString().split('T')[0]
    const datesToCheck = [todayStr]
    if (nowUtcDate !== todayStr) datesToCheck.push(nowUtcDate)

    const { data: existingEntries } = await supabase
      .from('habit_tracking_entries')
      .select('habit_name, completed, metric_value')
      .eq('user_id', profile.id)
      .in('entry_date', datesToCheck)

    const habitsWithEntries = new Set(
      (existingEntries || [])
        .filter(e => e.completed !== null || e.metric_value !== null)
        .map(e => e.habit_name)
    )

    // Also check followup log — don't re-ask habits already asked in last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data: recentFollowups } = await supabase
      .from('sms_followup_log')
      .select('habit_name')
      .eq('user_id', profile.id)
      .gte('sent_at', twoHoursAgo)

    const habitsAlreadyAsked = new Set((recentFollowups || []).map(f => f.habit_name))

    // Find habits that need followup (no entry AND not already asked recently)
    const habitsNeedingFollowup = todayHabits.filter(habit =>
      allTrackingConfigs.some(config => config.habit_name === habit.habit_name) &&
      !habitsWithEntries.has(habit.habit_name) &&
      !habitsAlreadyAsked.has(habit.habit_name)
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
