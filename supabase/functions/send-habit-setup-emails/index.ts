import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Summit <hello@summithealth.app>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const PILOT_START_DATE = Deno.env.get('PILOT_START_DATE') || '2026-01-12'

interface Profile {
  id: string
  first_name: string
  email: string
  profile_completed: boolean
}

/**
 * Get the start of the current week (Monday 00:00:00)
 */
function getWeekStart(): Date {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Adjust so Monday = 0
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

/**
 * Build the HTML email content
 */
function buildEmailHtml(firstName: string): string {
  const appUrl = 'https://summit-pilot.vercel.app/habits'
  const logoUrl = 'https://summit-pilot.vercel.app/summit-logo.png'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set Up Your First Habit</title>
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
                Ready to climb your health summit?
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
                Hi ${firstName},
              </p>
              <p style="margin: 16px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
                You've completed your profile and health vision - that's a powerful first step! Now it's time to turn that vision into action with your first weekly habit.
              </p>
            </td>
          </tr>

          <!-- Steps -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                Here's how to get started:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 28px; height: 28px; background-color: #15803d; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="color: #ffffff; font-size: 14px; font-weight: 600;">1</span>
                        </td>
                        <td style="padding-left: 12px; font-size: 15px; color: #4a4a4a;">
                          Click the button below to open your Habits page
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 28px; height: 28px; background-color: #15803d; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="color: #ffffff; font-size: 14px; font-weight: 600;">2</span>
                        </td>
                        <td style="padding-left: 12px; font-size: 15px; color: #4a4a4a;">
                          Tap "Add Habit" to create your first habit
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 28px; height: 28px; background-color: #15803d; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="color: #ffffff; font-size: 14px; font-weight: 600;">3</span>
                        </td>
                        <td style="padding-left: 12px; font-size: 15px; color: #4a4a4a;">
                          Choose a small, specific action (like "10 min walk" or "drink water")
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 28px; height: 28px; background-color: #15803d; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="color: #ffffff; font-size: 14px; font-weight: 600;">4</span>
                        </td>
                        <td style="padding-left: 12px; font-size: 15px; color: #4a4a4a;">
                          Pick the day and time that works best for you
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 28px; height: 28px; background-color: #15803d; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="color: #ffffff; font-size: 14px; font-weight: 600;">5</span>
                        </td>
                        <td style="padding-left: 12px; font-size: 15px; color: #4a4a4a;">
                          Enable SMS reminders to stay on track
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <a href="${appUrl}" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Set Up My First Habit
              </a>
            </td>
          </tr>

          <!-- Science paragraph -->
          <tr>
            <td style="padding: 0 40px 30px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #6a6a6a; line-height: 1.6; font-style: italic;">
                Research shows that people who set specific "implementation intentions" (when, where, and how they'll do a habit) are 2-3x more likely to follow through. That's why Summit helps you get specific with your habits - it's not just about what you want to do, but exactly when you'll do it.
              </p>
            </td>
          </tr>

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
</html>
`
}

serve(async (req) => {
  try {
    // Verify this is a cron job or authorized request
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

    const now = new Date()
    console.log(`Running habit setup email check at ${now.toISOString()}`)

    // Check if we're within the pilot date range
    const pilotStartDate = new Date(PILOT_START_DATE)
    const pilotEndDate = new Date(pilotStartDate)
    pilotEndDate.setDate(pilotEndDate.getDate() + 21) // 3 weeks = 21 days

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (today < pilotStartDate || today > pilotEndDate) {
      console.log(`Outside pilot date range. Pilot runs from ${pilotStartDate.toISOString()} to ${pilotEndDate.toISOString()}`)
      return new Response(
        JSON.stringify({
          message: 'Outside pilot date range - no emails sent',
          pilotStartDate: pilotStartDate.toISOString(),
          pilotEndDate: pilotEndDate.toISOString(),
          currentDate: today.toISOString()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Within pilot date range - proceeding with emails`)

    // Find users with completed profiles but no habits
    // Step 1: Get all users who have at least one habit
    const { data: usersWithHabits, error: habitsError } = await supabase
      .from('weekly_habits')
      .select('user_id')

    if (habitsError) {
      console.error('Error fetching habits:', habitsError)
      throw habitsError
    }

    const userIdsWithHabits = new Set(usersWithHabits?.map(h => h.user_id) || [])
    console.log(`Found ${userIdsWithHabits.size} users with habits`)

    // Step 2: Get all profiles with email and profile_completed = true
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, email, profile_completed')
      .eq('profile_completed', true)
      .not('email', 'is', null)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`Found ${profiles?.length || 0} completed profiles with email`)

    // Step 3: Filter to only users without habits
    const targetUsers = (profiles || []).filter((p: Profile) => !userIdsWithHabits.has(p.id))
    console.log(`Found ${targetUsers.length} users with profiles but no habits`)

    if (targetUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users without habits found', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the start of the current week for deduplication
    const weekStart = getWeekStart()
    console.log(`Week start: ${weekStart.toISOString()}`)

    // Check which users have already received an email this week
    const { data: existingEmails, error: existingError } = await supabase
      .from('email_reminders')
      .select('user_id')
      .eq('email_type', 'habit_setup')
      .gte('sent_at', weekStart.toISOString())

    if (existingError) {
      console.error('Error checking existing emails:', existingError)
      throw existingError
    }

    const usersEmailedThisWeek = new Set(existingEmails?.map(e => e.user_id) || [])
    console.log(`${usersEmailedThisWeek.size} users already emailed this week`)

    // Filter out users who already received email this week
    const usersToEmail = targetUsers.filter((p: Profile) => !usersEmailedThisWeek.has(p.id))
    console.log(`${usersToEmail.length} users to email`)

    if (usersToEmail.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All eligible users already emailed this week', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send emails
    const results = []

    for (const user of usersToEmail) {
      const firstName = user.first_name || 'there'
      const subject = `${firstName}, let's set up your first habit!`
      const html = buildEmailHtml(firstName)

      console.log(`Sending email to ${user.email} (${user.id})`)

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: user.email,
            subject: subject,
            html: html,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          // Log successful email
          await supabase.from('email_reminders').insert({
            user_id: user.id,
            email: user.email,
            email_type: 'habit_setup',
            subject: subject,
            status: 'sent',
            resend_id: data.id,
          })

          results.push({ userId: user.id, email: user.email, status: 'sent', resendId: data.id })
          console.log(`✓ Sent email to ${user.email}`)
        } else {
          throw new Error(data.message || 'Resend API error')
        }
      } catch (error) {
        console.error(`✗ Failed to send email to ${user.email}:`, error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Log failed email
        await supabase.from('email_reminders').insert({
          user_id: user.id,
          email: user.email,
          email_type: 'habit_setup',
          subject: subject,
          status: 'failed',
          error_message: errorMessage,
        })

        results.push({ userId: user.id, email: user.email, status: 'failed', error: errorMessage })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Habit setup email check complete',
        totalEligible: targetUsers.length,
        alreadyEmailed: usersEmailedThisWeek.size,
        emailsSent: results.filter(r => r.status === 'sent').length,
        emailsFailed: results.filter(r => r.status === 'failed').length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-habit-setup-emails function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
