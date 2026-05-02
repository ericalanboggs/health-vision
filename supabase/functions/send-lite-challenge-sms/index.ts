import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'
import { getLiteChallenge, getMessage, isContentReady } from '../_shared/lite_challenges.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const TWILIO_ACCOUNT_SID_LITE = Deno.env.get('TWILIO_ACCOUNT_SID_LITE')
const TWILIO_AUTH_TOKEN_LITE = Deno.env.get('TWILIO_AUTH_TOKEN_LITE')
const TWILIO_PHONE_NUMBER_LITE = Deno.env.get('TWILIO_PHONE_NUMBER_LITE')

// Slot schedule: local hour for each slot
const SLOT_SCHEDULE: Record<string, number> = {
  '8am': 8,
  '10am': 10,
  '12pm': 12,
  '3pm': 15,
  '5pm': 17,
}

/**
 * Get current time in a specific timezone
 */
function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; dayOfWeek: number; dateStr: string } {
  try {
    const now = new Date()
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    })
    const timeParts = timeFormatter.formatToParts(now)
    const hours = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0')
    const minutes = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0')
    const weekdayStr = timeParts.find(p => p.type === 'weekday')?.value || 'Sun'

    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    }
    const dayOfWeek = dayMap[weekdayStr] ?? 0

    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const dateStr = dateFormatter.format(now)

    return { hours, minutes, dayOfWeek, dateStr }
  } catch {
    const now = new Date()
    return {
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
      dayOfWeek: now.getUTCDay(),
      dateStr: now.toISOString().split('T')[0],
    }
  }
}

/**
 * Compute challenge day number from cohort_start_date and user's local date
 */
function getChallengeDay(cohortStartDate: string, localDateStr: string): number {
  const start = new Date(cohortStartDate + 'T00:00:00')
  const local = new Date(localDateStr + 'T00:00:00')
  const diffMs = local.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays + 1 // Day 1 = start date
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

    console.log(`Running lite challenge SMS send at ${new Date().toISOString()}`)

    // Get enrollments that are paid or active, joined with profile
    const { data: enrollments, error: enrollError } = await supabase
      .from('lite_challenge_enrollments')
      .select('id, user_id, status, delivery_track, cohort_start_date, challenge_slug')
      .in('status', ['paid', 'active'])

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError)
      throw enrollError
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active enrollments', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${enrollments.length} paid/active enrollments`)

    const results: Array<{ userId: string; slug: string; day: number; slot: string; status: string; error?: string }> = []

    for (const enrollment of enrollments) {
      // Look up challenge content from registry
      const challenge = getLiteChallenge(enrollment.challenge_slug)
      if (!challenge) {
        console.warn(`No registry entry for challenge_slug=${enrollment.challenge_slug} (enrollment ${enrollment.id}) — skipping`)
        continue
      }
      if (!isContentReady(challenge)) {
        console.warn(`Challenge ${enrollment.challenge_slug} content not ready — skipping enrollment ${enrollment.id}`)
        continue
      }

      // Get profile for this user
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, timezone, first_name')
        .eq('id', enrollment.user_id)
        .single()

      if (!profile) {
        console.log(`No profile for user ${enrollment.user_id}`)
        continue
      }

      // Only send SMS to SMS-track users
      if (enrollment.delivery_track !== 'sms') {
        continue
      }

      if (!profile.phone) {
        console.log(`No phone for user ${enrollment.user_id}`)
        continue
      }

      const timezone = profile.timezone || 'America/Chicago'
      const localTime = getCurrentTimeInTimezone(timezone)
      const challengeDay = getChallengeDay(enrollment.cohort_start_date, localTime.dateStr)

      // Skip weekends, not-yet-started, or finished
      if (challengeDay < 1 || challengeDay > 5) {
        if (challengeDay > 5 && enrollment.status !== 'completed') {
          // Mark completed
          await supabase.from('lite_challenge_enrollments')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', enrollment.id)
          console.log(`Enrollment ${enrollment.id} marked completed (past day 5)`)
        }
        continue
      }

      // Weekend check (shouldn't happen if cohort starts Monday, but be safe)
      if (localTime.dayOfWeek === 0 || localTime.dayOfWeek === 6) {
        continue
      }

      // If day 1 and status is 'paid', activate
      if (challengeDay === 1 && enrollment.status === 'paid') {
        await supabase.from('lite_challenge_enrollments')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', enrollment.id)
        console.log(`Enrollment ${enrollment.id} activated (day 1)`)
      }

      // Check each SMS slot
      for (const [slot, slotHour] of Object.entries(SLOT_SCHEDULE)) {
        const userTimeInMinutes = localTime.hours * 60 + localTime.minutes
        const slotTimeInMinutes = slotHour * 60
        const timeDiff = userTimeInMinutes - slotTimeInMinutes

        // Send if within 0-29 minute window after slot time (two cron cycles)
        if (timeDiff < 0 || timeDiff > 29) {
          continue
        }

        const message = getMessage(challenge, challengeDay, slot, 'sms')
        if (!message) continue

        // Dedup check — try insert, unique constraint prevents duplicates
        const { error: logError } = await supabase.from('lite_challenge_sms_log').insert({
          enrollment_id: enrollment.id,
          user_id: enrollment.user_id,
          challenge_day: challengeDay,
          message_slot: slot,
          delivery_method: 'sms',
        })

        if (logError) {
          // Unique constraint violation = already sent
          if (logError.code === '23505') {
            continue
          }
          console.error(`Error logging SMS for ${enrollment.user_id} day ${challengeDay} ${slot}:`, logError)
          continue
        }

        // Send SMS via second Twilio number
        const smsResult = await sendSMS(
          { to: profile.phone, body: message, from: TWILIO_PHONE_NUMBER_LITE, accountSid: TWILIO_ACCOUNT_SID_LITE, authToken: TWILIO_AUTH_TOKEN_LITE },
          {
            supabase,
            logTable: 'sms_messages',
            extra: { user_id: enrollment.user_id, user_name: profile.first_name || null },
          }
        )

        // Update log with twilio_sid
        if (smsResult.success && smsResult.sid) {
          await supabase.from('lite_challenge_sms_log')
            .update({ twilio_sid: smsResult.sid })
            .eq('enrollment_id', enrollment.id)
            .eq('challenge_day', challengeDay)
            .eq('message_slot', slot)
        }

        results.push({
          userId: enrollment.user_id,
          slug: enrollment.challenge_slug,
          day: challengeDay,
          slot,
          status: smsResult.success ? 'sent' : 'failed',
          error: smsResult.error,
        })

        console.log(`SMS ${smsResult.success ? 'sent' : 'failed'}: user ${enrollment.user_id}, slug ${enrollment.challenge_slug}, day ${challengeDay}, slot ${slot}`)
      }

      // Check if day 5 is complete (all 5 slots sent)
      if (challengeDay === 5) {
        const { count } = await supabase
          .from('lite_challenge_sms_log')
          .select('*', { count: 'exact', head: true })
          .eq('enrollment_id', enrollment.id)
          .eq('challenge_day', 5)
          .in('message_slot', ['8am', '10am', '12pm', '3pm', '5pm'])

        if (count === 5) {
          await supabase.from('lite_challenge_enrollments')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', enrollment.id)
          console.log(`Enrollment ${enrollment.id} completed (all day 5 slots sent)`)
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Lite challenge SMS check complete',
        smsSent: results.filter(r => r.status === 'sent').length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-lite-challenge-sms:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
