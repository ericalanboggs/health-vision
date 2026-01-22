import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Summit <hello@summithealth.app>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface Profile {
  id: string
  first_name: string
  email: string
  habit_count: number
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
function buildEmailHtml(firstName: string, habitCount: number): string {
  const appUrl = 'https://summit-pilot.vercel.app/habits'
  const logoUrl = 'https://summit-pilot.vercel.app/summit-logo.png'
  const habitText = habitCount === 1 ? 'habit' : 'habits'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Track Your Progress</title>
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
                Ready to track your progress?
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
                You've set up ${habitCount} ${habitText} in Summit - great work! Now you can take it to the next level by enabling <strong>habit tracking</strong> to measure your progress and build streaks.
              </p>
            </td>
          </tr>

          <!-- What is tracking -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                What is habit tracking?
              </p>
              <p style="margin: 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
                When you enable tracking, you can log specific metrics for each habit - like minutes walked, glasses of water, or pages read. Summit will show your progress over time and celebrate your streaks.
              </p>
            </td>
          </tr>

          <!-- Steps -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                How to enable tracking:
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
                          Open your Habits page (click the button below)
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
                          Tap on any habit to expand it
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
                          Toggle "Enable tracking" to turn it on
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
                          Choose your tracking type: simple check-off or a specific metric
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
                          Set an optional target to work toward each day
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
                Enable Tracking
              </a>
            </td>
          </tr>

          <!-- Why it works -->
          <tr>
            <td style="padding: 0 40px 30px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 30px 0 12px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                Why tracking works
              </p>
              <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">
                Research shows that <strong>self-monitoring</strong> is one of the most effective behavior change techniques. When you track your habits, you:
              </p>
              <ul style="margin: 12px 0 0 0; padding-left: 20px; font-size: 14px; color: #6a6a6a; line-height: 1.8;">
                <li><strong>Stay aware</strong> of your progress (or when you're slipping)</li>
                <li><strong>Build momentum</strong> through streaks and visible wins</li>
                <li><strong>Identify patterns</strong> in what helps or hinders you</li>
                <li><strong>Feel motivated</strong> by seeing how far you've come</li>
              </ul>
              <p style="margin: 16px 0 0 0; font-size: 14px; color: #6a6a6a; line-height: 1.6; font-style: italic;">
                Studies show people who track their habits are 40% more likely to achieve their goals than those who don't.
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
    // Parse request body first to check for test mode
    let testEmail: string | null = null
    let testName: string = 'Eric'
    let testHabitCount: number = 3
    try {
      const body = await req.json()
      testEmail = body.testEmail || null
      testName = body.testName || 'Eric'
      testHabitCount = body.testHabitCount || 3
    } catch {
      // No body or invalid JSON - proceed with normal operation
    }

    // For test mode, we only need a valid auth header (anon key works)
    // For production mode, we verify it's a service role call
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
      console.log(`Test mode: sending email to ${testEmail}`)
      const subject = `${testName}, track your progress and build streaks!`
      const html = buildEmailHtml(testName, testHabitCount)

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: testEmail,
          subject: subject,
          html: html,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        return new Response(
          JSON.stringify({ message: 'Test email sent', email: testEmail, resendId: data.id }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to send test email', details: data }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const now = new Date()
    console.log(`Running habit tracking email check at ${now.toISOString()}`)

    // Step 1: Get users who have habits
    const { data: usersWithHabits, error: habitsError } = await supabase
      .from('weekly_habits')
      .select('user_id')

    if (habitsError) {
      console.error('Error fetching habits:', habitsError)
      throw habitsError
    }

    const userIdsWithHabits = [...new Set(usersWithHabits?.map(h => h.user_id) || [])]
    console.log(`Found ${userIdsWithHabits.length} unique users with habits`)

    if (userIdsWithHabits.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with habits found', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Get users who have tracking enabled
    const { data: usersWithTracking, error: trackingError } = await supabase
      .from('habit_tracking_config')
      .select('user_id')
      .eq('tracking_enabled', true)

    if (trackingError) {
      console.error('Error fetching tracking config:', trackingError)
      throw trackingError
    }

    const userIdsWithTracking = new Set(usersWithTracking?.map(t => t.user_id) || [])
    console.log(`Found ${userIdsWithTracking.size} users with tracking enabled`)

    // Step 3: Filter to users with habits but no tracking
    const userIdsWithoutTracking = userIdsWithHabits.filter(id => !userIdsWithTracking.has(id))
    console.log(`Found ${userIdsWithoutTracking.length} users with habits but no tracking`)

    if (userIdsWithoutTracking.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All users with habits have tracking enabled', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Step 4: Get profile details and habit counts for these users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, email')
      .in('id', userIdsWithoutTracking)
      .eq('profile_completed', true)
      .not('email', 'is', null)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`Found ${profiles?.length || 0} completed profiles without tracking`)

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No eligible users found', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get habit counts for each user
    const { data: habitCounts, error: countError } = await supabase
      .from('weekly_habits')
      .select('user_id, habit_name')
      .in('user_id', profiles.map(p => p.id))

    if (countError) {
      console.error('Error fetching habit counts:', countError)
      throw countError
    }

    // Count unique habits per user
    const userHabitCounts: Record<string, Set<string>> = {}
    for (const habit of habitCounts || []) {
      if (!userHabitCounts[habit.user_id]) {
        userHabitCounts[habit.user_id] = new Set()
      }
      userHabitCounts[habit.user_id].add(habit.habit_name)
    }

    const targetUsers: Profile[] = profiles.map(p => ({
      ...p,
      habit_count: userHabitCounts[p.id]?.size || 0
    })).filter(p => p.habit_count > 0)

    console.log(`${targetUsers.length} users to potentially email`)

    // Get the start of the current week for deduplication
    const weekStart = getWeekStart()
    console.log(`Week start: ${weekStart.toISOString()}`)

    // Check which users have already received this email type this week
    const { data: existingEmails, error: existingError } = await supabase
      .from('email_reminders')
      .select('user_id')
      .eq('email_type', 'habit_tracking_prompt')
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
      const subject = `${firstName}, track your progress and build streaks!`
      const html = buildEmailHtml(firstName, user.habit_count)

      console.log(`Sending email to ${user.email} (${user.id}) - ${user.habit_count} habits`)

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
            email_type: 'habit_tracking_prompt',
            subject: subject,
            status: 'sent',
            resend_id: data.id,
          })

          results.push({ userId: user.id, email: user.email, habitCount: user.habit_count, status: 'sent', resendId: data.id })
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
          email_type: 'habit_tracking_prompt',
          subject: subject,
          status: 'failed',
          error_message: errorMessage,
        })

        results.push({ userId: user.id, email: user.email, habitCount: user.habit_count, status: 'failed', error: errorMessage })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Habit tracking email check complete',
        totalUsersWithHabits: userIdsWithHabits.length,
        usersWithTracking: userIdsWithTracking.size,
        usersWithoutTracking: userIdsWithoutTracking.length,
        eligibleProfiles: targetUsers.length,
        alreadyEmailed: usersEmailedThisWeek.size,
        emailsSent: results.filter(r => r.status === 'sent').length,
        emailsFailed: results.filter(r => r.status === 'failed').length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-habit-tracking-emails function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
