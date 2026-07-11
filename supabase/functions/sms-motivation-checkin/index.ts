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
 * A short, warm, VARIED reply to a non-request message: a light thanks/reaction OR — importantly —
 * a commitment to an action / an answer to the prompt's question. Gets the message the user was
 * replying to so it can CELEBRATE a commitment specifically instead of flattening it into a
 * content change (which reads as demotivating). Falls back to a small varied pool on any error.
 */
async function generateAck(userMessage: string, firstName: string, lastContent: string | null, lang = 'en'): Promise<string> {
  const fallbacks = [
    `Love that, ${firstName} 🙌`,
    `Yes — that one counts ☀️`,
    `That's a good one. Go enjoy it 🌿`,
    `💚 Rooting for you today, ${firstName}.`,
  ]
  try {
    const system = [
      'You are Summit, a warm habit coach texting a user in "Motivation Mode" (a daily piece of',
      'inspiration, never pressure). They just replied to their latest message, and they did NOT ask to',
      'change what content they get. Write ONE short SMS reply (max ~200 chars), warm, human, VARIED, at',
      'most 1 tasteful emoji. Read their intent:',
      '- If they are committing to an action, or answering a question the message asked (e.g. "I\'ll take',
      '  a midday walk"), CELEBRATE that specific thing — name it back, cheer them on, maybe a light nudge',
      '  to go enjoy it. This is a win; treat it like one.',
      '- If it is just a thanks or a light reaction, keep it brief and warm.',
      'NEVER say you will change, update, tune, add, or "fold in" content — they did not ask for that, and',
      'turning a personal commitment into a settings/content change is demotivating. NEVER use a stock',
      '"noted, keep an eye out" phrase.',
    ].join('\n') + languageDirective(lang)
    const userPrompt = `User (${firstName}) replied: "${userMessage}".`
      + (lastContent ? `\n\nThe message they were replying to said: "${lastContent}"` : '')
    const out = (await callOpenAI(system, userPrompt, 0.8, 110)).trim()
    return out || fallbacks[Math.floor(Math.random() * fallbacks.length)]
  } catch (_e) {
    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  }
}

/**
 * iOS "tapback" reactions delivered to an SMS (green-bubble) recipient arrive as plain text
 * like 'Loved an image', 'Liked "…"', 'Emphasized "…"', 'Laughed at "…"', 'Questioned "…"',
 * 'Disliked "…"', or newer 'Reacted 👍 to …'. These are reactions, not messages — a positive
 * reaction is never a content instruction.
 */
function isTapback(body: string): boolean {
  const t = body.trim()
  return /^(loved|liked|disliked|laughed at|emphasi[sz]ed|questioned)\s+(an image|a video|a movie|an audio message|the location|["“'].*)/i.test(t)
    || /^reacted\b.*\bto\b/i.test(t)
}

/**
 * Steer content ONLY on an actual request to change what they receive (topic/type/tone/length/
 * frequency, or an explicit more/less). Praise, thanks, and reactions are NOT feedback to act on
 * — a "like" is not an instruction (that assumption is exactly what over-tuned users' content).
 * Conservative: tapbacks / ready-intents / bare numbers short-circuit to false, and the
 * classifier itself defaults to NO when unsure or on error.
 */
async function isActionableContentRequest(body: string): Promise<boolean> {
  if (isTapback(body)) return false
  if (isReadyIntent(body)) return false
  if (/^\s*\d+\s*$/.test(body)) return false // bare rating like "10"
  try {
    const system = [
      'You classify one SMS reply from a user in a daily-motivation text program. Answer strictly',
      'YES or NO to a single question: does this message REQUEST a change to the content they',
      'receive — a different topic, type, tone, length, or frequency, or explicitly asking for more',
      'or less of something specific? Pure praise, thanks, emoji, or a positive reaction (e.g.',
      '"loved this", "great, thank you", "🙌", "loved an image") is NOT a request → answer NO.',
      'If unsure, answer NO.',
    ].join(' ')
    const out = (await callOpenAI(system, `Message: "${body}"`, 0, 3)).trim().toUpperCase()
    return out.startsWith('Y')
  } catch (_e) {
    return false // never steer on ambiguous input
  }
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
  // accented "sí" is confident anywhere; bare "si" only as a standalone reply (not "si puedo")
  if (/^\s*si[\s!.,]*$/i.test(body)) return true
  return /(^|\s)(yes|yep|yeah|yup|sure|ok|okay|sounds good|let'?s|i'?m in|ready|do it|sí|claro|dale|vale|de acuerdo|list[oa]|sim|com certeza|bora|pode ser|t[oô] dentro)(?![a-záàâãäéèêíìóòôõöúùüçñ])/i.test(body)
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
        .select('id, title, coach_framing, body')
        .eq('user_id', userId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // A real content ask → persist it durably, re-tune upcoming content NOW, and set an
      // honest expectation. A like / positive reaction is NOT an ask — it falls through to the
      // light ack below and never touches the steering note. (Previously any 12+ char reply,
      // including an iMessage tapback like "Loved an image", was treated as feedback and steered
      // the content.)
      if (await isActionableContentRequest(body)) {
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

      // Not a content ask — could be a light thanks/reaction OR a commitment to an action / an
      // answer to the prompt's question. Give the ack the message they're replying to so it can
      // CELEBRATE a commitment specifically, instead of flattening it into a content change.
      const lastContent = lastSent?.coach_framing || lastSent?.body || lastSent?.title || null
      const ack = await generateAck(body, firstName, lastContent, profile.preferred_language || 'en')
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
      // honors it — but ONLY if it's an actual content request. If they just answered warmly
      // ("it was all great!"), we keep the raw content_feedback above but don't steer on it.
      // (No mid-week re-tune here — the check-in is Saturday; next content is Monday.)
      if (await isActionableContentRequest(body)) {
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
