import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const APP_URL = 'https://go.summithealth.app'
const LOGO_URL = 'https://go.summithealth.app/summit-logo.png'

// ─── Email chrome ────────────────────────────────────────────────────

function wrapEmail(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${LOGO_URL}" alt="Summit" width="120" style="display: block; max-width: 120px; height: auto;">
            </td>
          </tr>
${bodyHtml}
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #9a9a9a; text-align: center; line-height: 1.5;">
                You're receiving this email because you signed up for Summit.<br>
                Questions? Just reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function heading(text: string): string {
  return `
          <tr>
            <td align="center" style="padding: 0 40px 20px 40px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                ${text}
              </h1>
            </td>
          </tr>`
}

function paragraph(text: string): string {
  return `
          <tr>
            <td style="padding: 0 40px 16px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                ${text}
              </p>
            </td>
          </tr>`
}

function ctaButton(label: string, url: string): string {
  return `
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <a href="${url}" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                ${label}
              </a>
            </td>
          </tr>`
}

function signoff(): string {
  return `
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Best,<br>
                <strong>Coach Eric</strong><br>
                <span style="font-size: 14px; color: #6a6a6a;">Summit Founder</span>
              </p>
            </td>
          </tr>`
}

function spacer(px: number = 10): string {
  return `
          <tr><td style="height: ${px}px;"></td></tr>`
}

// ─── Drip email templates ────────────────────────────────────────────

function buildDrip1Html(firstName: string): string {
  const body = [
    heading('Your trial ended — here\'s what you built'),
    paragraph(`Hi ${firstName} — your 7-day Summit trial has ended. Before you decide what's next, here's a quick look at what you started:`),
    paragraph(`You defined your health vision, set up habits, and started building a routine. That foundation doesn't disappear — it's waiting for you.`),
    paragraph(`If Summit was helpful, pick a plan to keep your habits, reflections, and weekly digests going. If you're not ready yet, no pressure.`),
    spacer(10),
    ctaButton('Choose a Plan', `${APP_URL}/pricing`),
    signoff(),
  ].join('')

  return wrapEmail('Your trial ended', body)
}

function buildDrip2Html(firstName: string): string {
  const body = [
    heading('Still thinking about it?'),
    paragraph(`Hi ${firstName} — we know choosing a wellness tool is personal. Here's what subscribers tell us makes Summit different:`),
    paragraph(`<strong>It meets you where you are.</strong> No guilt, no streaks, no pressure to be perfect. Summit adapts when life gets messy — which it always does.`),
    paragraph(`<strong>Real coaching, real humans.</strong> Plus and Premium plans include sessions with a trained health coach who helps you work through challenges and stay on track.`),
    paragraph(`<strong>It actually sticks.</strong> By focusing on just a few habits at a time, Summit users build routines that last — not ones that burn out in a week.`),
    spacer(10),
    ctaButton('View Plans', `${APP_URL}/pricing`),
    signoff(),
  ].join('')

  return wrapEmail('Still thinking about it?', body)
}

function buildDrip3Html(firstName: string): string {
  const body = [
    heading('Last note from us'),
    paragraph(`Hi ${firstName} — this is the last email we'll send about your trial. We respect your time and your inbox.`),
    paragraph(`If Summit isn't the right fit right now, we completely understand. Your account and everything you set up will be here if you ever want to come back.`),
    paragraph(`And if you do want to keep going, the door is always open.`),
    spacer(10),
    ctaButton('Come Back Anytime', `${APP_URL}/pricing`),
    paragraph(`Wishing you well on your health journey, wherever it takes you.`),
    signoff(),
  ].join('')

  return wrapEmail('Last note from us', body)
}

// ─── Drip schedule ───────────────────────────────────────────────────

interface DripEmail {
  emailNumber: number
  daysAfterExpiry: number
  subject: (firstName: string) => string
  buildHtml: (firstName: string) => string
}

const DRIP_EMAILS: DripEmail[] = [
  {
    emailNumber: 1,
    daysAfterExpiry: 1,
    subject: (name) => `${name}, your trial ended — here's what you built`,
    buildHtml: buildDrip1Html,
  },
  {
    emailNumber: 2,
    daysAfterExpiry: 3,
    subject: () => `Still thinking about it?`,
    buildHtml: buildDrip2Html,
  },
  {
    emailNumber: 3,
    daysAfterExpiry: 5,
    subject: () => `Last note from us`,
    buildHtml: buildDrip3Html,
  },
]

// ─── Handler ─────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

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
    console.log(`Running trial drip email check at ${now.toISOString()}`)

    // Find users whose trial has expired, no active subscription, not deleted
    // Look back up to 6 days (covers all 3 drip emails: day 1, 3, 5 post-expiry)
    const sixDaysAgo = new Date(now)
    sixDaysAgo.setUTCDate(sixDaysAgo.getUTCDate() - 6)

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, email, trial_ends_at')
      .is('deleted_at', null)
      .is('subscription_status', null)
      .not('email', 'is', null)
      .not('trial_ends_at', 'is', null)
      .lte('trial_ends_at', now.toISOString())
      .gte('trial_ends_at', sixDaysAgo.toISOString())

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`Found ${profiles?.length || 0} users with recently expired trials`)

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No trial drip emails to send', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check which drip emails have already been sent
    const userIds = profiles.map(p => p.id)
    const { data: existingDrips } = await supabase
      .from('sms_messages')
      .select('user_id, body')
      .in('user_id', userIds)
      .eq('sent_by_type', 'trial_drip')
      .eq('direction', 'outbound')

    // Build set of "userId:emailNumber" for dedup
    // We store the email number in the body field for dedup tracking
    const sentSet = new Set<string>()
    for (const drip of (existingDrips || [])) {
      // Extract email number from the body (stored as "trial_drip_1", "trial_drip_2", "trial_drip_3")
      const match = drip.body?.match(/trial_drip_(\d+)/)
      if (match) {
        sentSet.add(`${drip.user_id}:${match[1]}`)
      }
    }

    let sent = 0
    let skipped = 0
    let failed = 0
    const results: Array<{ userId: string; email: string; emailNumber: number; status: string }> = []

    for (const profile of profiles) {
      const trialEndDate = new Date(profile.trial_ends_at)
      const daysSinceExpiry = Math.floor((now.getTime() - trialEndDate.getTime()) / (1000 * 60 * 60 * 24))

      for (const drip of DRIP_EMAILS) {
        // Only send if the user is at the right day post-expiry
        if (daysSinceExpiry !== drip.daysAfterExpiry) continue

        // Dedup check
        const key = `${profile.id}:${drip.emailNumber}`
        if (sentSet.has(key)) {
          skipped++
          continue
        }

        const firstName = profile.first_name || 'there'
        const subject = drip.subject(firstName)
        const html = drip.buildHtml(firstName)

        const result = await sendEmail({ to: profile.email, subject, html })

        if (result.success) {
          // Log to sms_messages for dedup tracking
          await supabase.from('sms_messages').insert({
            direction: 'outbound',
            user_id: profile.id,
            phone: null,
            body: `trial_drip_${drip.emailNumber}`,
            sent_by_type: 'trial_drip',
            twilio_status: 'sent',
          })

          results.push({ userId: profile.id, email: profile.email, emailNumber: drip.emailNumber, status: 'sent' })
          console.log(`✓ Drip email ${drip.emailNumber} sent to ${profile.email}`)
          sent++
        } else {
          results.push({ userId: profile.id, email: profile.email, emailNumber: drip.emailNumber, status: 'failed' })
          console.error(`✗ Failed drip email ${drip.emailNumber} to ${profile.email}: ${result.error}`)
          failed++
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Trial drip email check complete',
        profilesChecked: profiles.length,
        sent,
        skipped,
        failed,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-trial-drip-emails:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
