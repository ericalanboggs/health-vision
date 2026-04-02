import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail, sendEmailsInBatches } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://go.summithealth.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildEmailHtml(firstName: string): string {
  const logoUrl = `${FRONTEND_URL}/summit-logo.png`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What We Built for You in March</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <a href="${FRONTEND_URL}">
                <img src="${logoUrl}" alt="Summit Health" width="120" style="display: block; max-width: 120px; height: auto;">
              </a>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 16px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Hi ${firstName},
              </p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                I wanted to take a moment to say <strong>thank you</strong>.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Thank you for trusting Summit Health with your goals. Thank you for showing up &mdash; whether that's checking in via text, logging a habit, or reflecting on your week. And thank you for every piece of feedback you've shared. It shapes everything we build.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                March was a big month behind the scenes, and I wanted to share what we've been working on &mdash; because all of it was built with you in mind.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;">
            </td>
          </tr>

          <!-- Section: SMS Coaching -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">Smarter SMS Coaching</h2>
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Your text conversations with Summit got a serious upgrade. The AI now understands more context about your habits, your progress, and your goals &mdash; so replies feel less generic and more like a real coach who knows you. We also added the ability to set a goal via text (like "I want to hit 10,000 steps") and Summit will track it for you.
              </p>
            </td>
          </tr>

          <!-- Section: Sunday Reflection -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">Sunday Reflections Over SMS</h2>
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                We built a new Sunday Reflection over text &mdash; a short, guided conversation at the end of each week to help you look back, notice patterns, and set intentions for the week ahead.
              </p>
            </td>
          </tr>

          <!-- Section: Friday Synthesis -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">Friday Check-Ins, Reimagined</h2>
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Your Friday check-in now highlights the one habit where you're building the most momentum, instead of just showing a scorecard. It's a small shift that makes the end of the week feel a lot more personal.
              </p>
            </td>
          </tr>

          <!-- Section: Preferences -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">Your Preferences, Your Way</h2>
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                You can now choose when you get your daily follow-up texts. Head to your <a href="${FRONTEND_URL}/dashboard" style="color: rgb(16, 185, 129); text-decoration: underline;">Profile</a> and look for "Habit Preferences" to set the time that works best for you.
              </p>
            </td>
          </tr>

          <!-- Section: Onboarding -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">A Smoother Start</h2>
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                We completely overhauled the onboarding experience &mdash; from the moment you sign up to your first week of habits. The flow is faster, cleaner, and now pre-loads your first weekly guide so you have resources from day one.
              </p>
            </td>
          </tr>

          <!-- Section: Tech Neck -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">Tech Neck Challenge Launch</h2>
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                We launched our first standalone mini-challenge: the <strong>5-Day Tech Neck Challenge</strong>. Five days of quick, actionable texts to help with posture and screen fatigue. If you know someone who might benefit, send them to <a href="${FRONTEND_URL}/tech-neck" style="color: rgb(16, 185, 129); text-decoration: underline;">summithealth.app/tech-neck</a> &mdash; it's just $1.
              </p>
            </td>
          </tr>

          <!-- Section: Bug Fixes -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">Dozens of Fixes You Hopefully Never Noticed</h2>
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Behind the scenes, we squashed bugs in timezone handling, SMS delivery reliability, habit tracking, and more &mdash; the kind of work that just makes everything feel a little more solid.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;">
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                We're a small team building something we believe in, and your participation is what makes it real. Every time you reply to a text, log a habit, or tell us what's working (or not), you're helping shape what Summit becomes.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                More good stuff is coming. In the meantime &mdash; keep showing up. That's the whole game.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; padding: 16px 32px; background-color: rgb(16, 185, 129); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Open Summit App
              </a>
            </td>
          </tr>

          <!-- Footer / Signoff -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                With gratitude,<br>
                <strong>Eric</strong><br>
                <span style="font-size: 14px; color: #6a6a6a;">Founder, Summit Health</span>
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
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mode } = await req.json()
    // mode: 'test' = send to admin only, 'all' = send to all active users

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    if (mode === 'test') {
      // Send test email to admin
      const adminEmail = 'eric.alan.boggs@gmail.com'
      const html = buildEmailHtml('Eric')

      const result = await sendEmail({
        to: adminEmail,
        subject: 'What We Built for You in March',
        html,
      })

      return new Response(
        JSON.stringify({ success: result.success, message: `Test email sent to ${adminEmail}`, id: result.id, error: result.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (mode === 'all') {
      // Get all active users (non-deleted, non-lite, with email)
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, first_name')
        .is('deleted_at', null)
        .not('email', 'is', null)

      if (usersError) throw usersError

      // Filter to users with actual emails and exclude lite-only users
      const eligibleUsers = (users || []).filter(u => u.email)

      console.log(`Sending March update to ${eligibleUsers.length} users`)

      const emails = eligibleUsers.map(user => ({
        to: user.email!,
        subject: 'What We Built for You in March',
        html: buildEmailHtml(user.first_name || 'Friend'),
      }))

      const results = await sendEmailsInBatches(emails)

      const sent = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      // Log each email
      for (const user of eligibleUsers) {
        const result = results.find(r => r.email === user.email)
        await supabase.from('email_reminders').insert({
          user_id: user.id,
          email: user.email,
          email_type: 'admin-march-update',
          subject: 'What We Built for You in March',
          status: result?.success ? 'sent' : 'failed',
          resend_id: result?.id || null,
          error_message: result?.error || null,
        })
      }

      return new Response(
        JSON.stringify({ success: true, sent, failed, total: eligibleUsers.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid mode. Use "test" or "all".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-march-update:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
