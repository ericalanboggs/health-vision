import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const now = new Date()
    const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    console.log(`Running trial expiry SMS check at ${now.toISOString()}`)
    console.log(`Looking for trials that ended between ${ago24h.toISOString()} and ${now.toISOString()}`)

    // Find users whose trial ended in the last 24 hours, with SMS opt-in, no active subscription
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, phone, trial_ends_at, subscription_status')
      .eq('sms_opt_in', true)
      .is('deleted_at', null)
      .not('phone', 'is', null)
      .not('trial_ends_at', 'is', null)
      .gte('trial_ends_at', ago24h.toISOString())
      .lte('trial_ends_at', now.toISOString())

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    // Filter out anyone who already converted to an active subscription
    const eligible = (profiles || []).filter(p =>
      !p.subscription_status || p.subscription_status === 'trialing'
    )

    console.log(`Found ${profiles?.length || 0} users with trial ended in last 24h, ${eligible.length} without active subscription`)

    if (eligible.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No trial expiry messages to send', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Dedup: check which users already received a trial_reminder SMS
    const userIds = eligible.map(p => p.id)
    const { data: existingSms } = await supabase
      .from('sms_messages')
      .select('user_id')
      .in('user_id', userIds)
      .eq('sent_by_type', 'trial_reminder')
      .eq('direction', 'outbound')

    const alreadySent = new Set((existingSms || []).map(s => s.user_id))
    const toSend = eligible.filter(p => !alreadySent.has(p.id))

    console.log(`${toSend.length} eligible after dedup (${alreadySent.size} already sent)`)

    let sent = 0
    let failed = 0

    for (const profile of toSend) {
      const firstName = profile.first_name || 'there'
      const message = `Hey ${firstName}, it's been great having you on Summit! Your trial is wrapping up, so this will be the last text from us until you choose a plan. If you'd like to keep going, use code SUMMIT50 at checkout for 50% off your first month: go.summithealth.app\n\nWe're rooting for you either way.`

      const result = await sendSMS(
        { to: profile.phone, body: message },
        {
          supabase,
          logTable: 'sms_messages',
          extra: {
            user_id: profile.id,
            user_name: firstName,
            sent_by_type: 'trial_reminder',
          },
        }
      )

      if (result.success) {
        console.log(`✓ Trial farewell SMS sent to ${profile.phone} (${profile.id})`)
        sent++
      } else {
        console.error(`✗ Failed to send trial farewell SMS to ${profile.phone}: ${result.error}`)
        failed++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Trial expiry SMS check complete',
        found: profiles?.length || 0,
        eligible: toSend.length,
        sent,
        failed,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-trial-expiry-sms:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
