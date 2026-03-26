import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const TWILIO_PHONE_NUMBER_LITE = Deno.env.get('TWILIO_PHONE_NUMBER_LITE')
const TWILIO_ACCOUNT_SID_LITE = Deno.env.get('TWILIO_ACCOUNT_SID_LITE')
const TWILIO_AUTH_TOKEN_LITE = Deno.env.get('TWILIO_AUTH_TOKEN_LITE')

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
    // Get auth token from header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Verify user
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const { code } = await req.json()
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Code is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Service role client for DB operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Check for matching, unexpired, unused verification code
    const { data: verification, error: verifyError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (verifyError) {
      console.error('Error checking verification code:', verifyError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify code' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    if (!verification) {
      // Check if there's an expired code to give a better error message
      const { data: expired } = await supabase
        .from('phone_verifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('code', code)
        .lte('expires_at', new Date().toISOString())
        .is('verified_at', null)
        .limit(1)
        .maybeSingle()

      if (expired) {
        return new Response(
          JSON.stringify({ error: 'Code has expired. Please request a new one.' }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        )
      }

      return new Response(
        JSON.stringify({ error: 'Invalid verification code.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Mark verification as used
    const { error: updateVerifyError } = await supabase
      .from('phone_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verification.id)

    if (updateVerifyError) {
      console.error('Error marking verification as used:', updateVerifyError)
    }

    // Update profile: mark phone as verified
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ phone_verified: true })
      .eq('id', user.id)

    if (updateProfileError) {
      console.error('Error updating profile phone_verified:', updateProfileError)
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    console.log(`Phone verified for user ${user.id}`)

    // Send opt-in confirmation SMS (required for A2P recurring campaigns)
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone, sms_opt_in, challenge_type')
      .eq('id', user.id)
      .single()

    if (profile?.phone && profile?.sms_opt_in) {
      const isLite = profile.challenge_type === 'lite'
      const confirmBody = isLite
        ? '\u26f0\ufe0f Welcome to the Tech Neck Challenge, brought to you by Summit Health! You\'ll get 5 coaching texts/day starting Monday. Msg & data rates may apply. Reply HELP for help, STOP to cancel.'
        : 'Welcome to Summit Health SMS Coaching! Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel.'
      const twilioOpts = isLite && TWILIO_PHONE_NUMBER_LITE
        ? { from: TWILIO_PHONE_NUMBER_LITE, accountSid: TWILIO_ACCOUNT_SID_LITE!, authToken: TWILIO_AUTH_TOKEN_LITE! }
        : {}
      const confirmResult = await sendSMS(
        { to: profile.phone, body: confirmBody, ...twilioOpts },
        {
          supabase,
          logTable: 'sms_messages',
          extra: { user_id: user.id, sent_by_type: 'system' },
        }
      )
      if (confirmResult.success) {
        console.log(`Opt-in confirmation SMS sent to user ${user.id}`)

        // Follow-up: encourage saving as contact + pinning, attach logo via MMS
        const followupBody = 'Tip: Save this number as "Summit Health" in your contacts and pin this conversation so you never miss a coaching text! Use the image above as your contact photo.'
        // Brief delay so messages arrive in order
        await new Promise(resolve => setTimeout(resolve, 3000))
        await sendSMS(
          { to: profile.phone, body: followupBody, mediaUrl: 'https://go.summithealth.app/summit-logo.png', ...twilioOpts },
          {
            supabase,
            logTable: 'sms_messages',
            extra: { user_id: user.id, sent_by_type: 'system' },
          }
        )
      } else {
        console.error(`Failed to send opt-in confirmation SMS: ${confirmResult.error}`)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )

  } catch (error) {
    console.error('Error in verify-phone-code:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})
