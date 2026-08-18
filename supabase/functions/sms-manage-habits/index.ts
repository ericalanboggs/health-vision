/**
 * sms-manage-habits
 * ─────────────────
 * Confirm-first habit management over SMS: archive / pause / resume / edit-schedule / add.
 * Routed here by habit-sms-response when it detects a management intent OR an active
 * sms_manage_habit_sessions row.
 *
 * TRUST BOUNDARY (this is the whole point): the LLM ONLY extracts intent into structured ops.
 * Deterministic code resolves habit names against the DB, normalizes the schedule, stores a
 * concrete plan, and asks the user to confirm. Only on an explicit YES does code execute the
 * writes, and the confirmation reports ONLY what actually wrote. The model never touches the DB
 * and never decides that an action is "done."
 *
 *   no session + management intent → extract → resolve → store plan → send "confirm? YES/NO"
 *   awaiting_confirm + YES         → execute gated writes → report what wrote → clear session
 *   awaiting_confirm + NO/unclear  → cancel / re-ask
 *
 * v1 confirmation copy is English-only (the extractor still understands es/pt input). i18n TODO.
 * Deploy with --no-verify-jwt (called internally by habit-sms-response).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'
import { parseDays, parseTime, formatDays, formatTime, WEEKDAYS } from '../_shared/scheduleParse.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const MAX_PERSONAL_HABITS = 5

interface Habit {
  name: string
  days: number[]
  time: string | null
  tracking_enabled: boolean
  tracking_type: string
}

type Op =
  | { op: 'archive'; habit_name: string }
  | { op: 'pause'; habit_name: string; tracking_type: string }
  | { op: 'resume'; habit_name: string; tracking_type: string }
  | { op: 'edit'; habit_name: string; days: number[] | null; time: string | null }
  | { op: 'add'; habit_name: string; days: number[]; time: string | null; tracking_type: string }

function emptyTwiml() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}

async function callOpenAI(system: string, user: string, temperature = 0, maxTokens = 500): Promise<string> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
    }),
  })
  if (!r.ok) throw new Error(`OpenAI ${r.status}`)
  const d = await r.json()
  return d.choices?.[0]?.message?.content || '{}'
}

function isAffirmative(body: string): boolean {
  return /^\s*(y|yes|yep|yeah|yup|sure|ok|okay|confirm|confirmed|do it|go ahead|sounds good|please|correct|sí|si|claro|dale|sim|isso)\b/i.test(body.trim())
}
function isNegative(body: string): boolean {
  return /^\s*(n|no|nope|nah|cancel|nevermind|never mind|stop|don'?t|leave it|keep it|not now|wait|no gracias|não|nao)\b/i.test(body.trim())
}

/** Active (non-archived) habits with their schedule + tracking state, grouped by name. */
async function loadHabits(supabase: any, userId: string): Promise<Habit[]> {
  const [{ data: rows }, { data: configs }] = await Promise.all([
    supabase
      .from('weekly_habits')
      .select('habit_name, day_of_week, reminder_time, time_of_day')
      .eq('user_id', userId)
      .is('archived_at', null),
    supabase
      .from('habit_tracking_config')
      .select('habit_name, tracking_type, tracking_enabled')
      .eq('user_id', userId),
  ])
  const cfg = new Map<string, any>((configs || []).map((c: any) => [c.habit_name, c]))
  const byName = new Map<string, { name: string; days: Set<number>; time: string | null }>()
  for (const r of rows || []) {
    const e = byName.get(r.habit_name) || { name: r.habit_name, days: new Set<number>(), time: null }
    e.days.add(r.day_of_week)
    if (!e.time) e.time = r.reminder_time || r.time_of_day || null
    byName.set(r.habit_name, e)
  }
  return [...byName.values()].map((e) => ({
    name: e.name,
    days: [...e.days].sort((a, b) => a - b),
    time: e.time,
    tracking_enabled: cfg.get(e.name)?.tracking_enabled ?? true,
    tracking_type: cfg.get(e.name)?.tracking_type ?? 'boolean',
  }))
}

/** Match a user-referenced name to a real habit (exact → substring → token overlap). */
function matchHabit(ref: string, habits: Habit[]): Habit | null {
  const r = (ref || '').toLowerCase().trim()
  if (!r) return null
  let m = habits.find((h) => h.name.toLowerCase() === r)
  if (m) return m
  m = habits.find((h) => h.name.toLowerCase().includes(r) || r.includes(h.name.toLowerCase()))
  if (m) return m
  const rt = new Set(r.split(/\W+/).filter(Boolean))
  let best: Habit | null = null
  let bestScore = 0
  for (const h of habits) {
    const overlap = h.name.toLowerCase().split(/\W+/).filter(Boolean).filter((t) => rt.has(t)).length
    if (overlap > bestScore) { bestScore = overlap; best = h }
  }
  return bestScore >= 1 ? best : null
}

/** LLM extraction: message → raw operations (no DB access, no execution). */
async function extractOps(body: string, habits: Habit[]): Promise<any[]> {
  const habitList = habits.length ? habits.map((h) => `- ${h.name}`).join('\n') : '(none)'
  const system = [
    'You extract habit-management operations from one SMS. Output JSON only:',
    '{"operations":[{"action":"archive|pause|resume|edit|add","habit":"<name>","days":"<phrase or null>","time":"<phrase or null>","tracking":"boolean|metric|null"}]}',
    'Definitions:',
    '- archive = remove / stop / get rid of / delete a habit.',
    '- pause = temporarily pause / turn off reminders / mute a habit.',
    '- resume = resume / turn reminders back on / unpause a habit.',
    '- edit = change the days and/or time of an existing habit (move, reschedule, "at 9am", "on weekdays").',
    '- add = create a NEW habit.',
    'For archive/pause/resume/edit, "habit" MUST be copied EXACTLY from the CURRENT HABITS list below.',
    'Map "these"/"them"/"all my habits" to EVERY current habit — emit one operation per habit.',
    'For add, "habit" is a short name for the new habit; set "tracking" to "metric" if it is naturally',
    'measured (minutes, steps, oz, reps) else "boolean". Only include operations the user actually asked',
    'for. If there is no management request, return {"operations":[]}. Do not invent habits.',
    '',
    'CURRENT HABITS:',
    habitList,
  ].join('\n')
  try {
    const out = await callOpenAI(system, `SMS: "${body}"`, 0, 500)
    const parsed = JSON.parse(out)
    return Array.isArray(parsed?.operations) ? parsed.operations : []
  } catch (_e) {
    return []
  }
}

/** Resolve raw ops into a concrete, trusted plan. Returns unresolved refs for a clarify reply. */
function buildPlan(rawOps: any[], habits: Habit[]): { plan: Op[]; unresolved: string[] } {
  const plan: Op[] = []
  const unresolved: string[] = []
  const activeCount = habits.length
  let adds = 0
  for (const op of rawOps) {
    const action = String(op?.action || '').toLowerCase()
    if (action === 'add') {
      const name = String(op?.habit || '').trim()
      if (!name) continue
      if (activeCount + adds >= MAX_PERSONAL_HABITS) { unresolved.push(`${name} (you're at the ${MAX_PERSONAL_HABITS}-habit limit)`); continue }
      adds++
      plan.push({
        op: 'add',
        habit_name: name,
        days: parseDays(op?.days) || [...WEEKDAYS],
        time: parseTime(op?.time),
        tracking_type: op?.tracking === 'metric' ? 'metric' : 'boolean',
      })
      continue
    }
    const match = matchHabit(String(op?.habit || ''), habits)
    if (!match) { unresolved.push(String(op?.habit || '(unspecified)')); continue }
    if (action === 'archive') plan.push({ op: 'archive', habit_name: match.name })
    else if (action === 'pause') plan.push({ op: 'pause', habit_name: match.name, tracking_type: match.tracking_type })
    else if (action === 'resume') plan.push({ op: 'resume', habit_name: match.name, tracking_type: match.tracking_type })
    else if (action === 'edit') {
      const days = parseDays(op?.days)
      const time = parseTime(op?.time)
      if (!days && !time) { unresolved.push(`${match.name} (no new schedule given)`); continue }
      plan.push({ op: 'edit', habit_name: match.name, days, time })
    }
  }
  // De-dupe identical ops (same op + habit)
  const seen = new Set<string>()
  const deduped = plan.filter((p) => {
    const k = `${p.op}:${p.habit_name}:${(p as any).days || ''}:${(p as any).time || ''}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return { plan: deduped, unresolved }
}

/** Human-readable, code-built confirmation line for one op. */
function describeOp(p: Op): string {
  switch (p.op) {
    case 'archive': return `archive “${p.habit_name}”`
    case 'pause': return `pause reminders for “${p.habit_name}”`
    case 'resume': return `turn reminders back on for “${p.habit_name}”`
    case 'edit': {
      const parts: string[] = []
      if (p.days) parts.push(`to ${formatDays(p.days)}`)
      if (p.time) parts.push(`at ${formatTime(p.time)}`)
      return `move “${p.habit_name}” ${parts.join(' ')}`.trim()
    }
    case 'add': {
      const when = `${formatDays(p.days)}${p.time ? ` at ${formatTime(p.time)}` : ''}`
      return `add “${p.habit_name}” (${when})`
    }
  }
}

/** Execute the plan with gated writes. Returns which ops actually succeeded. */
async function executePlan(supabase: any, userId: string, timezone: string, plan: Op[]): Promise<{ done: Op[]; failed: Op[] }> {
  const done: Op[] = []
  const failed: Op[] = []
  for (const p of plan) {
    try {
      if (p.op === 'archive') {
        const { error } = await supabase
          .from('weekly_habits')
          .update({ archived_at: new Date().toISOString() })
          .eq('user_id', userId).eq('habit_name', p.habit_name).is('archived_at', null)
        error ? failed.push(p) : done.push(p)
      } else if (p.op === 'pause' || p.op === 'resume') {
        const { error } = await supabase
          .from('habit_tracking_config')
          .upsert(
            { user_id: userId, habit_name: p.habit_name, tracking_type: p.tracking_type, tracking_enabled: p.op === 'resume' },
            { onConflict: 'user_id,habit_name' },
          )
        error ? failed.push(p) : done.push(p)
      } else if (p.op === 'edit') {
        const { data: rows } = await supabase
          .from('weekly_habits')
          .select('day_of_week, reminder_time, time_of_day, challenge_slug, timezone')
          .eq('user_id', userId).eq('habit_name', p.habit_name).is('archived_at', null)
        if (!rows || rows.length === 0) { failed.push(p); continue }
        const existingDays = rows.map((r: any) => r.day_of_week)
        const existingTime = rows[0].reminder_time || rows[0].time_of_day || '08:00:00'
        const tz = rows[0].timezone || timezone
        const slug = rows[0].challenge_slug ?? null
        const finalTime = p.time || existingTime
        const finalDays = p.days || existingDays
        let ok = true
        // Remove days no longer wanted
        const toRemove = existingDays.filter((d: number) => !finalDays.includes(d))
        if (toRemove.length) {
          const { error } = await supabase.from('weekly_habits')
            .delete().eq('user_id', userId).eq('habit_name', p.habit_name).is('archived_at', null).in('day_of_week', toRemove)
          if (error) ok = false
        }
        // Add newly wanted days
        const toAdd = finalDays.filter((d: number) => !existingDays.includes(d))
        if (toAdd.length) {
          const { error } = await supabase.from('weekly_habits').upsert(
            toAdd.map((d: number) => ({ user_id: userId, habit_name: p.habit_name, day_of_week: d, reminder_time: finalTime, time_of_day: finalTime, timezone: tz, challenge_slug: slug })),
            { onConflict: 'user_id,habit_name,day_of_week' },
          )
          if (error) ok = false
        }
        // Update time on the kept rows
        if (p.time) {
          const { error } = await supabase.from('weekly_habits')
            .update({ reminder_time: finalTime, time_of_day: finalTime })
            .eq('user_id', userId).eq('habit_name', p.habit_name).is('archived_at', null)
          if (error) ok = false
        }
        ok ? done.push(p) : failed.push(p)
      } else if (p.op === 'add') {
        const finalTime = p.time || '08:00:00'
        const { error: cfgErr } = await supabase.from('habit_tracking_config').upsert(
          { user_id: userId, habit_name: p.habit_name, tracking_type: p.tracking_type, tracking_enabled: true },
          { onConflict: 'user_id,habit_name' },
        )
        const { error: hErr } = await supabase.from('weekly_habits').upsert(
          p.days.map((d) => ({ user_id: userId, habit_name: p.habit_name, day_of_week: d, reminder_time: finalTime, time_of_day: finalTime, timezone })),
          { onConflict: 'user_id,habit_name,day_of_week' },
        )
        cfgErr || hErr ? failed.push(p) : done.push(p)
      }
    } catch (_e) {
      failed.push(p)
    }
  }
  return { done, failed }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return emptyTwiml()
  try {
    const formData = await req.formData()
    const from = (formData.get('From')?.toString() || '').trim()
    const body = (formData.get('Body')?.toString() || '').trim()
    if (!from || !body) return emptyTwiml()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: profiles } = await supabase
      .from('profiles').select('*').eq('phone', from).is('deleted_at', null)
    if (!profiles || profiles.length === 0) return emptyTwiml()
    const profile = profiles.find((p: any) => p.challenge_type !== 'lite') || profiles[0]
    const userId = profile.id
    const timezone = profile.timezone || 'America/Chicago'
    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null

    const send = (msg: string) =>
      sendSMS({ to: from, body: msg }, { supabase, logTable: 'sms_messages', extra: { user_id: userId, user_name: userName, sent_by_type: 'system' } })

    // Active confirm session?
    const { data: session } = await supabase
      .from('sms_manage_habit_sessions')
      .select('*').eq('user_id', userId).gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    // ── Confirmation turn ────────────────────────────────────────────────────
    if (session) {
      const plan: Op[] = (session.context as any)?.plan || []
      if (isAffirmative(body)) {
        await supabase.from('sms_manage_habit_sessions').delete().eq('id', session.id)
        const { done, failed } = await executePlan(supabase, userId, timezone, plan)
        const doneMsg = done.length ? `Done: ${done.map(describeOp).join('; ')}.` : ''
        const failMsg = failed.length ? ` I couldn't ${failed.map(describeOp).join('; ')} — try again or manage them at go.summithealth.app/habits.` : ''
        await send((doneMsg + failMsg).trim() || 'Nothing to change.')
        return emptyTwiml()
      }
      if (isNegative(body)) {
        await supabase.from('sms_manage_habit_sessions').delete().eq('id', session.id)
        await send('No problem, I left everything as it is. 🌿')
        return emptyTwiml()
      }
      // Unclear reply during confirmation → re-ask once.
      await send(`Just to confirm, I'm about to ${plan.map(describeOp).join('; ')}. Reply YES to do it, or NO to cancel.`)
      return emptyTwiml()
    }

    // ── New request: extract → resolve → confirm ─────────────────────────────
    const habits = await loadHabits(supabase, userId)
    const rawOps = await extractOps(body, habits)
    const { plan, unresolved } = buildPlan(rawOps, habits)

    if (plan.length === 0) {
      const list = habits.length ? habits.map((h) => `• ${h.name}`).join('\n') : '(none yet)'
      const note = unresolved.length ? `I couldn't match: ${unresolved.join(', ')}.\n\n` : ''
      await send(`${note}Here are your current habits:\n${list}\n\nTell me what to change — e.g. “archive the walk”, “pause meditation”, “move snack to weekdays at 9am”, or “add stretching every day”.`)
      return emptyTwiml()
    }

    await supabase.from('sms_manage_habit_sessions').insert({ user_id: userId, step: 'awaiting_confirm', context: { plan } })
    const unresolvedNote = unresolved.length ? ` (I couldn't match: ${unresolved.join(', ')}.)` : ''
    await send(`Just to confirm, I'll ${plan.map(describeOp).join('; ')}.${unresolvedNote} Reply YES to do it, or NO to cancel.`)
    return emptyTwiml()
  } catch (e) {
    console.error('sms-manage-habits error:', e)
    return emptyTwiml()
  }
})
