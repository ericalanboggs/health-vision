import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Day themes
const DAY_THEMES: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'Environment', subtitle: 'Fix the source' },
  2: { title: 'Release', subtitle: 'Stretch what\'s tight' },
  3: { title: 'Strengthen', subtitle: 'Build what prevents it' },
  4: { title: 'Breathe & Reset', subtitle: 'Nervous system and tension' },
  5: { title: 'Your Daily Routine', subtitle: 'Something you take with you' },
}

// Slot labels for email formatting
const SLOT_LABELS: Record<string, string> = {
  '8am': 'Morning',
  '10am': 'Mid-morning',
  '12pm': 'Lunch',
  '3pm': 'Afternoon',
  '5pm': 'End of Day',
}

// Full message content (same as SMS function)
const TECH_NECK_MESSAGES: Record<number, Record<string, string>> = {
  1: {
    '8am': `Good morning. This week we're tackling tech neck — starting today with the thing that matters most: your setup. Before you dive in, take 10 seconds and notice where your screen is relative to your eyes. Is it below eye level? That gap is where tech neck starts. Today's focus: raise your screen to eye level. Even a few books under your laptop counts. Small change, big difference over 8 hours.`,
    '10am': `Quick check: where's your head right now? If your chin is drifting forward toward your screen, your screen is probably still too low. Adjust it now, even slightly. Your neck should feel neutral — not pulling in any direction.`,
    '12pm': `You've been at it for a few hours. Stand up, roll your shoulders back, and take 3 slow breaths. This isn't just a break — it's a reset. Screens pull us forward physically and mentally. Two minutes away from the desk matters more than you think.`,
    '3pm': `The 3pm slump is real, and it hits your posture first. Before you push through, check your setup one more time. Has your screen drifted? Have you slouched into your chair? One small adjustment now protects you for the rest of the day.`,
    '5pm': `Day one done. Most people are surprised how much one environmental change shifts how they feel by end of day — less pulling, less fatigue. If you noticed even a small difference, that's the signal. Tomorrow we focus on releasing the tension that's already built up. See you then.`,
  },
  2: {
    '8am': `Good morning. Yesterday you fixed your environment. Today is about undoing the damage that's already there. Most tech neck tension lives in three places: the back of your neck, your upper traps, and your chest. We're going to open all three today. Start your morning with this: slowly drop your right ear toward your right shoulder, hold 20 seconds, switch sides. That's it. You just started.`,
    '10am': `Try a chin tuck right now. Sit tall, gently pull your chin straight back (like you're making a double chin), hold 5 seconds, release. Do 5 reps. It looks silly. It works. This is the single most recommended exercise for tech neck — it reactivates the deep neck muscles that forward posture switches off.`,
    '12pm': `Chest opener time. Stand in a doorway, place both forearms on the frame, and gently lean through. Hold 30 seconds. This counters the one posture pattern that underlies almost all tech neck — a tight chest pulls your shoulders forward, which pulls your head forward. Release the chest and everything upstream gets easier.`,
    '3pm': `You've probably tightened back up since this morning — that's normal. Two moves: chin tuck (5 reps) followed by the upper trap stretch from this morning. Takes 90 seconds. Think of it as wringing out a towel that's been sitting wet all day.`,
    '5pm': `Release days have a funny effect — the tension can feel more noticeable once you start working with it, not less. That's not a setback, that's awareness. Your body is recalibrating. Tomorrow we shift from releasing to building, which is where the real prevention starts. See you in the morning.`,
  },
  3: {
    '8am': `Good morning. The first two days were about fixing your environment and releasing tension. Today is about building the strength that makes tech neck less likely to come back. The muscles that hold your head up — deep neck flexors, mid-back, rear shoulders — weaken when we sit for long stretches. Today we start waking them up. First move of the day: 10 scapular retractions. Sit tall, squeeze your shoulder blades together like you're pinching a pencil between them. Hold 3 seconds, release. That's your anchor for today.`,
    '10am': `Check your posture right now. Shoulder blades back and down, chin neutral. Hold it for 30 seconds consciously. Strength isn't just about exercise — it's about training your body to find this position automatically. Every time you reset today, you're reinforcing that pattern.`,
    '12pm': `Try a wall angel. Stand with your back flat against a wall, arms at 90 degrees like a goalpost, slowly slide them overhead and back down. Keep your lower back and head touching the wall the whole time. 8 slow reps. It's harder than it sounds, which tells you exactly which muscles have been underworking.`,
    '3pm': `10 more scapular retractions. Same as this morning. By now your mid-back may feel mildly fatigued — that's the right muscles finally doing their job. Pair it with a chin tuck from Tuesday and you've got a 60-second combo that addresses both strength and alignment.`,
    '5pm': `Strengthening work is quieter than stretching — you won't feel an immediate release. But this is the layer that makes the other habits stick. The body holds better posture when it actually has the capacity to. Tomorrow shifts gears entirely. See you in the morning.`,
  },
  4: {
    '8am': `Good morning. Three days in, your environment is better, you have release and strength tools in your kit. Today is different. A lot of tech neck isn't just mechanical — it's tension that lives in the body because of stress, focus, and the low-grade intensity of screen work. Today's focus is your nervous system. Start here: 4 counts in through your nose, hold 4, out through your mouth for 6. Do that three times right now. Notice your shoulders drop on the exhale. That's not coincidence.`,
    '10am': `Most people unconsciously hold their breath or breathe shallowly during focused screen work. It keeps the nervous system in a mild stress state, which keeps the neck and shoulders braced. Next time you catch yourself tense, the first tool isn't a stretch — it's three slow breaths. Let the body downshift before you move it.`,
    '12pm': `Step outside if you can, even for five minutes. Natural light, a change of environment, and movement together create a nervous system reset that no stretch quite replicates. Tech neck is partly a context problem — the body learns to brace in certain environments. Changing the scene interrupts that pattern.`,
    '3pm': `The afternoon version of today's habit: a full body scan. Start at your feet, move upward. Where are you holding tension right now? Jaw, shoulders, hands? Take one breath into each spot and consciously release on the exhale. This is a 90-second practice that travels anywhere — no equipment, no space required.`,
    '5pm': `Today's work is the hardest to measure but maybe the most important. Chronic tech neck is often chronic tension wearing a physical disguise. People who address the stress layer alongside the mechanical one tend to see faster and longer-lasting results. Tomorrow we put the whole week together into something you can actually keep.`,
  },
  5: {
    '8am': `Good morning — last day of the challenge. This week you've covered environment, release, strength, and nervous system reset. Today is about distilling that into something simple enough to actually do every day. Here's your 2-minute tech neck routine: chin tuck x5, scapular retractions x10, upper trap stretch x20 seconds each side, three slow breaths. That's it. Do it right now as a morning reset. Then do it twice more today.`,
    '10am': `The biggest predictor of whether a habit sticks isn't motivation — it's how easy it is to start. Two minutes, no equipment, can be done at your desk. The only real requirement is a trigger. For most people that's a time (like this text) or a context cue (every time you pour a coffee, every time you open your laptop). Pick yours today.`,
    '12pm': `You've now done versions of all four habits this week. Most people find one that resonates more than the others — a stretch that feels particularly good, a breathing reset that shifts something. That's the one to lead with in your daily routine. Build from your strongest point, not the full sequence.`,
    '3pm': `One more full reset before the end of the week. Run through the 2-minute routine. Think of this less as exercise and more as maintenance — the same logic as brushing your teeth. Tech neck doesn't go away permanently, but it becomes manageable when you have a daily practice that takes less time than your morning coffee.`,
    '5pm': `You finished. Five days, four habits, one problem you understand a lot better than you did Monday. The routine you built this week works. The only question now is whether it becomes part of the day or fades by next week — and that's entirely a function of how simple you keep it. It doesn't have to be perfect. It just has to happen.`,
  },
}

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
function buildDailyEmailHtml(firstName: string, day: number, deliveryTrack: string): string {
  const theme = DAY_THEMES[day]
  const logoUrl = 'https://go.summithealth.app/summit-logo.png'

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
    const slots = ['8am', '10am', '12pm', '3pm', '5pm']
    const messageBlocks = slots.map(slot => {
      const label = SLOT_LABELS[slot]
      const message = TECH_NECK_MESSAGES[day]?.[slot] || ''
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
  <title>Tech Neck Challenge - Day ${day}</title>
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
                5-Day Tech Neck Challenge
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
function buildSummaryEmailHtml(firstName: string): string {
  const logoUrl = 'https://go.summithealth.app/summit-logo.png'
  const appUrl = 'https://go.summithealth.app'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tech Neck Challenge Complete!</title>
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
                <tr>
                  <td style="padding: 12px 16px; background-color: #f0fdf4; border-radius: 8px 8px 0 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #15803d;">Monday:</strong> <span style="color: #4a4a4a;">Environment &mdash; raised your screen, fixed your setup</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #f0fdf4; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #15803d;">Tuesday:</strong> <span style="color: #4a4a4a;">Release &mdash; neck stretches, chin tucks, chest openers</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #f0fdf4; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #15803d;">Wednesday:</strong> <span style="color: #4a4a4a;">Strengthen &mdash; scapular retractions, wall angels</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #f0fdf4; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #15803d;">Thursday:</strong> <span style="color: #4a4a4a;">Breathe &amp; Reset &mdash; breathing exercises, body scans</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #f0fdf4; border-radius: 0 0 8px 8px;">
                    <strong style="color: #15803d;">Friday:</strong> <span style="color: #4a4a4a;">Your Routine &mdash; put it all together</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- 2-Minute Routine -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <div style="padding: 20px; background-color: #f0fdf4; border-radius: 12px; border: 2px solid #15803d;">
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #15803d; text-align: center;">
                  Your 2-Minute Daily Routine
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 6px 0; font-size: 16px; color: #1a1a1a;">
                      1. Chin tucks &mdash; 5 reps
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 16px; color: #1a1a1a;">
                      2. Scapular retractions &mdash; 10 reps
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 16px; color: #1a1a1a;">
                      3. Upper trap stretch &mdash; 20 seconds each side
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 16px; color: #1a1a1a;">
                      4. Three slow breaths
                    </td>
                  </tr>
                </table>
                <p style="margin: 12px 0 0 0; font-size: 14px; color: #6a6a6a; text-align: center;">
                  Do this once or twice a day. No equipment needed.
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
                The Tech Neck Challenge was a taste of what consistent, guided habit-building looks like. Summit takes this further &mdash; personalized habits, daily tracking via SMS, weekly reflection, and coaching support to help you reach your health goals.
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
      .select('id, user_id, status, delivery_track, cohort_start_date, completed_at')
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

    const results: Array<{ userId: string; type: string; status: string; error?: string }> = []

    for (const enrollment of enrollments) {
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

        const html = buildSummaryEmailHtml(firstName)
        const emailResult = await sendEmail({
          to: profile.email,
          subject: `Challenge Complete! Your 2-Minute Tech Neck Routine, ${firstName}`,
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
          type: 'summary',
          status: emailResult.success ? 'sent' : 'failed',
          error: emailResult.error,
        })

        console.log(`Summary email ${emailResult.success ? 'sent' : 'failed'} to ${enrollment.user_id}`)
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

      const html = buildDailyEmailHtml(firstName, challengeDay, enrollment.delivery_track)
      const dayTheme = DAY_THEMES[challengeDay]
      const subject = `Day ${challengeDay}: ${dayTheme.title} - Tech Neck Challenge`

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
        type: 'daily',
        status: emailResult.success ? 'sent' : 'failed',
        error: emailResult.error,
      })

      console.log(`Daily email (day ${challengeDay}) ${emailResult.success ? 'sent' : 'failed'} to ${enrollment.user_id}`)
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
