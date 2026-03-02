import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

/**
 * Build the Day 1 welcome email — Founder letter from Coach Eric
 */
function buildEmailHtml(firstName: string): string {
  const appUrl = 'https://go.summithealth.app'
  const logoUrl = 'https://go.summithealth.app/summit-logo.png'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Summit</title>
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
                Welcome to Summit, ${firstName}!
              </h1>
            </td>
          </tr>

          <!-- Founder intro -->
          <tr>
            <td style="padding: 0 40px 16px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                I hope you're as excited as I am for you to begin your journey to your health peak.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Over the last 10 years, I've personally battled with anxiety, high cholesterol, and signs of inflammation. While medical advice was useful, I found that <strong>behavior change</strong> was the hardest part. Going it alone was difficult, but I found coaches and resources that helped me get there.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                I wanted to take what I learned — as both a person and a certified health coach — and build something that brings you personalized support, motivation, and the flexibility to "get health done" your way.
              </p>
            </td>
          </tr>

          <!-- Core Principles -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                Core principles that define Summit:
              </p>

              <!-- Principle 1 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                <tr>
                  <td style="width: 50px; vertical-align: top; padding-top: 2px;">
                    <div style="width: 40px; height: 40px; background-color: #dcfce7; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 20px;">&#127956;</span>
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                      Your vision first.
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">
                      Health and wellness is personal. We use your own words to reinforce you along your journey — not words from gurus.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Principle 2 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                <tr>
                  <td style="width: 50px; vertical-align: top; padding-top: 2px;">
                    <div style="width: 40px; height: 40px; background-color: #dcfce7; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 20px;">&#127793;</span>
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                      Your habits.
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">
                      You know what works for you. Healthy habits can be molded and flexible — for example, "movement" can mean whatever excites you, for whatever amount of time fits your life.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Principle 3 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                <tr>
                  <td style="width: 50px; vertical-align: top; padding-top: 2px;">
                    <div style="width: 40px; height: 40px; background-color: #dcfce7; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 20px;">&#128336;</span>
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                      Your pace.
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">
                      Life is busy for all of us. What matters most is careful reflection on what worked, what didn't, and how you want to move forward. We celebrate that — not streaks and pressure.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Principle 4 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 50px; vertical-align: top; padding-top: 2px;">
                    <div style="width: 40px; height: 40px; background-color: #dcfce7; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 20px;">&#129309;</span>
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                      Human support.
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">
                      As a coach, I know there are times when just listening and being heard make all the difference. Our Plus and Premium plans offer the right mix of coaching to complement the daily experience.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What's next -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Over the next few days, I'll send you an email each morning to help you take advantage of the platform and prepare for the weekly framework that Summit supports.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <a href="${appUrl}/dashboard" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Go to Summit
              </a>
            </td>
          </tr>

          <!-- Footer / Signoff -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 4px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                I'm honored you're here.
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
  // Handle CORS preflight
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
    // Parse request body
    let userId: string | null = null
    let testEmail: string | null = null
    let testName: string = 'Friend'
    try {
      const body = await req.json()
      userId = body.userId || null
      testEmail = body.testEmail || null
      testName = body.testName || 'Friend'
    } catch {
      // No body or invalid JSON
    }

    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if Resend is configured
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Test mode: send a single test email
    if (testEmail) {
      console.log(`Test mode: sending welcome email to ${testEmail}`)
      const subject = `Welcome to Summit, ${testName}!`
      const html = buildEmailHtml(testName)

      const result = await sendEmail({ to: testEmail, subject, html })

      if (result.success) {
        return new Response(
          JSON.stringify({ message: 'Test welcome email sent', email: testEmail, resendId: result.id }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to send test email', details: result.error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Production mode: send welcome email to a specific user
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'User not found', details: profileError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.email) {
      return new Response(
        JSON.stringify({ error: 'User has no email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if we've already sent a welcome email to this user
    const { data: existingEmail, error: existingError } = await supabase
      .from('email_reminders')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'welcome')
      .limit(1)

    if (existingError) {
      console.error('Error checking existing emails:', existingError)
    }

    if (existingEmail && existingEmail.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Welcome email already sent to this user', userId }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send the welcome email
    const firstName = profile.first_name || 'Friend'
    const subject = `Welcome to Summit, ${firstName}!`
    const html = buildEmailHtml(firstName)

    console.log(`Sending welcome email to ${profile.email} (${userId})`)

    const result = await sendEmail({ to: profile.email, subject, html })

    if (result.success) {
      // Log successful email
      await supabase.from('email_reminders').insert({
        user_id: userId,
        email: profile.email,
        email_type: 'welcome',
        subject: subject,
        status: 'sent',
        resend_id: result.id,
      })

      console.log(`✓ Sent welcome email to ${profile.email}`)

      return new Response(
        JSON.stringify({
          message: 'Welcome email sent',
          userId,
          email: profile.email,
          resendId: result.id,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      // Log failed email
      await supabase.from('email_reminders').insert({
        user_id: userId,
        email: profile.email,
        email_type: 'welcome',
        subject: subject,
        status: 'failed',
        error_message: result.error,
      })

      console.error(`✗ Failed to send welcome email to ${profile.email}:`, result.error)

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in send-welcome-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
