import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'
import {
  getLiteChallenge,
  getMessage,
  isContentReady,
  dailySubject,
  summarySubject,
  type LiteChallenge,
} from '../_shared/lite_challenges.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://go.summithealth.app'

// Slot labels for email formatting
const SLOT_LABELS: Record<string, string> = {
  '8am': 'Morning',
  '10am': 'Mid-morning',
  '12pm': 'Lunch',
  '3pm': 'Afternoon',
  '5pm': 'End of Day',
}

const SLOTS = ['8am', '10am', '12pm', '3pm', '5pm']

/**
 * Compute challenge day number from cohort_start_date and user's local date
 */
function getChallengeDay(cohortStartDate: string, localDateStr: string): number {
  const start = new Date(cohortStartDate + 'T00:00:00')
  const local = new Date(localDateStr + 'T00:00:00')
  const diffMs = local.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays + 1
}

function getLocalDateStr(timezone: string): string {
  try {
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return dateFormatter.format(new Date())
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Build daily morning email HTML
 */
function buildDailyEmailHtml(firstName: string, day: number, deliveryTrack: string, challenge: LiteChallenge): string {
  const theme = challenge.dayThemes[day]
  const logoUrl = `${FRONTEND_URL}/summit-logo.png`

  let contentHtml = ''

  if (deliveryTrack === 'sms') {
    // SMS-track users get a short overview
    contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
        Today's theme is <strong>${theme.title}</strong> &mdash; ${theme.subtitle.toLowerCase()}.
      </p>
      <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
        Watch for 5 texts today with detailed guidance. Each one builds on the last.
      </p>
    `
  } else {
    // Email-only users get all 5 messages
    const messageBlocks = SLOTS.map(slot => {
      const label = SLOT_LABELS[slot]
      const message = getMessage(challenge, day, slot, 'email') || ''
      return `
        <div style="margin-bottom: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #15803d;">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em;">
            ${label}
          </p>
          <p style="margin: 0; font-size: 15px; color: #4a4a4a; line-height: 1.7;">
            ${message}
          </p>
        </div>
      `
    }).join('')

    contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
        Today's theme: <strong>${theme.title}</strong> &mdash; ${theme.subtitle.toLowerCase()}. Here are your 5 coaching cues for the day:
      </p>
      ${messageBlocks}
    `
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${challenge.displayName} - Day ${day}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${logoUrl}" alt="Summit" width="120" style="display: block; max-width: 120px; height: auto;">
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 0 40px 8px 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: #15803d; text-transform: uppercase; letter-spacing: 0.15em;">
                ${challenge.brandLine}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 20px 40px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                Day ${day}: ${theme.title}
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 16px; color: #6a6a6a;">
                ${theme.subtitle}
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Good morning, ${firstName}!
              </p>
              ${contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 4px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Keep going,
              </p>
              <p style="margin: 8px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                <strong>Coach Eric</strong><br>
                <span style="font-size: 14px; color: #6a6a6a;">Summit Founder</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Build end-of-challenge summary email HTML
 */
function buildSummaryEmailHtml(firstName: string, challenge: LiteChallenge): string {
  const logoUrl = `${FRONTEND_URL}/summit-logo.png`
  const appUrl = FRONTEND_URL

  const recapRowsHtml = challenge.weekRecap.map((entry, idx) => {
    const isFirst = idx === 0
    const isLast = idx === challenge.weekRecap.length - 1
    const radius = isFirst ? '8px 8px 0 0' : isLast ? '0 0 8px 8px' : '0'
    const borderBottom = isLast ? 'none' : '1px solid #e5e7eb'
    return `
                <tr>
                  <td style="padding: 12px 16px; background-color: #f0fdf4; border-radius: ${radius}; ${borderBottom !== 'none' ? `border-bottom: ${borderBottom};` : ''}">
                    <strong style="color: #15803d;">${entry.dayLabel}:</strong> <span style="color: #4a4a4a;">${entry.theme} &mdash; ${entry.description}</span>
                  </td>
                </tr>
    `
  }).join('')

  const routineItemsHtml = challenge.routine.items.map((item, idx) => `
                  <tr>
                    <td style="padding: 6px 0; font-size: 16px; color: #1a1a1a;">
                      ${idx + 1}. ${item}
                    </td>
                  </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${challenge.displayName} Complete!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${logoUrl}" alt="Summit" width="120" style="display: block; max-width: 120px; height: auto;">
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 0 40px 20px 40px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                Challenge Complete, ${firstName}!
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 16px; color: #6a6a6a;">
                Here's everything you learned this week
              </p>
            </td>
          </tr>
          <!-- Week Recap -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                Your Week at a Glance
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${recapRowsHtml}
              </table>
            </td>
          </tr>
          <!-- 2-Minute Routine -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <div style="padding: 20px; background-color: #f0fdf4; border-radius: 12px; border: 2px solid #15803d;">
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #15803d; text-align: center;">
                  ${challenge.routine.title}
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${routineItemsHtml}
                </table>
                <p style="margin: 12px 0 0 0; font-size: 14px; color: #6a6a6a; text-align: center;">
                  ${challenge.routine.footer}
                </p>
              </div>
            </td>
          </tr>
          <!-- What's Next -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                What's Next?
              </p>
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                ${challenge.summary.whatsNext}
              </p>
            </td>
          </tr>
          <!-- CTA: Join Summit -->
          <tr>
            <td align="center" style="padding: 0 40px 16px 40px;">
              <a href="${appUrl}/pricing" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Join Summit
              </a>
            </td>
          </tr>
          <!-- Share the Challenge -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <div style="background-color: #f0fdf4; border-radius: 12px; padding: 24px; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                  ${challenge.summary.sharePromptHeading}
                </p>
                <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
                  ${challenge.summary.sharePromptBody}
                </p>
                <a href="${appUrl}${challenge.routePath}" style="display: inline-block; padding: 14px 28px; background-color: #ffffff; color: #15803d; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; border: 2px solid #15803d;">
                  Share the Challenge
                </a>
              </div>
            </td>
          </tr>
          <!-- CTA: Instagram -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <a href="https://instagram.com/summithealthcoach" style="font-size: 15px; color: #15803d; text-decoration: underline;">
                Follow @summithealthcoach on Instagram
              </a>
            </td>
          </tr>
          <!-- Footer / Signoff -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 4px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Proud of you for showing up this week.
              </p>
              <p style="margin: 8px 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Best,<br>
                <strong>Coach Eric</strong><br>
                <span style="font-size: 14px; color: #6a6a6a;">Summit Founder</span>
              </p>
              <p style="margin: 0; font-size: 13px; color: #9a9a9a; text-align: center; line-height: 1.5;">
                Questions? Just reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
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

    console.log(`Running lite challenge email send at ${new Date().toISOString()}`)

    // Get all paid/active/completed enrollments with profile
    const { data: enrollments, error: enrollError } = await supabase
      .from('lite_challenge_enrollments')
      .select('id, user_id, status, delivery_track, cohort_start_date, completed_at, challenge_slug')
      .in('status', ['paid', 'active', 'completed'])

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError)
      throw enrollError
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No enrollments to email', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    const results: Array<{ userId: string; slug: string; type: string; status: string; error?: string }> = []

    for (const enrollment of enrollments) {
      const challenge = getLiteChallenge(enrollment.challenge_slug)
      if (!challenge) {
        console.warn(`No registry entry for challenge_slug=${enrollment.challenge_slug} (enrollment ${enrollment.id}) — skipping`)
        continue
      }
      if (!isContentReady(challenge)) {
        console.warn(`Challenge ${enrollment.challenge_slug} content not ready — skipping enrollment ${enrollment.id}`)
        continue
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, timezone')
        .eq('id', enrollment.user_id)
        .single()

      if (!profile?.email) continue

      const firstName = profile.first_name || 'Friend'
      const timezone = profile.timezone || 'America/Chicago'
      const localDateStr = getLocalDateStr(timezone)
      const challengeDay = getChallengeDay(enrollment.cohort_start_date, localDateStr)

      // 1. Summary email for completed enrollments
      if (enrollment.completed_at) {
        // Check if summary already sent
        const { error: dedupError } = await supabase.from('lite_challenge_sms_log').insert({
          enrollment_id: enrollment.id,
          user_id: enrollment.user_id,
          challenge_day: 5,
          message_slot: 'summary_email',
          delivery_method: 'email',
        })

        if (dedupError) {
          if (dedupError.code === '23505') continue // Already sent
          console.error(`Summary dedup error for ${enrollment.user_id}:`, dedupError)
          continue
        }

        const html = buildSummaryEmailHtml(firstName, challenge)
        const emailResult = await sendEmail({
          to: profile.email,
          subject: summarySubject(challenge, firstName),
          html,
        })

        // Update log with resend_id
        if (emailResult.success && emailResult.id) {
          await supabase.from('lite_challenge_sms_log')
            .update({ resend_id: emailResult.id })
            .eq('enrollment_id', enrollment.id)
            .eq('challenge_day', 5)
            .eq('message_slot', 'summary_email')
        }

        results.push({
          userId: enrollment.user_id,
          slug: enrollment.challenge_slug,
          type: 'summary',
          status: emailResult.success ? 'sent' : 'failed',
          error: emailResult.error,
        })

        console.log(`Summary email ${emailResult.success ? 'sent' : 'failed'} to ${enrollment.user_id} (${enrollment.challenge_slug})`)
        continue
      }

      // 2. Daily morning email for active enrollments
      if (challengeDay < 1 || challengeDay > 5) continue
      if (enrollment.status !== 'paid' && enrollment.status !== 'active') continue

      // Dedup daily email
      const { error: dedupError } = await supabase.from('lite_challenge_sms_log').insert({
        enrollment_id: enrollment.id,
        user_id: enrollment.user_id,
        challenge_day: challengeDay,
        message_slot: 'daily_email',
        delivery_method: 'email',
      })

      if (dedupError) {
        if (dedupError.code === '23505') continue // Already sent
        console.error(`Daily email dedup error for ${enrollment.user_id}:`, dedupError)
        continue
      }

      const html = buildDailyEmailHtml(firstName, challengeDay, enrollment.delivery_track, challenge)
      const subject = dailySubject(challenge, challengeDay)

      const emailResult = await sendEmail({ to: profile.email, subject, html })

      // Update log with resend_id
      if (emailResult.success && emailResult.id) {
        await supabase.from('lite_challenge_sms_log')
          .update({ resend_id: emailResult.id })
          .eq('enrollment_id', enrollment.id)
          .eq('challenge_day', challengeDay)
          .eq('message_slot', 'daily_email')
      }

      results.push({
        userId: enrollment.user_id,
        slug: enrollment.challenge_slug,
        type: 'daily',
        status: emailResult.success ? 'sent' : 'failed',
        error: emailResult.error,
      })

      console.log(`Daily email (day ${challengeDay}, ${enrollment.challenge_slug}) ${emailResult.success ? 'sent' : 'failed'} to ${enrollment.user_id}`)
    }

    return new Response(
      JSON.stringify({
        message: 'Lite challenge email send complete',
        emailsSent: results.filter(r => r.status === 'sent').length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-lite-challenge-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
