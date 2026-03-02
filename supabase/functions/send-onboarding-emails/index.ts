import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail, sendEmailsInBatches, type EmailPayload } from '../_shared/resend.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const APP_URL = 'https://go.summithealth.app'
const LOGO_URL = 'https://go.summithealth.app/summit-logo.png'

interface Profile {
  id: string
  first_name: string
  email: string
  created_at: string
}

// ─── Shared email chrome ───────────────────────────────────────────────

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

function bulletList(items: string[]): string {
  const lis = items.map(i => `<li style="margin-bottom: 10px;">${i}</li>`).join('\n                ')
  return `
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #4a4a4a; line-height: 1.7;">
                ${lis}
              </ul>
            </td>
          </tr>`
}

function divider(): string {
  return `
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;">
            </td>
          </tr>`
}

function spacer(px: number = 10): string {
  return `
          <tr><td style="height: ${px}px;"></td></tr>`
}

function subheading(text: string): string {
  return `
          <tr>
            <td style="padding: 0 40px 12px 40px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a; line-height: 1.4;">
                ${text}
              </p>
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

// ─── Day 2: Why We Start with Vision ──────────────────────────────────

function buildDay2Html(firstName: string): string {
  const body = [
    heading(`${firstName}, let's talk about your vision`),
    paragraph(`Too often, we jump into habits and routines without understanding <em>why</em> we truly want to change. That's where most wellness plans fall apart — not from lack of effort, but from lack of clarity.`),
    paragraph(`During onboarding, we offer two approaches to defining your vision — a <strong>quick version</strong> and a <strong>reflective version</strong>. We know not everyone has 10 minutes to spare, and that's OK. You can always come back and add to it.`),
    subheading('Why vision matters'),
    bulletList([
      `<strong>It becomes your foundation.</strong> Taking the moment to document your vision creates a clear starting point for everything that follows.`,
      `<strong>It becomes motivational.</strong> The clearer a picture you paint of where you want to be, the more it pulls you forward on hard days.`,
      `<strong>It helps us help you.</strong> We use your vision to shape how we communicate — what we say, how we say it, what resources and support we send you.`,
      `<strong>It's sacred.</strong> Your vision belongs to you. We respect it and protect it.`,
    ]),
    spacer(10),
    ctaButton('Review or Set My Vision', `${APP_URL}/start`),
  ].join('')

  return wrapEmail('Why We Start with Vision', body)
}

// ─── Day 3: Habits in Summit ──────────────────────────────────────────

function buildDay3Html(firstName: string): string {
  const body = [
    heading(`${firstName}, let's set up your habits`),
    paragraph(`Habit suggestions in Summit are built around <strong>your reality</strong> — what you want to work on, when you're available, and how much time you have. We try to keep it realistic from the start.`),
    subheading('How habits work in Summit'),
    bulletList([
      `<strong>We limit the number of habits you track</strong> to keep you from burning out. This is about incremental growth and support — not an unrealistic daily checklist.`,
      `<strong>Tracking is optional.</strong> If you don't track, you'll still get SMS reminders at the right times (if you've opted in). The main point is to surface the intention you set.`,
      `<strong>Track your way.</strong> If you do track, you can track as simple "yes/no" — you did or didn't do it — or as specific metrics if you'd like. Progress isn't just in the numbers; it's in your awareness and identity with those habits.`,
      `<strong>Personalized suggestions.</strong> When adding habits, Summit recommends actions based on your focus area and available time.`,
    ]),
    spacer(10),
    ctaButton('Review My Habits', `${APP_URL}/habits`),
  ].join('')

  return wrapEmail('Habits in Summit', body)
}

// ─── Day 4: Pivoting, aka Reality ─────────────────────────────────────

function buildDay4Html(firstName: string): string {
  const body = [
    heading('Pivoting, aka reality'),
    paragraph(`Hi ${firstName} — let's be honest: sometimes we bite off more than we can chew. That's not failure. That's life.`),
    paragraph(`Summit is built for adaptation, not perfection. Here's how you can adjust when things aren't working:`),
    bulletList([
      `<strong>Update your habits anytime.</strong> This isn't a judgement zone. If something isn't fitting your schedule or energy, change it. The best habit is the one you'll actually do.`,
      `<strong>Text "BACKUP" to Summit.</strong> Work with Summit AI to adjust and downshift your plan through a quick text conversation — no login required.`,
      `<strong>Talk to a coach.</strong> For Plus and Premium members, you can book time with a trained health coach in the Guides section to troubleshoot what's getting in the way.`,
    ]),
    paragraph(`The ability to pivot — not the ability to be perfect — is what separates people who build lasting habits from people who give up.`),
    spacer(10),
    paragraph(`<em>No action needed today. Just know these options are here for you when you need them.</em>`),
    spacer(10),
  ].join('')

  return wrapEmail('Plans Change — And That\'s OK', body)
}

// ─── Day 5: Reflections ───────────────────────────────────────────────

function buildDay5Html(firstName: string): string {
  const body = [
    heading(`${firstName}, let's talk about reflection`),
    paragraph(`As your week moves along, you'll start to notice what works and what blocks you. Your <strong>Reflection</strong> area in the app is where you capture those insights.`),
    subheading('Why reflection matters'),
    bulletList([
      `<strong>Document and learn.</strong> What will you do next time to adjust? That single question is more powerful than any streak counter.`,
      `<strong>Build pre-planning skills.</strong> Anticipating challenges before they happen is an advanced skill that you'll develop over time. It applies far beyond health.`,
      `<strong>Get ahead, not behind.</strong> With reflection, you'll soon have contingency plans in place when the inevitable challenge occurs next time.`,
    ]),
    paragraph(`Reflections are due each week by the end of the week. If you miss one, no worries — you can always pick it up the following week.`),
    spacer(10),
    ctaButton('Start My Weekly Reflection', `${APP_URL}/reflection`),
  ].join('')

  return wrapEmail('The Power of Weekly Reflection', body)
}

// ─── Day 6: Weekly Fuel ───────────────────────────────────────────────

function buildDay6Html(firstName: string): string {
  const body = [
    heading('Your weekly fuel'),
    paragraph(`Hi ${firstName} — each Monday, Summit sends you a personalized <strong>Weekly Digest</strong>. Here's what makes it different from a typical brand email:`),
    bulletList([
      `<strong>It's personal.</strong> We use your vision, habits, and weekly reflection to craft coaching and resources that are relevant to <em>your</em> journey.`,
      `<strong>It starts with a TLDR</strong> and a "if you could do just one thing, try this" suggestion — in the spirit of experimentation and learning.`,
      `<strong>Resources are saved for you.</strong> Every article, video, or guide from your digest is dropped into the Guides section of your dashboard. You can pin your favorites, share them, or delete what's not useful.`,
    ]),
    paragraph(`Digests are sent on Mondays, so look for your first one soon.`),
    spacer(10),
    paragraph(`<em>No action needed today. Your first digest is on its way.</em>`),
    spacer(10),
  ].join('')

  return wrapEmail('Your Weekly Fuel', body)
}

// ─── Day 7: Your Progress ─────────────────────────────────────────────

function buildDay7Html(firstName: string): string {
  const body = [
    heading(`${firstName}, you've made it a week`),
    paragraph(`Behavior change is hard, and it takes time. This is why so many apps lose users so quickly — especially ones that demand daily interaction and punish you for missing a day.`),
    paragraph(`Summit is different. We aim to support you through ups <em>and</em> downs, and we fully understand that behavior change isn't a straight line.`),
    subheading('What to know going forward'),
    bulletList([
      `<strong>Update your climb.</strong> Your progress indicator on the dashboard is yours to update as you feel growth happening. It's a personal marker, not a score.`,
      `<strong>Real outcomes take many forms.</strong> Summit users have reported feeling better, having greater confidence and autonomy, more peace, and more energy. Progress isn't always what you expect.`,
      `<strong>You have dials, not switches.</strong> You can adjust habits, days, tracking, and SMS at any time. Turn things down when life gets heavy. Turn them back up when you're ready.`,
      `<strong>It's OK to take a break.</strong> If you ever need to step away, Summit will be here when you come back. No guilt. No "you missed 47 days" notifications.`,
    ]),
    spacer(10),
    ctaButton('Go to Dashboard', `${APP_URL}/dashboard`),
  ].join('')

  return wrapEmail('Your First Week with Summit', body)
}

// ─── Email config per day ─────────────────────────────────────────────

interface OnboardingDay {
  day: number
  emailType: string
  subject: (firstName: string) => string
  buildHtml: (firstName: string) => string
}

const ONBOARDING_DAYS: OnboardingDay[] = [
  {
    day: 2,
    emailType: 'onboarding_day_2',
    subject: (name) => `${name}, let's talk about your vision`,
    buildHtml: buildDay2Html,
  },
  {
    day: 3,
    emailType: 'onboarding_day_3',
    subject: (name) => `${name}, let's set up your habits`,
    buildHtml: buildDay3Html,
  },
  {
    day: 4,
    emailType: 'onboarding_day_4',
    subject: () => `Plans change — and that's OK`,
    buildHtml: buildDay4Html,
  },
  {
    day: 5,
    emailType: 'onboarding_day_5',
    subject: (name) => `${name}, let's talk about reflection`,
    buildHtml: buildDay5Html,
  },
  {
    day: 6,
    emailType: 'onboarding_day_6',
    subject: () => `Your weekly fuel is coming`,
    buildHtml: buildDay6Html,
  },
  {
    day: 7,
    emailType: 'onboarding_day_7',
    subject: (name) => `${name}, you've made it a week!`,
    buildHtml: buildDay7Html,
  },
]

// ─── Day calculation ──────────────────────────────────────────────────

/**
 * Calculate how many days since account creation (1-indexed).
 * Day 1 = signup day, Day 2 = next day, etc.
 */
function getOnboardingDay(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  // Normalize to UTC dates (ignore time)
  const createdDate = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate())
  const nowDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const diffDays = Math.floor((nowDate - createdDate) / (1000 * 60 * 60 * 24))
  return diffDays + 1 // Day 1 = signup day
}

// ─── Handler ──────────────────────────────────────────────────────────

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
    // Parse request body for test mode
    let testEmail: string | null = null
    let testName: string = 'Friend'
    let testDay: number | null = null
    try {
      const body = await req.json()
      testEmail = body.testEmail || null
      testName = body.testName || 'Friend'
      testDay = body.testDay || null
    } catch {
      // No body or invalid JSON - proceed with normal operation
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

    // Test mode: send a specific day's email to a test address
    if (testEmail && testDay) {
      const dayConfig = ONBOARDING_DAYS.find(d => d.day === testDay)
      if (!dayConfig) {
        return new Response(
          JSON.stringify({ error: `No onboarding email for day ${testDay}. Valid days: 2-7` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const subject = dayConfig.subject(testName)
      const html = dayConfig.buildHtml(testName)
      const result = await sendEmail({ to: testEmail, subject, html })

      if (result.success) {
        return new Response(
          JSON.stringify({ message: `Test day ${testDay} email sent`, email: testEmail, resendId: result.id }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to send test email', details: result.error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Production mode: find all users in onboarding window (days 2-7) and send appropriate email
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const now = new Date()
    console.log(`Running onboarding email check at ${now.toISOString()}`)

    // Get users created within the last 7 days with completed profiles
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, email, created_at')
      .eq('profile_completed', true)
      .not('email', 'is', null)
      .is('deleted_at', null)
      .gte('created_at', sevenDaysAgo.toISOString())

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`Found ${profiles?.length || 0} users in onboarding window`)

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users in onboarding window', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Group users by their onboarding day
    const usersByDay: Record<number, Profile[]> = {}
    for (const profile of profiles) {
      const day = getOnboardingDay(profile.created_at)
      if (day >= 2 && day <= 7) {
        if (!usersByDay[day]) usersByDay[day] = []
        usersByDay[day].push(profile)
      }
    }

    console.log('Users by onboarding day:', Object.entries(usersByDay).map(([d, u]) => `Day ${d}: ${u.length}`).join(', '))

    // Check which onboarding emails have already been sent
    const allUserIds = profiles.map(p => p.id)
    const { data: existingEmails, error: existingError } = await supabase
      .from('email_reminders')
      .select('user_id, email_type')
      .in('user_id', allUserIds)
      .like('email_type', 'onboarding_day_%')

    if (existingError) {
      console.error('Error checking existing emails:', existingError)
      throw existingError
    }

    // Build a set of "userId:email_type" for fast lookup
    const sentSet = new Set(
      (existingEmails || []).map(e => `${e.user_id}:${e.email_type}`)
    )

    // Prepare emails to send
    const emailPayloads: Array<EmailPayload & { userId: string; emailType: string; emailSubject: string; day: number }> = []

    for (const dayConfig of ONBOARDING_DAYS) {
      const usersForDay = usersByDay[dayConfig.day] || []

      for (const user of usersForDay) {
        const key = `${user.id}:${dayConfig.emailType}`
        if (sentSet.has(key)) {
          console.log(`Skipping ${user.email} - ${dayConfig.emailType} already sent`)
          continue
        }

        const firstName = user.first_name || 'there'
        const subject = dayConfig.subject(firstName)
        const html = dayConfig.buildHtml(firstName)

        emailPayloads.push({
          to: user.email,
          subject,
          html,
          userId: user.id,
          emailType: dayConfig.emailType,
          emailSubject: subject,
          day: dayConfig.day,
        })
      }
    }

    console.log(`${emailPayloads.length} onboarding emails to send`)

    if (emailPayloads.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No onboarding emails to send', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send emails in batches
    const batchResults = await sendEmailsInBatches(
      emailPayloads.map(p => ({ to: p.to, subject: p.subject, html: p.html })),
      100,
      1000
    )

    // Process results and log to database
    const results = []

    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i]
      const payload = emailPayloads[i]

      if (result.success) {
        await supabase.from('email_reminders').insert({
          user_id: payload.userId,
          email: payload.to,
          email_type: payload.emailType,
          subject: payload.emailSubject,
          status: 'sent',
          resend_id: result.id,
        })

        results.push({ userId: payload.userId, email: payload.to, day: payload.day, status: 'sent', resendId: result.id })
        console.log(`✓ Day ${payload.day} email sent to ${payload.to}`)
      } else {
        console.error(`✗ Failed day ${payload.day} email to ${payload.to}: ${result.error}`)

        await supabase.from('email_reminders').insert({
          user_id: payload.userId,
          email: payload.to,
          email_type: payload.emailType,
          subject: payload.emailSubject,
          status: 'failed',
          error_message: result.error,
        })

        results.push({ userId: payload.userId, email: payload.to, day: payload.day, status: 'failed', error: result.error })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Onboarding email check complete',
        usersInWindow: profiles.length,
        emailsSent: results.filter(r => r.status === 'sent').length,
        emailsFailed: results.filter(r => r.status === 'failed').length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-onboarding-emails function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
