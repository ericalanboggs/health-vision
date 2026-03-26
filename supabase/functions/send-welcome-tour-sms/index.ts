import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { userId } = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Look up user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, phone, sms_opt_in')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Only send if user has opted in to SMS and has a phone
    if (!profile.sms_opt_in || !profile.phone) {
      console.log(`Skipping welcome tour SMS for user ${userId}: sms_opt_in=${profile.sms_opt_in}, phone=${!!profile.phone}`)
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const name = profile.first_name || 'there'
    const logOpts = {
      supabase,
      logTable: 'sms_messages' as const,
      extra: { user_id: userId, sent_by_type: 'system' },
    }

    // Text 1: Congrats + orientation
    const text1 =
      `Hey ${name}! Congrats on setting up your vision and first habits on Summit \u26f0\ufe0f \u2014 that's a big step.\n\n` +
      `Here's how this works: if you have habit tracking turned on, I'll check in with reminders and quick follow-ups to help you stay on track. ` +
      `You can always text me questions, ask for motivation, or just let me know how things are going.\n\n` +
      `This is your space \u2014 use it however helps you most.`

    const result1 = await sendSMS({ to: profile.phone, body: text1 }, logOpts)
    if (!result1.success) {
      console.error('Failed to send welcome tour text 1:', result1.error)
    }

    // Brief delay so messages arrive in order
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Text 2: BACKUP keyword
    const text2 =
      `One more thing: if your week gets hectic or your habits aren't feeling right, just text BACKUP and I'll help you adjust your plan on the fly. ` +
      `No guilt, no pressure \u2014 just a quick pivot to keep you moving forward.`

    const result2 = await sendSMS({ to: profile.phone, body: text2 }, logOpts)
    if (!result2.success) {
      console.error('Failed to send welcome tour text 2:', result2.error)
    }

    console.log(`Welcome tour SMS sent to user ${userId} (${name})`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    console.error('Error in send-welcome-tour-sms:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
