/**
 * send-daily-motivation
 * ─────────────────────
 * Cron (every 30 min). For each Motivation Mode user, in THEIR timezone, on a front-loaded
 * weekly shape (Mon–Wed 2 cards, Thu–Sat 1, Sun = rest):
 *   - Mon–Sat → drip the next `approved` card whose scheduled_date has arrived, in two
 *     windows: morning (~9:30a) and afternoon (~4p). 2x days send one per window; 1x days
 *     send morning only.
 *   - Saturday afternoon → readiness check-in, right after the week's last content card so
 *     it lands while the user is warm (not a lonely Sunday ask). Only after a full week of
 *     content actually ran, so brand-new/fresh-start users aren't checked in prematurely.
 * Idempotent: a per-day sent-count vs. the day's curve target (compared in the user's local
 * date) prevents double-sends when the cron fires repeatedly within a window.
 *
 * Every outbound goes through sendSMS with logTable 'sms_messages' so it appears in
 * the admin SMS Conversation panel. (Inbound replies are logged by twilio-webhook.)
 *
 * Deploy with --no-verify-jwt (cron-invoked).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'
import { t } from '../_shared/i18n.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Two daily send windows (user-local). Front-loaded weekly shape sends up to 2 cards on
// Mon–Wed (one per window) and 1 on Thu–Sat (morning only). Sunday = readiness check-in.
const MORNING_START_MIN = 9 * 60 + 30   // 9:30a
const MORNING_END_HOUR = 12             // < 12:00
const AFTERNOON_START_HOUR = 16         // 4:00p
const AFTERNOON_END_MIN = 18 * 60 + 30  // < 6:30p

// Sends per day by local day-of-week (0=Sun). Sunday handled separately as the check-in.
const WEEK_CURVE: Record<number, number> = { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1, 6: 1 }

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

/** User's local calendar date, N days from today (N may be negative), as YYYY-MM-DD. */
function localDatePlus(tz: string, days: number): string {
  const [y, m, d] = new Date().toLocaleDateString('en-CA', { timeZone: tz }).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().split('T')[0]
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
    .select('id, first_name, last_name, phone, timezone, motivation_checkin_day, sms_opt_in, preferred_language')
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
      const tMin = lt.hours * 60 + lt.minutes
      const inMorning = tMin >= MORNING_START_MIN && lt.hours < MORNING_END_HOUR
      const inAfternoon = lt.hours >= AFTERNOON_START_HOUR && tMin < AFTERNOON_END_MIN
      if (!inMorning && !inAfternoon) continue

      const userName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || null
      const today = localDate(new Date(), tz)

      // ── Content (Mon–Sat) per the front-loaded curve ─────────────────────
      const target = WEEK_CURVE[lt.dayOfWeek] || 0
      if (target > 0) {
        // By the morning window we allow 1 card; by the afternoon, up to the day's target.
        const allowedByNow = inMorning ? 1 : target

        const { data: recentSent } = await supabase
          .from('motivation_content_queue')
          .select('sent_at')
          .eq('user_id', u.id)
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })
          .limit(5)
        const sentToday = (recentSent || []).filter(r => r.sent_at && localDate(r.sent_at, tz) === today).length

        if (sentToday < allowedByNow) {
          // Next approved card whose scheduled_date has arrived (nothing sends before its day).
          const { data: next } = await supabase
            .from('motivation_content_queue')
            .select('*')
            .eq('user_id', u.id)
            .eq('status', 'approved')
            .lte('scheduled_date', today)
            .order('scheduled_date', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (!next) {
            console.error(`⚠️ EMPTY QUEUE: no approved due Motivation Mode content for user ${u.id} — nothing sent. Approve a batch.`)
            results.push({ userId: u.id, action: 'empty_queue' })
          } else {
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
          }
          continue // sent (or logged) content this run; check-in rides a later run
        }
      }

      // ── Saturday afternoon → readiness check-in (rides after the week's last card) ──
      // Attached to content (not a lonely Sunday ask) so it lands while the user is warm.
      // Sunday is a true rest day. Only fires once the week's content has actually run.
      if (lt.dayOfWeek === 6 && inAfternoon) {
        const mondayStr = localDatePlus(tz, -((lt.dayOfWeek + 6) % 7)) // this week's Monday
        const { count: weekContent } = await supabase
          .from('motivation_content_queue')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', u.id)
          .eq('status', 'sent')
          .gte('scheduled_date', mondayStr)
        if (!weekContent) continue // no week of content yet → no check-in

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

        // Lead with the CONTENT-DIRECTION question (captured even if they skip the rating);
        // sms-motivation-checkin asks the 1–10 readiness ruler as the second beat.
        const opener = t('motivation_checkin_opener', u.preferred_language || 'en', { name: u.first_name || 'there' })

        await supabase.from('sms_motivation_checkin_sessions').insert({
          user_id: u.id,
          step: 'awaiting_feedback',
          context: { week, exchange_count: 0, messages: [{ role: 'assistant', content: opener }] },
        })
        await send(supabase, u.phone, opener, u.id, userName)
        results.push({ userId: u.id, action: 'checkin_sent', week })
        continue
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
