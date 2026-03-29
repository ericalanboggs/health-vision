import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS as _sendSMS } from '../_shared/sms.ts'
import { loadUserContext, formatContextForPrompt } from '../_shared/user_context.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

/** Convenience wrapper matching the sms-backup-plan call signature */
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
 * Call OpenAI and return the raw content string
 */
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
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
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('OpenAI API error:', response.status, errText)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Parse JSON from OpenAI response, stripping markdown code blocks if present
 */
function parseJSON(content: string): any {
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  }
  return JSON.parse(jsonStr)
}

/**
 * Generate a conversational follow-up based on the reflection thread so far
 */
async function generateFollowUp(
  context: SessionContext,
  exchangeCount: number,
  userContextPrompt?: string
): Promise<string> {
  const conversationHistory = context.messages
    .map(m => `${m.role === 'assistant' ? 'Summit' : 'User'}: ${m.content}`)
    .join('\n')

  let focusInstruction: string
  if (exchangeCount === 0) {
    focusInstruction = `The user just shared how their week went. Acknowledge what they said warmly, then ask about what was challenging or didn't go as planned this week. Be specific — reference their vision, habits, or past reflections when relevant.`
  } else {
    focusInstruction = `The user just shared what was challenging. Acknowledge it empathetically, then ask what they want to adjust or try differently next week. Mention that their weekly guides will connect to what they share here. Reference their past adjustments or patterns if relevant.`
  }

  const backgroundBlock = userContextPrompt
    ? `\nUSER BACKGROUND:\n${userContextPrompt}\n`
    : ''

  const systemPrompt = `You are Summit, a warm and supportive health habit coach having a natural SMS conversation during a weekly reflection. Keep responses under 280 characters (SMS-friendly). Be conversational, not clinical. No emojis overload — one max if natural.

${focusInstruction}
${backgroundBlock}
Respond with ONLY the SMS message text — no JSON, no formatting.`

  const userPrompt = `Conversation so far:\n${conversationHistory}\n\nGenerate your next response.`

  try {
    const reply = await callOpenAI(systemPrompt, userPrompt, 0.7, 200)
    return reply.trim()
  } catch (error) {
    console.error('Error generating follow-up:', error)
    if (exchangeCount === 0) {
      return "Thanks for sharing that. What felt challenging or didn't go as planned this week?"
    }
    return "Got it. What would you like to adjust or try differently next week?"
  }
}

/**
 * Parse the full reflection conversation into structured fields
 */
async function parseReflection(
  context: SessionContext,
  userContextPrompt?: string
): Promise<{ went_well: string; friction: string; adjustment: string }> {
  const conversationHistory = context.messages
    .map(m => `${m.role === 'assistant' ? 'Summit' : 'User'}: ${m.content}`)
    .join('\n')

  const systemPrompt = `You are parsing a weekly health habit reflection conversation into structured fields. Extract the key themes from the user's messages (ignore the coach's messages — they're just prompts).

Respond with JSON only:
{
  "went_well": "Summary of what went well this week (1-3 sentences, from the user's perspective)",
  "friction": "Summary of challenges or friction (1-3 sentences, from the user's perspective)",
  "adjustment": "What the user wants to adjust or try next week (1-3 sentences)"
}

If a field wasn't discussed or the user was vague, write a brief summary based on what they did say. Never leave a field empty — at minimum write "Not discussed" but try to infer from context.`

  const backgroundBlock = userContextPrompt
    ? `\nUSER BACKGROUND:\n${userContextPrompt}\n`
    : ''

  const userPrompt = `${backgroundBlock}Opener context: ${context.opener_message}\n\nConversation:\n${conversationHistory}`

  try {
    const content = await callOpenAI(systemPrompt, userPrompt, 0.3, 500)
    return parseJSON(content)
  } catch (error) {
    console.error('Error parsing reflection:', error)
    // Extract raw user messages as fallback
    const userMessages = context.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
    return {
      went_well: userMessages[0] || 'Not discussed',
      friction: userMessages[1] || 'Not discussed',
      adjustment: userMessages[2] || 'Not discussed',
    }
  }
}

/**
 * Generate a warm wrap-up message that ties into the weekly digest
 */
async function generateWrapUp(
  context: SessionContext,
  parsedReflection: { went_well: string; friction: string; adjustment: string },
  userContextPrompt?: string
): Promise<string> {
  const backgroundBlock = userContextPrompt
    ? `\nUSER BACKGROUND:\n${userContextPrompt}\n`
    : ''

  const systemPrompt = `You are Summit, a warm health habit coach wrapping up a weekly SMS reflection. Write a closing message that:
1. Briefly acknowledges what the user shared (1 line)
2. Mentions that their weekly guides/resources will connect to what they want to work on
3. Ends with encouragement for the week ahead — tie it back to their vision if natural
Keep it under 280 characters (SMS). Conversational, not clinical. One emoji max if natural.

Respond with ONLY the SMS message text.`

  const userPrompt = `${backgroundBlock}What went well: ${parsedReflection.went_well}
What was hard: ${parsedReflection.friction}
What they want to adjust: ${parsedReflection.adjustment}`

  try {
    const reply = await callOpenAI(systemPrompt, userPrompt, 0.7, 200)
    return reply.trim()
  } catch (error) {
    console.error('Error generating wrap-up:', error)
    return "Great reflection! I'll make sure your guides this week connect to what you shared. Have an awesome week ahead."
  }
}

interface SessionContext {
  opener_message: string
  messages: Array<{ role: 'assistant' | 'user'; content: string }>
  exchange_count: number
  tracking_data: Record<string, any> | null
  challenge_context: { slug: string; week: number } | null
  habit_names: string[]
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

    console.log(`=== SMS REFLECTION RESPONSE ===`)
    console.log(`From: ${from}`)
    console.log(`Body: "${body}"`)

    if (!from || !body) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Look up user by phone
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', from)
      .is('deleted_at', null)

    if (profileError || !profiles || profiles.length === 0) {
      console.log(`No user found for phone ${from}`)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Prefer non-lite user (matches twilio-webhook pattern)
    const profile = profiles.find(p => p.challenge_type !== 'lite') || profiles[0]
    const firstName = profile.first_name || 'there'
    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null

    // Check admin SMS hold — suppress AI replies during hold
    if (profile.admin_sms_hold_until && new Date(profile.admin_sms_hold_until) > new Date()) {
      console.log(`Admin SMS hold active for user ${profile.id}, skipping reflection reply`)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Load active reflection session
    const { data: session, error: sessionError } = await supabase
      .from('sms_reflection_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError || !session) {
      console.log(`No active reflection session for user ${profile.id}`)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const context = session.context as SessionContext

    // Load full user context for richer AI responses
    const userContext = await loadUserContext(supabase, profile.id, profile.timezone)
    const userContextPrompt = formatContextForPrompt(userContext)

    // Add the user's message to the conversation
    context.messages.push({ role: 'user', content: body.trim() })

    // ============================================
    // CONTINUE: exchange_count < 2 — keep conversing
    // ============================================
    if (context.exchange_count < 2) {
      console.log(`Reflection exchange ${context.exchange_count + 1}/3 for user ${profile.id}`)

      const followUp = await generateFollowUp(context, context.exchange_count, userContextPrompt)

      // Add AI response to conversation
      context.messages.push({ role: 'assistant', content: followUp })
      context.exchange_count += 1

      // Update session
      await supabase
        .from('sms_reflection_sessions')
        .update({
          step: 'conversing',
          context,
        })
        .eq('id', session.id)

      await sendSMS(from, followUp, supabase, profile.id, userName)

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ============================================
    // WRAP UP: exchange_count >= 2 — parse and save
    // ============================================
    console.log(`Wrapping up reflection for user ${profile.id}`)

    // Parse the full conversation into structured fields
    const parsedReflection = await parseReflection(context, userContextPrompt)
    console.log('Parsed reflection:', JSON.stringify(parsedReflection))

    // Upsert to weekly_reflections (handles both new and overwrite of web submission)
    const { error: upsertError } = await supabase
      .from('weekly_reflections')
      .upsert(
        {
          user_id: profile.id,
          week_number: session.week_number,
          went_well: parsedReflection.went_well,
          friction: parsedReflection.friction,
          adjustment: parsedReflection.adjustment,
          source: 'sms',
        },
        { onConflict: 'user_id,week_number' }
      )

    if (upsertError) {
      console.error('Error upserting weekly_reflections:', upsertError)
    } else {
      console.log(`Saved reflection for user ${profile.id}, week ${session.week_number}`)
    }

    // Generate and send wrap-up message
    const wrapUpMessage = await generateWrapUp(context, parsedReflection, userContextPrompt)
    await sendSMS(from, wrapUpMessage, supabase, profile.id, userName)

    // Clean up session
    await supabase
      .from('sms_reflection_sessions')
      .delete()
      .eq('id', session.id)

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )

  } catch (error) {
    console.error('Error in sms-reflection-response:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
})
