/**
 * send-daily-motivation
 * ─────────────────────
 * Cron (every 30 min). For each Motivation Mode user, at ~9:30am in THEIR timezone:
 *   - On their check-in day → send the readiness ruler + open a check-in session.
 *   - Otherwise            → drip the next `approved` content card.
 * Idempotent: a once-per-day guard (compared in the user's local date) prevents
 * double-sends when the cron fires again later in the morning window.
 *
 * Every outbound goes through sendSMS with logTable 'sms_messages' so it appears in
 * the admin SMS Conversation panel. (Inbound replies are logged by twilio-webhook.)
 *
 * Deploy with --no-verify-jwt (cron-invoked).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Default send time: 9:30am local. Morning window upper bound is noon (safety: if the
// cron missed the morning, don't surprise-send in the afternoon).
const SEND_HOUR = 9
const SEND_MIN = 30
const WINDOW_END_HOUR = 12

function getLocalTime(timezone: string): { hours: number; minutes: number; dayOfWeek: number } {
  try {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour: 'numeric', minute: 'numeric', weekday: 'short', hour12: false,
    }).formatToParts(now)
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    const wd = parts.find(p => p.type === 'weekday')?.value || 'Sun'
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    return { hours, minutes, dayOfWeek: dayMap[wd] ?? 0 }
  } catch (_e) {
    const now = new Date()
    return { hours: now.getUTCHours(), minutes: now.getUTCMinutes(), dayOfWeek: now.getUTCDay() }
  }
}

/** YYYY-MM-DD in the given timezone. */
function localDate(dateLike: string | number | Date, tz: string): string {
  return new Date(dateLike).toLocaleDateString('en-CA', { timeZone: tz })
}

/** Compose the SMS body for a content item. */
function composeContentSMS(item: any): string {
  let msg = item.coach_framing || item.body || ''
  if (item.content_type === 'quote' && item.body && item.body !== msg) {
    msg = `${item.body}\n\n${msg}`
  }
  if (item.url) msg = `${msg}\n${item.url}`
  return msg.trim()
}

async function send(supabase: ReturnType<typeof createClient>, to: string, body: string, userId: string, userName: string | null) {
  return sendSMS({ to, body }, {
    supabase,
    logTable: 'sms_messages',
    extra: { user_id: userId, user_name: userName, sent_by_type: 'system' },
  })
}

serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone, timezone, motivation_checkin_day, sms_opt_in')
    .eq('motivation_mode', true)
    .not('phone', 'is', null)
    .is('deleted_at', null)

  if (error) {
    console.error('Error loading motivation users:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const results: any[] = []

  for (const u of users || []) {
    try {
      if (u.sms_opt_in === false) continue
      const tz = u.timezone || 'America/Chicago'
      const lt = getLocalTime(tz)
      const inWindow =
        ((lt.hours > SEND_HOUR) || (lt.hours === SEND_HOUR && lt.minutes >= SEND_MIN)) && lt.hours < WINDOW_END_HOUR
      if (!inWindow) continue

      const userName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || null
      const today = localDate(new Date(), tz)

      // ── Check-in day → readiness ruler ────────────────────────────────────
      if (u.motivation_checkin_day != null && lt.dayOfWeek === u.motivation_checkin_day) {
        const { data: lastSession } = await supabase
          .from('sms_motivation_checkin_sessions')
          .select('created_at')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (lastSession?.created_at && localDate(lastSession.created_at, tz) === today) {
          continue // already opened a check-in today
        }

        const { count } = await supabase
          .from('motivation_checkins')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', u.id)
        const week = (count || 0) + 1

        const opener =
          `Hey ${u.first_name || 'there'} — checking in. How's the content felt this week? ` +
          `And on a scale of 1–10, how ready do you feel to try one small habit? ` +
          `(1 = not at all, 10 = ready). No pressure either way.`

        await supabase.from('sms_motivation_checkin_sessions').insert({
          user_id: u.id,
          step: 'awaiting_ruler',
          context: { week, exchange_count: 0, messages: [{ role: 'assistant', content: opener }] },
        })
        await send(supabase, u.phone, opener, u.id, userName)
        results.push({ userId: u.id, action: 'checkin_sent', week })
        continue
      }

      // ── Content day → drip next approved card ─────────────────────────────
      const { data: lastSent } = await supabase
        .from('motivation_content_queue')
        .select('sent_at')
        .eq('user_id', u.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastSent?.sent_at && localDate(lastSent.sent_at, tz) === today) {
        continue // already sent today
      }

      const { data: next } = await supabase
        .from('motivation_content_queue')
        .select('*')
        .eq('user_id', u.id)
        .eq('status', 'approved')
        .order('scheduled_date', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!next) {
        console.error(`⚠️ EMPTY QUEUE: no approved Motivation Mode content for user ${u.id} — nothing sent. Approve a batch.`)
        results.push({ userId: u.id, action: 'empty_queue' })
        continue
      }

      const body = composeContentSMS(next)
      const res = await send(supabase, u.phone, body, u.id, userName)
      if (res.success) {
        await supabase
          .from('motivation_content_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', next.id)
        results.push({ userId: u.id, action: 'content_sent', itemId: next.id })
      } else {
        results.push({ userId: u.id, action: 'send_failed', error: res.error })
      }
    } catch (e) {
      console.error(`Error for user ${(u as any).id}:`, e)
      results.push({ userId: (u as any).id, action: 'error', error: String(e) })
    }
  }

  return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
