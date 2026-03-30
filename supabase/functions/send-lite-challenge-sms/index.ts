import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const TWILIO_ACCOUNT_SID_LITE = Deno.env.get('TWILIO_ACCOUNT_SID_LITE')
const TWILIO_AUTH_TOKEN_LITE = Deno.env.get('TWILIO_AUTH_TOKEN_LITE')
const TWILIO_PHONE_NUMBER_LITE = Deno.env.get('TWILIO_PHONE_NUMBER_LITE')

// Slot schedule: local hour for each slot
const SLOT_SCHEDULE: Record<string, number> = {
  '8am': 8,
  '10am': 10,
  '12pm': 12,
  '3pm': 15,
  '5pm': 17,
}

// All 25 messages organized by day (1-5) and slot
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
 * Get current time in a specific timezone
 */
function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; dayOfWeek: number; dateStr: string } {
  try {
    const now = new Date()
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    })
    const timeParts = timeFormatter.formatToParts(now)
    const hours = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0')
    const minutes = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0')
    const weekdayStr = timeParts.find(p => p.type === 'weekday')?.value || 'Sun'

    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    }
    const dayOfWeek = dayMap[weekdayStr] ?? 0

    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const dateStr = dateFormatter.format(now)

    return { hours, minutes, dayOfWeek, dateStr }
  } catch {
    const now = new Date()
    return {
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
      dayOfWeek: now.getUTCDay(),
      dateStr: now.toISOString().split('T')[0],
    }
  }
}

/**
 * Compute challenge day number from cohort_start_date and user's local date
 */
function getChallengeDay(cohortStartDate: string, localDateStr: string): number {
  const start = new Date(cohortStartDate + 'T00:00:00')
  const local = new Date(localDateStr + 'T00:00:00')
  const diffMs = local.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays + 1 // Day 1 = start date
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

    console.log(`Running lite challenge SMS send at ${new Date().toISOString()}`)

    // Get enrollments that are paid or active, joined with profile
    const { data: enrollments, error: enrollError } = await supabase
      .from('lite_challenge_enrollments')
      .select('id, user_id, status, delivery_track, cohort_start_date, challenge_slug')
      .in('status', ['paid', 'active'])

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError)
      throw enrollError
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active enrollments', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${enrollments.length} paid/active enrollments`)

    const results: Array<{ userId: string; day: number; slot: string; status: string; error?: string }> = []

    for (const enrollment of enrollments) {
      // Get profile for this user
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, timezone, first_name')
        .eq('id', enrollment.user_id)
        .single()

      if (!profile) {
        console.log(`No profile for user ${enrollment.user_id}`)
        continue
      }

      // Only send SMS to SMS-track users
      if (enrollment.delivery_track !== 'sms') {
        continue
      }

      if (!profile.phone) {
        console.log(`No phone for user ${enrollment.user_id}`)
        continue
      }

      const timezone = profile.timezone || 'America/Chicago'
      const localTime = getCurrentTimeInTimezone(timezone)
      const challengeDay = getChallengeDay(enrollment.cohort_start_date, localTime.dateStr)

      // Skip weekends, not-yet-started, or finished
      if (challengeDay < 1 || challengeDay > 5) {
        if (challengeDay > 5 && enrollment.status !== 'completed') {
          // Mark completed
          await supabase.from('lite_challenge_enrollments')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', enrollment.id)
          console.log(`Enrollment ${enrollment.id} marked completed (past day 5)`)
        }
        continue
      }

      // Weekend check (shouldn't happen if cohort starts Monday, but be safe)
      if (localTime.dayOfWeek === 0 || localTime.dayOfWeek === 6) {
        continue
      }

      // If day 1 and status is 'paid', activate
      if (challengeDay === 1 && enrollment.status === 'paid') {
        await supabase.from('lite_challenge_enrollments')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', enrollment.id)
        console.log(`Enrollment ${enrollment.id} activated (day 1)`)
      }

      // Check each SMS slot
      for (const [slot, slotHour] of Object.entries(SLOT_SCHEDULE)) {
        const userTimeInMinutes = localTime.hours * 60 + localTime.minutes
        const slotTimeInMinutes = slotHour * 60
        const timeDiff = userTimeInMinutes - slotTimeInMinutes

        // Send if within 0-29 minute window after slot time (two cron cycles)
        if (timeDiff < 0 || timeDiff > 29) {
          continue
        }

        const message = TECH_NECK_MESSAGES[challengeDay]?.[slot]
        if (!message) continue

        // Dedup check — try insert, unique constraint prevents duplicates
        const { error: logError } = await supabase.from('lite_challenge_sms_log').insert({
          enrollment_id: enrollment.id,
          user_id: enrollment.user_id,
          challenge_day: challengeDay,
          message_slot: slot,
          delivery_method: 'sms',
        })

        if (logError) {
          // Unique constraint violation = already sent
          if (logError.code === '23505') {
            continue
          }
          console.error(`Error logging SMS for ${enrollment.user_id} day ${challengeDay} ${slot}:`, logError)
          continue
        }

        // Send SMS via second Twilio number
        const smsResult = await sendSMS(
          { to: profile.phone, body: message, from: TWILIO_PHONE_NUMBER_LITE, accountSid: TWILIO_ACCOUNT_SID_LITE, authToken: TWILIO_AUTH_TOKEN_LITE },
          {
            supabase,
            logTable: 'sms_messages',
            extra: { user_id: enrollment.user_id, user_name: profile.first_name || null },
          }
        )

        // Update log with twilio_sid
        if (smsResult.success && smsResult.sid) {
          await supabase.from('lite_challenge_sms_log')
            .update({ twilio_sid: smsResult.sid })
            .eq('enrollment_id', enrollment.id)
            .eq('challenge_day', challengeDay)
            .eq('message_slot', slot)
        }

        results.push({
          userId: enrollment.user_id,
          day: challengeDay,
          slot,
          status: smsResult.success ? 'sent' : 'failed',
          error: smsResult.error,
        })

        console.log(`SMS ${smsResult.success ? 'sent' : 'failed'}: user ${enrollment.user_id}, day ${challengeDay}, slot ${slot}`)
      }

      // Check if day 5 is complete (all 5 slots sent)
      if (challengeDay === 5) {
        const { count } = await supabase
          .from('lite_challenge_sms_log')
          .select('*', { count: 'exact', head: true })
          .eq('enrollment_id', enrollment.id)
          .eq('challenge_day', 5)
          .in('message_slot', ['8am', '10am', '12pm', '3pm', '5pm'])

        if (count === 5) {
          await supabase.from('lite_challenge_enrollments')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', enrollment.id)
          console.log(`Enrollment ${enrollment.id} completed (all day 5 slots sent)`)
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Lite challenge SMS check complete',
        smsSent: results.filter(r => r.status === 'sent').length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-lite-challenge-sms:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
