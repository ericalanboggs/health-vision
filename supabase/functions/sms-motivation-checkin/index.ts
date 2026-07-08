/**
 * sms-motivation-checkin
 * ──────────────────────
 * Inbound handler for Motivation Mode replies. Routed here by twilio-webhook when the
 * user has an active check-in session OR is in motivation_mode (no session).
 *
 * Session state machine (mirrors sms-reflection-response). Feedback is asked FIRST so the
 * content-direction steer is captured even if the user skips the rating:
 *   awaiting_feedback→ write motivation_checkins (content_feedback now, readiness later) → awaiting_ruler
 *   awaiting_ruler   → parse 1–10 (non-numeric → one re-prompt, then accept null) → update readiness
 *                      → handoff? → awaiting_handoff | done
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
import { languageDirective } from '../_shared/coach_knowledge.ts'
import { t } from '../_shared/i18n.ts'

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
async function generateAck(userMessage: string, firstName: string, lastTitle: string | null, lang = 'en'): Promise<string> {
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
    ].join('\n') + languageDirective(lang)
    const userPrompt = `User (${firstName}) texted: "${userMessage}".` + (lastTitle ? ` Last thing we sent them: "${lastTitle}".` : '')
    const out = (await callOpenAI(system, userPrompt, 0.85, 80)).trim()
    return out || fallbacks[Math.floor(Math.random() * fallbacks.length)]
  } catch (_e) {
    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  }
}

/** A real content request worth acting on — not a pleasantry, a bare number, or a ready signal. */
function isSubstantiveFeedback(body: string): boolean {
  if (isReadyIntent(body)) return false
  if (/^\s*\d+\s*$/.test(body)) return false // bare rating like "10"
  const isPleasantry = body.length <= 20 && /\b(thanks|thank you|thx|ty|awesome|nice|cool|great|love it|👍|🙏|❤️|🙌)\b/i.test(body)
  if (isPleasantry) return false
  return body.length >= 12
}

/** Merge a new content ask into the user's durable, evolving preference note. */
async function mergePref(existing: string | null, newAsk: string): Promise<string> {
  const prior = (existing || '').trim()
  const fallback = prior ? `${prior}; ${newAsk}`.slice(0, 600) : newAsk.slice(0, 600)
  try {
    const system = [
      'You maintain a SHORT evolving note of a user\'s content preferences for their Motivation Mode texts.',
      'Given the existing note and a new request, return an updated note that PRESERVES prior preferences and',
      'folds in the new one (on a direct conflict, prefer the newer request). Keep it tight: a few specifics,',
      'comma/semicolon-separated, no preamble, no quotes. Max ~300 chars.',
    ].join(' ')
    const out = (await callOpenAI(system, `EXISTING NOTE: ${prior || '(none yet)'}\nNEW REQUEST: ${newAsk}`, 0.3, 200)).trim()
    return out || fallback
  } catch (_e) {
    return fallback
  }
}

/** Honest acknowledgment: confirms the re-tune is queued and sets a truthful "when". */
async function generateResponsiveAck(userMessage: string, firstName: string, lang = 'en'): Promise<string> {
  const fallback = `Got it, ${firstName} — I'll re-tune what's coming to match. You'll start seeing it in your next message. 🌿`
  try {
    const system = [
      'You are Summit, a warm habit coach. A Motivation Mode user just asked for a change to their content, and',
      'you have ALREADY queued an update to their UPCOMING messages to honor it. Write ONE short SMS (max ~200',
      'chars): warmly confirm you are tuning the content to their ask, and set the honest expectation that they',
      'will see it starting in their NEXT scheduled message. At most 1 tasteful emoji. Do NOT promise a separate',
      'message right now, and NEVER use a vague "stay tuned".',
    ].join(' ') + languageDirective(lang)
    const out = (await callOpenAI(system, `User (${firstName}) asked: "${userMessage}"`, 0.7, 100)).trim()
    return out || fallback
  } catch (_e) {
    return fallback
  }
}

/** Fire an immediate mid-week re-tune of the user's upcoming unsent content (runs independently). */
async function fireRetune(userId: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/generate-motivation-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ userId, retune: true }),
    })
  } catch (e) {
    console.error('fireRetune failed:', e)
  }
}

/** Keep background work alive past the response on Supabase Edge (no-op if unavailable). */
function runInBackground(p: Promise<unknown>): void {
  try {
    ;(globalThis as any).EdgeRuntime?.waitUntil?.(p)
  } catch (_e) { /* fall through — the in-flight fetch still gets dispatched */ }
}

function parseRuler(body: string): number | null {
  const m = body.match(/\b(10|[1-9])\b/)
  return m ? parseInt(m[1]) : null
}
function isAffirmative(body: string): boolean {
  // en + es + pt-BR (localization Workstream C)
  return /(^|\s)(yes|yep|yeah|yup|sure|ok|okay|sounds good|let'?s|i'?m in|ready|do it|s[íi]|claro|dale|vale|de acuerdo|list[oa]|sim|com certeza|bora|pode ser|t[oô] dentro)(?![a-záàâãäéèêíìóòôõöúùüçñ])/i.test(body)
}
function isReadyIntent(body: string): boolean {
  // en + es + pt-BR
  return /(^|\s)(ready|let'?s do|let'?s go|i'?m in|start (a )?habit|set (a )?habit|sign me up|i think i'?m ready|list[oa]|estoy list[oa]|quiero empezar|empecemos|vamos|estou pront[oa]|quero come[çc]ar|bora come[çc]ar)(?![a-záàâãäéèêíìóòôõöúùüçñ])/i.test(body)
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
    const lang = profile.preferred_language || 'en'
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
      await send(t('motivation_add_handoff', lang))
    }

    // ── No active session: motivation_mode user replying to a daily card ─────
    if (!session) {
      if (isReadyIntent(body)) {
        const opener = t('motivation_ready_opener', lang, { name: firstName })
        await supabase.from('sms_motivation_checkin_sessions').insert({
          user_id: userId,
          step: 'awaiting_handoff',
          context: { exchange_count: 0, messages: [{ role: 'assistant', content: opener }] },
        })
        await send(opener)
        return emptyTwiml()
      }
      const { data: lastSent } = await supabase
        .from('motivation_content_queue')
        .select('id, title')
        .eq('user_id', userId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // A real content ask → persist it durably, re-tune upcoming content NOW, and set an
      // honest expectation. (Previously this only tagged one queue row that generation never
      // read, and the ack over-promised "stay tuned" with nothing behind it.)
      if (isSubstantiveFeedback(body)) {
        const merged = await mergePref(profile.motivation_pref, body)
        await supabase.from('profiles').update({ motivation_pref: merged }).eq('id', userId)
        if (lastSent?.id) {
          await supabase.from('motivation_content_queue').update({ feedback: body }).eq('id', lastSent.id)
        }
        runInBackground(fireRetune(userId)) // regenerates unsent upcoming cards to honor the ask
        const ack = await generateResponsiveAck(body, firstName, profile.preferred_language || 'en')
        await send(ack)
        return emptyTwiml()
      }

      // Otherwise it's a pleasantry — keep it light.
      const ack = await generateAck(body, firstName, lastSent?.title || null, profile.preferred_language || 'en')
      await send(ack)
      return emptyTwiml()
    }

    const context = session.context as any
    context.messages = context.messages || []
    context.messages.push({ role: 'user', content: body })

    // ── Step: awaiting_feedback (asked FIRST) ────────────────────────────────
    // Lead with the content-direction question. Persist it immediately so the steer
    // survives even if the user skips the readiness rating that follows.
    if (session.step === 'awaiting_feedback') {
      const { data: checkinRow } = await supabase
        .from('motivation_checkins')
        .insert({
          user_id: userId,
          week: context.week || 1,
          readiness_score: null,
          content_feedback: body,
        })
        .select('id')
        .maybeSingle()
      context.checkinId = checkinRow?.id || null

      // Fold the check-in answer into the durable preference note so next week's generation
      // honors it. (No mid-week re-tune here — the check-in is Saturday; next content is Monday.)
      if (isSubstantiveFeedback(body)) {
        const merged = await mergePref(profile.motivation_pref, body)
        await supabase.from('profiles').update({ motivation_pref: merged }).eq('id', userId)
      }

      const reply = t('motivation_checkin_ruler', lang)
      context.messages.push({ role: 'assistant', content: reply })
      await supabase.from('sms_motivation_checkin_sessions').update({ step: 'awaiting_ruler', context }).eq('id', session.id)
      await send(reply)
      return emptyTwiml()
    }

    // ── Step: awaiting_ruler (asked SECOND) ──────────────────────────────────
    if (session.step === 'awaiting_ruler') {
      const score = parseRuler(body)
      if (score == null && !context.reprompted) {
        context.reprompted = true
        await supabase.from('sms_motivation_checkin_sessions').update({ context }).eq('id', session.id)
        await send(t('motivation_ruler_reprompt', lang))
        return emptyTwiml()
      }
      const readiness = score ?? null // second miss → accept without a score (feedback already saved)
      if (context.checkinId) {
        await supabase.from('motivation_checkins').update({ readiness_score: readiness }).eq('id', context.checkinId)
      }

      // Handoff? readiness >= threshold on TWO consecutive check-ins.
      let handoff = false
      if (readiness != null && readiness >= READY_THRESHOLD) {
        const { data: prior } = await supabase
          .from('motivation_checkins')
          .select('readiness_score')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(1, 1) // the one before the row we just updated
          .maybeSingle()
        if (prior?.readiness_score != null && prior.readiness_score >= READY_THRESHOLD) handoff = true
      }

      if (handoff) {
        const offer = t('motivation_handoff_offer', lang, { name: firstName })
        context.messages.push({ role: 'assistant', content: offer })
        await supabase.from('sms_motivation_checkin_sessions').update({ step: 'awaiting_handoff', context }).eq('id', session.id)
        await send(offer)
        return emptyTwiml()
      }

      // Warm close, end session.
      await supabase.from('sms_motivation_checkin_sessions').delete().eq('id', session.id)
      await send(
        score != null
          ? t('motivation_close_score', lang, { score, name: firstName })
          : t('motivation_close_noscore', lang, { name: firstName })
      )
      return emptyTwiml()
    }

    // ── Step: awaiting_handoff ───────────────────────────────────────────────
    if (session.step === 'awaiting_handoff') {
      if (isAffirmative(body)) {
        await startHabitHandoff()
      } else {
        await supabase.from('sms_motivation_checkin_sessions').delete().eq('id', session.id)
        await send(t('motivation_handoff_decline', lang, { name: firstName }))
      }
      return emptyTwiml()
    }

    return emptyTwiml()
  } catch (e) {
    console.error('sms-motivation-checkin error:', e)
    return emptyTwiml()
  }
})
