import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://go.summithealth.app'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildTechNeckWelcomeHtml(firstName: string, confirmUrl: string, logoUrl: string, smsOptIn: boolean): string {
  const phoneNote = smsOptIn
    ? `<p style="margin: 16px 0 0 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">
        We'll verify your phone number when you log in so you can receive your daily coaching texts.
      </p>`
    : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the Tech Neck Challenge</title>
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
                Welcome to the Tech Neck Challenge, ${firstName}!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                You're one step away from joining the 5-Day Tech Neck Challenge. Over 5 days, you'll get evidence-based stretches, strengthening exercises, and posture tips — ending with a 2-minute daily routine you can keep forever.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                You're signed up! Next step: verify your phone and pay $1 to lock in your spot.
              </p>
              ${phoneNote}
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 8px 40px 30px 40px;">
              <a href="${confirmUrl}" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                View Your Challenge
              </a>
            </td>
          </tr>

          <!-- What's next -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                Your week at a glance:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #15803d; font-weight: 600; width: 100px;">Monday</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #4a4a4a;">Environment — Fix your workspace setup</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #15803d; font-weight: 600;">Tuesday</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #4a4a4a;">Release — Stretch out neck and shoulder tension</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #15803d; font-weight: 600;">Wednesday</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #4a4a4a;">Strengthen — Build muscles that prevent tech neck</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #15803d; font-weight: 600;">Thursday</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #4a4a4a;">Breathe &amp; Reset — Address the tension underneath</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #15803d; font-weight: 600;">Friday</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #4a4a4a;">Your Routine — Your 2-minute daily practice</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 4px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                See you Monday!
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { firstName, email, phone, smsConsent, timezone, password } = await req.json()

    if (!firstName || !email || !phone || !password) {
      return new Response(
        JSON.stringify({ error: 'firstName, email, phone, and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Create auth user (auto-confirmed — frontend handles sign-in, phone OTP verifies identity)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'Account already exists. Please sign in at /login.' }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        )
      }
      throw authError
    }

    const userId = authData.user.id

    // 2. Create profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      first_name: firstName,
      email,
      phone,
      sms_opt_in: smsConsent !== false,
      timezone: timezone || 'America/Chicago',
      profile_completed: true,
      challenge_type: 'lite',
    })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      throw profileError
    }

    // 3. Create enrollment
    const deliveryTrack = smsConsent === false ? 'email_only' : 'sms'
    const { error: enrollError } = await supabase.from('lite_challenge_enrollments').insert({
      user_id: userId,
      status: 'pending',
      delivery_track: deliveryTrack,
      cohort_start_date: '2026-03-30',
    })

    if (enrollError) {
      console.error('Error creating enrollment:', enrollError)
      throw enrollError
    }

    // 4. Send Tech Neck welcome email
    const logoUrl = `${FRONTEND_URL}/summit-logo.png`
    const challengeUrl = `${FRONTEND_URL}/tech-neck/status`
    const welcomeHtml = buildTechNeckWelcomeHtml(firstName, challengeUrl, logoUrl, smsConsent !== false)
    const emailResult = await sendEmail({
      to: email,
      subject: `Welcome to the Tech Neck Challenge, ${firstName}!`,
      html: welcomeHtml,
    })
    if (emailResult.success) {
      console.log(`Sent Tech Neck welcome email to ${email}`)
    } else {
      console.error(`Failed to send Tech Neck welcome email:`, emailResult.error)
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )

  } catch (error) {
    console.error('Error in create-lite-enrollment:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )
  }
})
