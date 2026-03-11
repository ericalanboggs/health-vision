import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const ADMIN_EMAIL = 'eric@summithealth.app'
const APP_URL = 'https://go.summithealth.app'

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  timezone: string | null
  created_at: string | null
}

interface HealthJourney {
  vision_statement: string | null
  why_matters: string | null
  feeling_state: string | null
}

interface WeeklyHabit {
  habit_name: string
  day_of_week: string | null
  time_of_day: string | null
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function buildHabitsHtml(habits: WeeklyHabit[]): string {
  if (habits.length === 0) {
    return `<p style="margin: 0; font-size: 14px; color: #9a9a9a; font-style: italic;">No habits set yet</p>`
  }

  return habits
    .map(
      (h) => `
      <tr>
        <td style="padding: 6px 12px; font-size: 14px; color: #1a1a1a; border-bottom: 1px solid #f0f0f0;">
          ${escapeHtml(h.habit_name)}
        </td>
        <td style="padding: 6px 12px; font-size: 14px; color: #6a6a6a; border-bottom: 1px solid #f0f0f0;">
          ${h.day_of_week ? escapeHtml(h.day_of_week) : '—'}
        </td>
        <td style="padding: 6px 12px; font-size: 14px; color: #6a6a6a; border-bottom: 1px solid #f0f0f0;">
          ${h.time_of_day ? escapeHtml(h.time_of_day) : '—'}
        </td>
      </tr>`
    )
    .join('')
}

function buildEmailHtml(
  profile: Profile,
  journey: HealthJourney | null,
  habits: WeeklyHabit[]
): string {
  const firstName = profile.first_name || 'Unknown'
  const lastName = profile.last_name || ''
  const fullName = `${firstName} ${lastName}`.trim()
  const adminUrl = `${APP_URL}/admin/users/${profile.id}`

  const visionSection = journey
    ? `
          <!-- Vision -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Vision</p>
              ${journey.vision_statement ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #4a4a4a; line-height: 1.6;"><strong>Statement:</strong> ${escapeHtml(journey.vision_statement)}</p>` : ''}
              ${journey.why_matters ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #4a4a4a; line-height: 1.6;"><strong>Why it matters:</strong> ${escapeHtml(journey.why_matters)}</p>` : ''}
              ${journey.feeling_state ? `<p style="margin: 0; font-size: 14px; color: #4a4a4a; line-height: 1.6;"><strong>Feeling state:</strong> ${escapeHtml(journey.feeling_state)}</p>` : ''}
            </td>
          </tr>`
    : `
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Vision</p>
              <p style="margin: 0; font-size: 14px; color: #9a9a9a; font-style: italic;">Not set yet</p>
            </td>
          </tr>`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Signup: ${escapeHtml(fullName)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; background-color: #15803d; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                New Signup
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 18px; color: #dcfce7;">
                ${escapeHtml(fullName)}
              </p>
            </td>
          </tr>

          <!-- Profile Details -->
          <tr>
            <td style="padding: 24px 40px 24px 40px;">
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Profile</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #6a6a6a; width: 100px;">Name</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a;">${escapeHtml(fullName)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #6a6a6a;">Email</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a;">${profile.email ? escapeHtml(profile.email) : 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #6a6a6a;">Phone</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a;">${profile.phone ? escapeHtml(profile.phone) : 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #6a6a6a;">Timezone</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a;">${profile.timezone ? escapeHtml(profile.timezone) : 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #6a6a6a;">Signed up</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a;">${formatDate(profile.created_at)}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${visionSection}

          <!-- Habits -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Habits</p>
              ${
                habits.length > 0
                  ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 12px; font-size: 12px; font-weight: 600; color: #9a9a9a; text-transform: uppercase; border-bottom: 2px solid #e5e5e5;">Habit</td>
                        <td style="padding: 6px 12px; font-size: 12px; font-weight: 600; color: #9a9a9a; text-transform: uppercase; border-bottom: 2px solid #e5e5e5;">Day</td>
                        <td style="padding: 6px 12px; font-size: 12px; font-weight: 600; color: #9a9a9a; text-transform: uppercase; border-bottom: 2px solid #e5e5e5;">Time</td>
                      </tr>
                      ${buildHabitsHtml(habits)}
                    </table>`
                  : `<p style="margin: 0; font-size: 14px; color: #9a9a9a; font-style: italic;">No habits set yet</p>`
              }
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 8px 40px 32px 40px;">
              <a href="${adminUrl}" style="display: inline-block; padding: 14px 28px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                View in Admin
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #9a9a9a; text-align: center;">
                Summit Health — internal admin notification
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
    try {
      const body = await req.json()
      userId = body.userId || null
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

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Load profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, timezone, created_at')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'User not found', details: profileError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Load vision (health journey)
    const { data: journey } = await supabase
      .from('health_journeys')
      .select('vision_statement, why_matters, feeling_state')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Load habits
    const { data: habits } = await supabase
      .from('weekly_habits')
      .select('habit_name, day_of_week, time_of_day')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    // Build and send email
    const firstName = profile.first_name || 'Unknown'
    const lastName = profile.last_name || ''
    const subject = `New signup: ${firstName} ${lastName}`.trim()
    const html = buildEmailHtml(profile as Profile, journey as HealthJourney | null, (habits || []) as WeeklyHabit[])

    console.log(`Sending new signup notification for ${profile.email} (${userId})`)

    const result = await sendEmail({ to: ADMIN_EMAIL, subject, html })

    if (result.success) {
      console.log(`Sent new signup notification for ${profile.email}`)
      return new Response(
        JSON.stringify({
          message: 'New signup notification sent',
          userId,
          resendId: result.id,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      console.error(`Failed to send new signup notification for ${profile.email}:`, result.error)
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in notify-new-signup function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
