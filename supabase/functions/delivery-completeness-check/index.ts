import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const PROGRAM_START_DATE = Deno.env.get('PROGRAM_START_DATE') || '2026-01-12'
const ALERT_RECIPIENT = 'eric@summithealth.app'

interface MissingReminder {
  userId: string
  firstName: string
  phone: string
  habitCount: number
  earliestHabitTime: string
  timezone: string
}

interface MissingDigest {
  userId: string
  firstName: string
  email: string
}

function getCurrentWeekNumber(): number {
  const programStartDate = new Date(PROGRAM_START_DATE)
  const now = new Date()
  const diffTime = now.getTime() - programStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.floor(diffDays / 7) + 1)
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const now = new Date()
    const todayMidnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // Use CST day-of-week for business logic (not UTC — which rolls to next day at 6pm CST)
    const cstParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'short',
    }).formatToParts(now)
    const cstWeekday = cstParts.find(p => p.type === 'weekday')?.value || 'Sun'
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    const dayOfWeek = dayMap[cstWeekday] ?? 0

    console.log(`\n=== Delivery Completeness Check ===`)
    console.log(`UTC time: ${now.toISOString()}`)
    console.log(`CST day of week: ${dayOfWeek} (${cstWeekday})`)

    // -------------------------------------------------------
    // 1. SMS REMINDER COMPLETENESS (daily)
    // -------------------------------------------------------
    const { data: habitsToday, error: habitsErr } = await supabase
      .from('weekly_habits')
      .select('user_id, habit_name, reminder_time, time_of_day, day_of_week')
      .eq('day_of_week', dayOfWeek)
      .is('archived_at', null)

    if (habitsErr) {
      console.error('Error querying weekly_habits:', habitsErr)
      throw habitsErr
    }

    const habitUserIds = [...new Set((habitsToday || []).map(h => h.user_id))]

    let smsEligibleProfiles: any[] = []
    if (habitUserIds.length > 0) {
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, first_name, phone, sms_opt_in, timezone, subscription_status, trial_ends_at, challenge_type')
        .in('id', habitUserIds)
        .eq('sms_opt_in', true)
        .not('phone', 'is', null)
        .is('deleted_at', null)

      if (profilesErr) {
        console.error('Error querying profiles for SMS check:', profilesErr)
      }

      // Only include users with active subscription or valid trial (not expired trials)
      const now2 = new Date()
      smsEligibleProfiles = (profiles || []).filter(p => {
        if (p.challenge_type === 'lite') return false
        if (p.subscription_status === 'active') return true
        if (p.trial_ends_at && new Date(p.trial_ends_at) > now2) return true
        return false
      })
    }

    console.log(`SMS eligible users with habits today: ${smsEligibleProfiles.length}`)

    const { data: todayReminders, error: remErr } = await supabase
      .from('sms_reminders')
      .select('user_id')
      .gte('sent_at', todayMidnightUTC.toISOString())

    if (remErr) console.error('Error querying sms_reminders:', remErr)

    const remindedUserIds = new Set((todayReminders || []).map(r => r.user_id))

    const missingReminders: MissingReminder[] = []

    for (const profile of smsEligibleProfiles) {
      if (remindedUserIds.has(profile.id)) continue

      const userHabits = (habitsToday || []).filter(h => h.user_id === profile.id)
      if (userHabits.length === 0) continue

      const times = userHabits.map(h => h.reminder_time || h.time_of_day).filter(Boolean).sort()
      const earliestTime = times[0] || '08:00'

      const tz = profile.timezone || 'America/Chicago'
      const [hh, mm] = earliestTime.split(':').map(Number)

      try {
        const userNow = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        }).formatToParts(now)

        const userHour = parseInt(userNow.find(p => p.type === 'hour')?.value || '0')
        const userMinute = parseInt(userNow.find(p => p.type === 'minute')?.value || '0')
        const userNowMinutes = userHour * 60 + userMinute
        const habitMinutes = hh * 60 + mm

        if (userNowMinutes < habitMinutes + 30) {
          console.log(`User ${profile.first_name}: earliest habit at ${earliestTime} (${tz}) hasn't reached send window yet, skipping`)
          continue
        }
      } catch (e) {
        console.error(`Timezone error for ${profile.first_name}:`, e)
      }

      missingReminders.push({
        userId: profile.id,
        firstName: profile.first_name || 'Unknown',
        phone: profile.phone,
        habitCount: userHabits.length,
        earliestHabitTime: earliestTime,
        timezone: tz,
      })
    }

    console.log(`Missing SMS reminders: ${missingReminders.length}`)

    // -------------------------------------------------------
    // 2. WEEKLY DIGEST COMPLETENESS (Monday only)
    // -------------------------------------------------------
    const isMonday = dayOfWeek === 1
    let missingDigests: MissingDigest[] = []
    let digestDiagnostics = { weekNumber: 0, eligibleCount: 0, withDigestCount: 0 }

    if (isMonday) {
      const weekNumber = getCurrentWeekNumber()
      digestDiagnostics.weekNumber = weekNumber
      console.log(`Monday — checking digest completeness for week ${weekNumber}`)

      // Get all eligible users (profile_completed + has email + not deleted + active sub or trial)
      const { data: allProfiles, error: eligErr } = await supabase
        .from('profiles')
        .select('id, first_name, email, subscription_status, trial_ends_at')
        .eq('profile_completed', true)
        .not('email', 'is', null)
        .is('deleted_at', null)

      if (eligErr) {
        console.error('Error querying profiles for digest check:', eligErr)
        throw eligErr
      }

      const now = new Date()
      const eligibleUsers = (allProfiles || []).filter(p =>
        p.subscription_status === 'active' ||
        (p.trial_ends_at && new Date(p.trial_ends_at) > now)
      )

      // Get users who have a digest for this week
      const { data: sentDigests, error: digErr } = await supabase
        .from('weekly_digests')
        .select('user_id')
        .eq('week_number', weekNumber)

      if (digErr) {
        console.error('Error querying weekly_digests:', digErr)
        throw digErr
      }

      const digestUserIds = new Set((sentDigests || []).map(d => d.user_id))
      const eligible = eligibleUsers || []

      digestDiagnostics.eligibleCount = eligible.length
      digestDiagnostics.withDigestCount = digestUserIds.size

      for (const user of eligible) {
        if (!digestUserIds.has(user.id)) {
          missingDigests.push({
            userId: user.id,
            firstName: user.first_name || 'Unknown',
            email: user.email,
          })
        }
      }

      console.log(`Eligible users: ${eligible.length}, with digest: ${digestUserIds.size}, missing: ${missingDigests.length}`)
    } else {
      console.log(`Not Monday (day=${dayOfWeek}) — skipping digest check`)
    }

    // -------------------------------------------------------
    // 3. SEND ALERT (only if something is missing)
    // -------------------------------------------------------
    const totalMissing = missingReminders.length + missingDigests.length

    if (totalMissing === 0) {
      console.log('All deliveries accounted for — no alert needed')
      return new Response(JSON.stringify({
        message: 'All deliveries complete',
        missingSmsReminders: 0,
        missingDigests: 0,
        diagnostics: { isMonday, dayOfWeek, ...digestDiagnostics },
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build alert email
    const parts: string[] = []
    if (missingReminders.length > 0) parts.push(`${missingReminders.length} missing SMS reminder${missingReminders.length > 1 ? 's' : ''}`)
    if (missingDigests.length > 0) parts.push(`${missingDigests.length} missing digest${missingDigests.length > 1 ? 's' : ''}`)

    const subject = `[Summit] Delivery Alert: ${parts.join(', ')}`
    const timestamp = now.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' })

    let html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
<div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
  <h1 style="margin: 0 0 8px 0; font-size: 22px; color: #dc2626;">Summit Delivery Completeness Alert</h1>
  <p style="margin: 0 0 24px 0; font-size: 14px; color: #6a6a6a;">Checked at ${timestamp} CST</p>`

    if (missingReminders.length > 0) {
      html += `
  <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #1a1a1a;">Missing SMS Reminders (${missingReminders.length})</h2>
  <p style="font-size: 13px; color: #6a6a6a; margin: 0 0 8px 0;">These users had habits scheduled today but received no SMS reminder.</p>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
    <thead>
      <tr style="background: #fef2f2;">
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb;">Name</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb;">Phone</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb;">Habits</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb;">Earliest Time</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb;">Timezone</th>
      </tr>
    </thead>
    <tbody>`

      for (const m of missingReminders) {
        html += `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${m.firstName}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${m.phone}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${m.habitCount}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${m.earliestHabitTime}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${m.timezone}</td>
      </tr>`
      }

      html += `
    </tbody>
  </table>`
    }

    if (missingDigests.length > 0) {
      const weekNumber = getCurrentWeekNumber()
      html += `
  <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #1a1a1a;">Missing Weekly Digests — Week ${weekNumber} (${missingDigests.length})</h2>
  <p style="font-size: 13px; color: #6a6a6a; margin: 0 0 8px 0;">These eligible users have no digest generated for this week.</p>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
    <thead>
      <tr style="background: #fef2f2;">
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb;">Name</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb;">Email</th>
      </tr>
    </thead>
    <tbody>`

      for (const m of missingDigests) {
        html += `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${m.firstName}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${m.email}</td>
      </tr>`
      }

      html += `
    </tbody>
  </table>`
    }

    // Troubleshooting section — always included with relevant queries
    html += `
  <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
    <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #1a1a1a;">Troubleshooting</h3>
    <p style="font-size: 13px; color: #4a4a4a; margin: 0 0 8px 0;">Common causes: cron job didn't fire, edge function timed out mid-execution, or a deployment issue.</p>
    <ol style="font-size: 13px; color: #4a4a4a; margin: 0; padding-left: 20px;">`

    if (missingReminders.length > 0) {
      html += `
      <li style="margin-bottom: 8px;"><strong>Did send-sms-reminders run?</strong><br>
        <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;">SELECT * FROM cron.job_run_details WHERE jobname = 'send-sms-reminders' ORDER BY start_time DESC LIMIT 5;</code>
      </li>`
    }

    if (missingDigests.length > 0) {
      html += `
      <li style="margin-bottom: 8px;"><strong>Did generate-all-weekly-digests run?</strong><br>
        <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;">SELECT * FROM cron.job_run_details WHERE jobname = 'generate-weekly-digests' ORDER BY start_time DESC LIMIT 5;</code>
      </li>
      <li style="margin-bottom: 8px;"><strong>Did send-all-weekly-digests run?</strong><br>
        <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;">SELECT * FROM cron.job_run_details WHERE jobname = 'send-weekly-digests' ORDER BY start_time DESC LIMIT 5;</code>
      </li>`
    }

    html += `
      <li style="margin-bottom: 8px;"><strong>Check HTTP responses</strong><br>
        <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;">SELECT id, status_code, content::text FROM net._http_response ORDER BY id DESC LIMIT 10;</code>
      </li>
      <li style="margin-bottom: 8px;"><strong>Check function logs</strong><br>
        <a href="https://supabase.com/dashboard/project/oxszevplpzmzmeibjtdz/functions" style="color: #2563eb;">Supabase Dashboard &rarr; Edge Functions</a> &mdash; look for errors or timeouts
      </li>
      <li><strong>Re-run manually</strong><br>`

    if (missingReminders.length > 0) {
      html += `<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;">SELECT call_edge_function('send-sms-reminders');</code><br>`
    }
    if (missingDigests.length > 0) {
      html += `<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;">SELECT call_edge_function('generate-all-weekly-digests');</code><br>`
      html += `<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;">SELECT call_edge_function('send-all-weekly-digests');</code>`
    }

    html += `
      </li>
    </ol>
  </div>
  <p style="font-size: 12px; color: #9a9a9a; margin: 16px 0 0 0;">
    This check runs daily at 3PM UTC (9AM CST). It detects deliveries that were expected but never happened —
    the daily health report (1PM UTC) only catches explicit failures.
  </p>
</div>
</body></html>`

    const result = await sendEmail({
      to: ALERT_RECIPIENT,
      subject,
      html,
    })

    if (!result.success) {
      console.error('Failed to send alert email:', result.error)
      return new Response(JSON.stringify({
        error: 'Failed to send alert',
        details: result.error,
        missingSmsReminders: missingReminders.length,
        missingDigests: missingDigests.length,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Alert sent: ${subject}`)

    return new Response(JSON.stringify({
      message: 'Delivery alert sent',
      missingSmsReminders: missingReminders.length,
      missingDigests: missingDigests.length,
      missingReminderUsers: missingReminders.map(m => m.firstName),
      missingDigestUsers: missingDigests.map(m => m.firstName),
      diagnostics: { isMonday, dayOfWeek, ...digestDiagnostics },
      resendId: result.id,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in delivery-completeness-check:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
