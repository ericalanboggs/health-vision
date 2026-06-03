import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface VisionForm {
  visionStatement?: string
  whyMatters?: string
  feelingState?: string
  futureAbilities?: string
  barriersNotes?: string
  nonNegotiables?: string
  energizers?: string
  strengths?: string
  motivationDrivers?: string[]
  readiness?: number
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json().catch(() => ({}))
    const userId: string | undefined = body.userId
    if (!userId) throw new Error('userId required')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // --- Profile ---
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone, timezone, created_at, subscription_tier, sms_opt_in')
      .eq('id', userId)
      .maybeSingle()
    if (!profile) throw new Error(`Profile not found for user ${userId}`)

    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'this member'

    // --- Vision ---
    const { data: journey } = await supabase
      .from('health_journeys')
      .select('form_data')
      .eq('user_id', userId)
      .maybeSingle()
    const vision: VisionForm = (journey?.form_data as VisionForm) || {}

    // --- Active habits ---
    const { data: habitRows } = await supabase
      .from('weekly_habits')
      .select('habit_name, day_of_week, time_of_day, reminder_time')
      .eq('user_id', userId)
      .is('archived_at', null)

    const habitMap = new Map<string, { days: Set<number>; time: string | null }>()
    for (const h of habitRows || []) {
      if (!habitMap.has(h.habit_name)) habitMap.set(h.habit_name, { days: new Set(), time: h.time_of_day || h.reminder_time || null })
      habitMap.get(h.habit_name)!.days.add(h.day_of_week)
    }
    const habits = Array.from(habitMap.entries()).map(([habitName, v]) => ({
      name: habitName,
      days: Array.from(v.days).sort().map(d => DAY_LABELS[d]),
      time: v.time,
    }))

    // --- Reflections (most recent first) ---
    const { data: reflections } = await supabase
      .from('weekly_reflections')
      .select('week_number, went_well, friction, adjustment, app_feedback, created_at')
      .eq('user_id', userId)
      .order('week_number', { ascending: false })

    // --- SMS conversation (messages + reminders, merged chronologically) ---
    const [{ data: messages }, { data: reminders }] = await Promise.all([
      supabase
        .from('sms_messages')
        .select('direction, body, created_at, twilio_sid')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('sms_reminders')
        .select('message, sent_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    const normalizedReminders = (reminders || []).map((r: any) => ({
      direction: 'outbound' as const,
      body: r.message,
      created_at: r.sent_at || r.created_at,
      twilio_sid: null,
    }))
    const seen = new Set<string>()
    const conversation = [...(messages || []), ...normalizedReminders]
      .filter((m: any) => {
        if (!m.twilio_sid) return true
        if (seen.has(m.twilio_sid)) return false
        seen.add(m.twilio_sid)
        return true
      })
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    // --- Build the transcript text ---
    const tz = profile.timezone || 'America/Chicago'
    const fmtDate = (iso: string) => {
      try {
        return new Date(iso).toLocaleString('en-US', {
          timeZone: tz, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })
      } catch { return iso }
    }
    const transcriptLines = conversation.map((m: any) => {
      const who = m.direction === 'inbound' ? name.split(' ')[0] : 'Summit'
      return `[${fmtDate(m.created_at)}] ${who}: ${(m.body || '').replace(/\s+/g, ' ').trim()}`
    })

    // Trim the transcript fed to the AI to the most recent ~80 messages to control tokens.
    const transcriptForAI = transcriptLines.slice(-80).join('\n') || '(No SMS conversation yet.)'

    const reflectionSummary = (reflections || []).map((r: any) =>
      `Week ${r.week_number}:\n- Went well: ${r.went_well || '—'}\n- Friction: ${r.friction || '—'}\n- Adjustment: ${r.adjustment || '—'}`
    ).join('\n\n') || '(No reflections yet.)'

    const habitsSummary = habits.length
      ? habits.map(h => `- ${h.name} (${h.days.join('/') || 'no days set'}${h.time ? `, ${h.time}` : ''})`).join('\n')
      : '(No active habits.)'

    const motivationDrivers = Array.isArray(vision.motivationDrivers) ? vision.motivationDrivers.join(', ') : ''

    // --- Build the AI prompt ---
    const prompt = `You are an experienced health and habit coach preparing for a live 1:1 coaching session with a member. Below is everything we know about them. Write a concise, session-ready coaching brief in Markdown that lets the coach walk in fully prepared.

MEMBER: ${name}
TIMEZONE: ${tz}
SUBSCRIPTION: ${profile.subscription_tier || 'none'}

THEIR VISION:
- Vision statement: ${vision.visionStatement || '—'}
- Why it matters: ${vision.whyMatters || '—'}
- How they want to feel: ${vision.feelingState || '—'}
- Future abilities they want: ${vision.futureAbilities || '—'}
- Barriers they named: ${vision.barriersNotes || '—'}
- Non-negotiables (don't touch): ${vision.nonNegotiables || '—'}
- What energizes them: ${vision.energizers || '—'}
- Strengths / what's working: ${vision.strengths || '—'}
- Motivation drivers: ${motivationDrivers || '—'}
- Readiness (1-5): ${vision.readiness ?? '—'}

ACTIVE HABITS:
${habitsSummary}

WEEKLY REFLECTIONS (most recent first):
${reflectionSummary}

RECENT SMS CONVERSATION (chronological, oldest to newest):
${transcriptForAI}

Write the brief with these Markdown sections, in this order:

## Snapshot
2-3 sentences: who they are, where they are in their journey, and the headline thing the coach should know walking in.

## How to Coach Them
Their readiness level and what coaching tone/approach fits. What energizes them and what to lean on. Be specific and tactical.

## Their Vision & What's Driving Them
Summarize their vision and the deeper "why." Connect it to what they say they want to feel.

## Progress & Patterns
What you notice across their reflections, habits, and SMS exchanges. Name real patterns — momentum, stalls, recurring friction. Cite specifics.

## What's Working / What's Getting in the Way
Two short bulleted lists.

## Don't Touch
Their non-negotiables and anything the coach should avoid pushing on.

## Open the Session With
3-4 specific, warm questions or talking points the coach can use to start the conversation, grounded in what's actually going on for this person.

Be warm, observant, and specific — never generic. Use real details from their data. If data is missing, say so briefly rather than inventing. Return ONLY the Markdown brief, no preamble.`

    // --- Call OpenAI ---
    let brief = ''
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert health and habit coach who writes sharp, specific, session-ready coaching briefs. You never pad with filler and you always cite concrete details from the member\'s data.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.6,
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`OpenAI API error: ${err}`)
      }
      const data = await res.json()
      brief = (data.choices?.[0]?.message?.content || '').trim()
      if (brief.startsWith('```')) {
        brief = brief.replace(/^```(?:markdown)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }
    } catch (aiErr) {
      console.error('AI brief generation failed:', aiErr)
      brief = '> AI summary could not be generated. The raw data below is still complete.'
    }

    // --- Assemble the full Markdown document ---
    const today = new Date().toLocaleDateString('en-US', {
      timeZone: tz, year: 'numeric', month: 'long', day: 'numeric',
    })

    const contactLines = [
      profile.email ? `**Email:** ${profile.email}` : null,
      profile.phone ? `**Phone:** ${profile.phone}` : null,
      `**Timezone:** ${tz}`,
      profile.subscription_tier ? `**Plan:** ${profile.subscription_tier}` : null,
    ].filter(Boolean).join('  •  ')

    const transcriptBlock = transcriptLines.length
      ? transcriptLines.join('\n')
      : '(No SMS conversation on record.)'

    const markdown = `# Coaching Brief — ${name}

${contactLines}

_Generated ${today}_

---

${brief}

---

## Appendix: Full SMS Transcript

\`\`\`
${transcriptBlock}
\`\`\`
`

    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'member'
    const filename = `coaching-brief-${safeName}.md`

    return json({ success: true, markdown, filename })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('export-coaching-brief error:', msg)
    return json({ success: false, error: msg }, 500)
  }
})
