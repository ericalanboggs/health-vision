/**
 * sms-motivation-checkin
 * ──────────────────────
 * Inbound handler for Motivation Mode replies. Routed here by twilio-webhook when the
 * user has an active check-in session OR is in motivation_mode (no session).
 *
 * Session state machine (mirrors sms-reflection-response):
 *   awaiting_ruler   → parse 1–10 (non-numeric → one re-prompt) → awaiting_feedback
 *   awaiting_feedback→ store feedback + write motivation_checkins → handoff? → awaiting_handoff | done
 *   awaiting_handoff → YES → clear motivation_mode + kick off ADD flow ; else warm close
 *
 * No active session (motivation_mode user replying to a daily card):
 *   "ready" intent → offer the habit (open awaiting_handoff session)
 *   otherwise      → log feedback on the last sent item + warm ack
 *
 * Handoff fires when readiness ≥ 7 on two consecutive check-ins, OR the user raises
 * their hand early. Inbound is logged by twilio-webhook; outbound here logs to sms_messages.
 *
 * Deploy with --no-verify-jwt (called internally by twilio-webhook).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS as _sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const READY_THRESHOLD = 7

async function callOpenAI(system: string, userPrompt: string, temperature: number, maxTokens: number): Promise<string> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: system }, { role: 'user', content: userPrompt }],
      max_tokens: maxTokens, temperature,
    }),
  })
  if (!r.ok) throw new Error(`OpenAI ${r.status}`)
  const d = await r.json()
  return d.choices?.[0]?.message?.content || ''
}

/**
 * A short, warm, VARIED reply to a casual or feedback text (replaces the old single
 * canned ack that repeated verbatim). Falls back to a small varied pool on any error.
 */
async function generateAck(userMessage: string, firstName: string, lastTitle: string | null): Promise<string> {
  const fallbacks = [
    `You got it, ${firstName} 🙌`,
    `Anytime — more good stuff on the way 🌿`,
    `Glad that one landed ☀️`,
    `💚 Be good to yourself today, ${firstName}.`,
  ]
  try {
    const system = [
      'You are Summit, a warm habit coach, replying to a user in "Motivation Mode" (they get a daily piece of',
      'inspiration, never pressure). Write ONE short SMS reply (max ~160 chars), warm and human, matching their',
      'energy. At most 1 tasteful emoji. If they just said thanks / nice, keep it light and VARIED (e.g.',
      '"You got it 🙌"). If they shared real feedback, warmly acknowledge you\'ll fold it in. NEVER use a stock',
      '"noted, keep an eye out" phrase. Vary your wording every time.',
    ].join('\n')
    const userPrompt = `User (${firstName}) texted: "${userMessage}".` + (lastTitle ? ` Last thing we sent them: "${lastTitle}".` : '')
    const out = (await callOpenAI(system, userPrompt, 0.85, 80)).trim()
    return out || fallbacks[Math.floor(Math.random() * fallbacks.length)]
  } catch (_e) {
    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  }
}

function parseRuler(body: string): number | null {
  const m = body.match(/\b(10|[1-9])\b/)
  return m ? parseInt(m[1]) : null
}
function isAffirmative(body: string): boolean {
  return /\b(yes|yep|yeah|yup|sure|ok|okay|sounds good|let'?s|i'?m in|ready|do it)\b/i.test(body)
}
function isReadyIntent(body: string): boolean {
  return /\b(ready|let'?s do|let'?s go|i'?m in|start (a )?habit|set (a )?habit|sign me up|i think i'?m ready)\b/i.test(body)
}

function emptyTwiml() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return emptyTwiml()

  try {
    const formData = await req.formData()
    const from = formData.get('From')?.toString() || ''
    const body = (formData.get('Body')?.toString() || '').trim()
    if (!from || !body) return emptyTwiml()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', from)
      .is('deleted_at', null)
    if (!profiles || profiles.length === 0) return emptyTwiml()

    const profile = profiles.find((p: any) => p.challenge_type !== 'lite') || profiles[0]
    const userId = profile.id
    const firstName = profile.first_name || 'there'
    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null

    const send = (msg: string) =>
      _sendSMS({ to: from, body: msg }, {
        supabase,
        logTable: 'sms_messages',
        extra: { user_id: userId, user_name: userName, sent_by_type: 'system' },
      })

    // Load active check-in session (if any)
    const { data: session } = await supabase
      .from('sms_motivation_checkin_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Kick off the existing ADD-habit flow and leave Motivation Mode.
    const startHabitHandoff = async () => {
      await supabase.from('profiles').update({ motivation_mode: false }).eq('id', userId)
      if (session) await supabase.from('sms_motivation_checkin_sessions').delete().eq('id', session.id)
      await send(
        `Love it. Let's set your first small habit together. ` +
        `Reply: ADD <the habit> — e.g. "ADD 10-minute walk after lunch". Keep it tiny on purpose.`
      )
    }

    // ── No active session: motivation_mode user replying to a daily card ─────
    if (!session) {
      if (isReadyIntent(body)) {
        const opener = `Love hearing that, ${firstName}. Want to set one small habit together? Reply YES and we'll start — or NO worries if it's not the moment.`
        await supabase.from('sms_motivation_checkin_sessions').insert({
          user_id: userId,
          step: 'awaiting_handoff',
          context: { exchange_count: 0, messages: [{ role: 'assistant', content: opener }] },
        })
        await send(opener)
        return emptyTwiml()
      }
      // Treat as lightweight feedback on the most recent sent item.
      const { data: lastSent } = await supabase
        .from('motivation_content_queue')
        .select('id, title')
        .eq('user_id', userId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      // Only store as feedback if it's more than a quick pleasantry (keeps the feedback field useful).
      const isPleasantry = body.length <= 20 && /\b(thanks|thank you|thx|ty|awesome|nice|cool|great|love it|👍|🙏|❤️|🙌)\b/i.test(body)
      if (lastSent?.id && !isPleasantry) {
        await supabase.from('motivation_content_queue').update({ feedback: body }).eq('id', lastSent.id)
      }
      const ack = await generateAck(body, firstName, lastSent?.title || null)
      await send(ack)
      return emptyTwiml()
    }

    const context = session.context as any
    context.messages = context.messages || []
    context.messages.push({ role: 'user', content: body })

    // ── Step: awaiting_ruler ─────────────────────────────────────────────────
    if (session.step === 'awaiting_ruler') {
      const score = parseRuler(body)
      if (score == null) {
        if (context.reprompted) {
          // second miss — accept and move on without a score
          context.readiness = null
        } else {
          context.reprompted = true
          await supabase.from('sms_motivation_checkin_sessions').update({ context }).eq('id', session.id)
          await send(`No worries — just a number 1–10 for me: how ready do you feel to try one small habit? (1 = not at all, 10 = ready)`)
          return emptyTwiml()
        }
      } else {
        context.readiness = score
      }
      const reply = `Got it${score != null ? ` — ${score}/10` : ''}. Thank you for being honest. Anything you'd want more or less of in what I'm sending you?`
      context.messages.push({ role: 'assistant', content: reply })
      await supabase.from('sms_motivation_checkin_sessions').update({ step: 'awaiting_feedback', context }).eq('id', session.id)
      await send(reply)
      return emptyTwiml()
    }

    // ── Step: awaiting_feedback ──────────────────────────────────────────────
    if (session.step === 'awaiting_feedback') {
      const readiness = context.readiness ?? null
      await supabase.from('motivation_checkins').insert({
        user_id: userId,
        week: context.week || 1,
        readiness_score: readiness,
        content_feedback: body,
      })

      // Handoff? readiness >= threshold on TWO consecutive check-ins.
      let handoff = false
      if (readiness != null && readiness >= READY_THRESHOLD) {
        const { data: prior } = await supabase
          .from('motivation_checkins')
          .select('readiness_score')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(1, 1) // the one before the row we just inserted
          .maybeSingle()
        if (prior?.readiness_score != null && prior.readiness_score >= READY_THRESHOLD) handoff = true
      }

      if (handoff) {
        const offer = `Honestly, ${firstName}, you sound ready. Want to turn one of these into a real habit you'll actually keep? Reply YES and we'll set it together — small, I promise.`
        context.messages.push({ role: 'assistant', content: offer })
        await supabase.from('sms_motivation_checkin_sessions').update({ step: 'awaiting_handoff', context }).eq('id', session.id)
        await send(offer)
        return emptyTwiml()
      }

      // Warm close, end session.
      await supabase.from('sms_motivation_checkin_sessions').delete().eq('id', session.id)
      await send(`Thank you, ${firstName} — this helps me send you better stuff. No pressure to do anything. Talk soon. 🌿`)
      return emptyTwiml()
    }

    // ── Step: awaiting_handoff ───────────────────────────────────────────────
    if (session.step === 'awaiting_handoff') {
      if (isAffirmative(body)) {
        await startHabitHandoff()
      } else {
        await supabase.from('sms_motivation_checkin_sessions').delete().eq('id', session.id)
        await send(`Totally fine, ${firstName} — no rush at all. I'll keep the inspiration coming, and we can set a habit whenever you're ready. 🌿`)
      }
      return emptyTwiml()
    }

    return emptyTwiml()
  } catch (e) {
    console.error('sms-motivation-checkin error:', e)
    return emptyTwiml()
  }
})
