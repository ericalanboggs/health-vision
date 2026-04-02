import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://go.summithealth.app'

// Challenge config (duplicated from frontend — these rarely change)
const CHALLENGES: Record<string, { title: string; icon: string; focusAreas: { slug: string; week: number; title: string }[] }> = {
  'stress-free': {
    title: 'Stress Free Summiters',
    icon: '🧘',
    focusAreas: [
      { slug: 'breathing', week: 1, title: 'Breathwork' },
      { slug: 'movement-calm', week: 2, title: 'Movement for Calm' },
      { slug: 'digital-boundaries', week: 3, title: 'Digital Boundaries' },
      { slug: 'recovery-rituals', week: 4, title: 'Recovery Rituals' },
    ],
  },
  'healthy-hearts': {
    title: 'Healthy Hearts',
    icon: '❤️',
    focusAreas: [
      { slug: 'daily-movement', week: 1, title: 'Daily Movement' },
      { slug: 'heart-healthy-eating', week: 2, title: 'Heart-Healthy Eating' },
      { slug: 'bp-awareness', week: 3, title: 'Blood Pressure Awareness' },
      { slug: 'cardio-building', week: 4, title: 'Cardio Building' },
    ],
  },
  'sound-sleepers': {
    title: 'Sound Sleepers',
    icon: '🌝',
    focusAreas: [
      { slug: 'sleep-hygiene', week: 1, title: 'Sleep Hygiene' },
      { slug: 'wind-down', week: 2, title: 'Wind-Down Routine' },
      { slug: 'light-temperature', week: 3, title: 'Light & Temperature' },
      { slug: 'sleep-consistency', week: 4, title: 'Consistency' },
    ],
  },
  'energy-masters': {
    title: 'Energy Masters',
    icon: '⚡',
    focusAreas: [
      { slug: 'morning-activation', week: 1, title: 'Morning Activation' },
      { slug: 'nutrition-timing', week: 2, title: 'Nutrition Timing' },
      { slug: 'afternoon-reset', week: 3, title: 'Afternoon Reset' },
      { slug: 'movement-breaks', week: 4, title: 'Movement Breaks' },
    ],
  },
  'gut-health': {
    title: 'Gut Health Reset',
    icon: '🌱',
    focusAreas: [
      { slug: 'fiber-foundation', week: 1, title: 'Fiber Foundation' },
      { slug: 'fermented-foods', week: 2, title: 'Fermented Foods' },
      { slug: 'hydration-gut', week: 3, title: 'Hydration' },
      { slug: 'mindful-eating', week: 4, title: 'Mindful Eating' },
    ],
  },
}

serve(async (req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    console.log('Running challenge completion SMS check...')

    // Find completed enrollments that haven't received the congratulations SMS
    const { data: enrollments, error: enrollError } = await supabase
      .from('challenge_enrollments')
      .select('id, user_id, challenge_slug, completed_at, survey_scores')
      .eq('status', 'completed')
      .is('completion_sms_sent_at', null)

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError)
      throw enrollError
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('No pending challenge completion SMS to send.')
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${enrollments.length} completed enrollments needing SMS`)

    let sentCount = 0

    for (const enrollment of enrollments) {
      try {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, phone, sms_opt_in, subscription_status, trial_ends_at, deleted_at')
          .eq('id', enrollment.user_id)
          .maybeSingle()

        if (!profile || !profile.phone || !profile.sms_opt_in || profile.deleted_at) {
          console.log(`Skipping user ${enrollment.user_id}: no phone, not opted in, or deleted`)
          // Still mark as sent so we don't retry
          await supabase
            .from('challenge_enrollments')
            .update({ completion_sms_sent_at: new Date().toISOString() })
            .eq('id', enrollment.id)
          continue
        }

        // Get the challenge config
        const challenge = CHALLENGES[enrollment.challenge_slug]
        if (!challenge) {
          console.log(`Unknown challenge slug: ${enrollment.challenge_slug}`)
          await supabase
            .from('challenge_enrollments')
            .update({ completion_sms_sent_at: new Date().toISOString() })
            .eq('id', enrollment.id)
          continue
        }

        // Get the habit log for this enrollment
        const { data: habitLog } = await supabase
          .from('challenge_habit_log')
          .select('week_number, focus_area_slug, habit_name')
          .eq('enrollment_id', enrollment.id)
          .order('week_number', { ascending: true })

        // Build habits summary for AI prompt
        const habitsSummary = (habitLog || []).map(h => {
          const fa = challenge.focusAreas.find(f => f.slug === h.focus_area_slug)
          return `- Week ${h.week_number} (${fa?.title || h.focus_area_slug}): ${h.habit_name}`
        }).join('\n')

        const firstName = profile.first_name || 'there'
        const challengeUrl = `${FRONTEND_URL}/challenges/${enrollment.challenge_slug}`

        // Generate AI congratulations message
        let congratsMessage = ''
        try {
          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `You are Summit, a warm and encouraging health coach texting someone who just completed a 4-week challenge. Write ONE SMS message, plain text only (no emojis, no markdown), under 280 characters. Be genuine, specific, and celebratory. Name at least 2 of their specific habits. Address them by first name.`,
                },
                {
                  role: 'user',
                  content: `Name: ${firstName}\nChallenge: ${challenge.title}\nHabits committed:\n${habitsSummary || 'No specific habits logged'}\n\nWrite the congratulations SMS.`,
                },
              ],
              max_tokens: 150,
              temperature: 0.8,
            }),
          })

          const aiData = await aiResponse.json()
          congratsMessage = aiData.choices?.[0]?.message?.content?.trim() || ''
        } catch (aiError) {
          console.error(`AI error for user ${enrollment.user_id}:`, aiError)
        }

        // Fallback if AI fails
        if (!congratsMessage) {
          congratsMessage = `${firstName}, you did it! You completed the ${challenge.title} challenge — 4 weeks of building real habits. That's something to be proud of.`
        }

        // Append the challenge link
        congratsMessage += `\n\nSee your results: ${challengeUrl}`

        // Send congratulations SMS
        const congratsResult = await sendSMS(
          { to: profile.phone, body: congratsMessage },
          { supabase, logTable: 'sms_messages', extra: { user_id: enrollment.user_id, sent_by_type: 'challenge_completion' } }
        )

        if (congratsResult.success) {
          console.log(`Sent congrats SMS to user ${enrollment.user_id}`)
        } else {
          console.error(`Failed congrats SMS for user ${enrollment.user_id}:`, congratsResult.error)
        }

        // Send archive prompt SMS (separate message)
        const archiveMessage = `Want to keep your plan tidy? Reply ARCHIVE to shelve your ${challenge.title} habits. You can restore them anytime from the Habits page.`

        const archiveResult = await sendSMS(
          { to: profile.phone, body: archiveMessage },
          { supabase, logTable: 'sms_messages', extra: { user_id: enrollment.user_id, sent_by_type: 'challenge_completion' } }
        )

        if (archiveResult.success) {
          console.log(`Sent archive prompt SMS to user ${enrollment.user_id}`)
        }

        // Mark as sent (idempotency guard)
        await supabase
          .from('challenge_enrollments')
          .update({ completion_sms_sent_at: new Date().toISOString() })
          .eq('id', enrollment.id)

        sentCount++

        // Small delay between users to avoid rate limits
        if (enrollments.indexOf(enrollment) < enrollments.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (userError) {
        console.error(`Error processing user ${enrollment.user_id}:`, userError)
      }
    }

    console.log(`Challenge completion SMS: sent to ${sentCount} users`)

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in send-challenge-completion-sms:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
