import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Summit <hello@summithealth.app>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

/**
 * Build the invitation email HTML
 */
function buildEmailHtml(): string {
  const appUrl = 'https://summit-pilot.vercel.app/login'
  const logoUrl = 'https://summit-pilot.vercel.app/summit-logo.png'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Been Granted Access to Summit</title>
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
                You've Been Granted Access!
              </h1>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 0 40px 25px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Great news! You've been invited to join the <strong>Summit Pilot Program</strong> - a 3-week experiment in sustainable health change.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Summit helps you reach your health goals not through dramatic overhauls, but through <strong>small, consistent habits</strong> built into your daily life. The climb happens one step at a time.
              </p>
            </td>
          </tr>

          <!-- Features Section -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                Here's what you'll get:
              </p>

              <!-- Feature 1: Vision -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="width: 50px; vertical-align: top; padding-top: 2px;">
                    <div style="width: 40px; height: 40px; background-color: #dcfce7; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 20px;">&#127956;</span>
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                      Define Your Vision
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.5;">
                      Capture your "why" - the health goals that matter most to you.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Feature 2: Habits -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="width: 50px; vertical-align: top; padding-top: 2px;">
                    <div style="width: 40px; height: 40px; background-color: #dcfce7; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 20px;">&#127793;</span>
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                      AI-Powered Habit Suggestions
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.5;">
                      Get personalized habit recommendations based on your goals.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Feature 3: SMS Support -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="width: 50px; vertical-align: top; padding-top: 2px;">
                    <div style="width: 40px; height: 40px; background-color: #dcfce7; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 20px;">&#128172;</span>
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                      SMS Check-ins
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.5;">
                      Get friendly text reminders and log progress by replying.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Feature 4: Reflection -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 50px; vertical-align: top; padding-top: 2px;">
                    <div style="width: 40px; height: 40px; background-color: #dcfce7; border-radius: 10px; text-align: center; line-height: 40px;">
                      <span style="font-size: 20px;">&#128221;</span>
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                      Weekly Reflection
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.5;">
                      Reflect on what's working and adjust as you go.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <a href="${appUrl}" style="display: inline-block; padding: 16px 32px; background-color: #10B981; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Begin My Ascent
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6a6a6a; text-align: center; line-height: 1.5;">
                We're excited to have you join us on this journey.
              </p>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #6a6a6a; text-align: center; line-height: 1.5;">
                - Eric & the Summit Team
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
    const { email } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
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

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Check if we've already sent an invite to this email
    const { data: existingInvite } = await supabase
      .from('pilot_invites')
      .select('id, email_sent_at')
      .eq('email', email.toLowerCase())
      .single()

    // Send the invitation email
    const subject = "You've Been Granted Access to Summit!"
    const html = buildEmailHtml()

    console.log(`Sending invitation email to ${email}`)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: email.toLowerCase(),
        subject: subject,
        html: html,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      // Update the invite record with email sent timestamp
      await supabase
        .from('pilot_invites')
        .upsert({
          email: email.toLowerCase(),
          email_sent_at: new Date().toISOString(),
          resend_id: data.id
        }, {
          onConflict: 'email'
        })

      console.log(`✓ Sent invitation email to ${email}`)

      return new Response(
        JSON.stringify({
          message: 'Invitation email sent',
          email: email.toLowerCase(),
          resendId: data.id,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    } else {
      console.error(`✗ Failed to send invitation email to ${email}:`, data)

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }
  } catch (error) {
    console.error('Error in send-invite-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})
