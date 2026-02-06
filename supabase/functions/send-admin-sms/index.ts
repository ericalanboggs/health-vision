import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Admin email for authorization
const ADMIN_EMAIL = 'eric.alan.boggs@gmail.com'

interface Recipient {
  userId: string
  phone: string
  name: string
}

interface SendResult {
  userId: string
  status: 'sent' | 'failed'
  twilioSid?: string
  error?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Verify the JWT and check if user is admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { recipients, message }: { recipients: Recipient[]; message: string } = await req.json()

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin ${user.email} sending SMS to ${recipients.length} recipients`)

    const results: SendResult[] = []
    let sentCount = 0
    let failedCount = 0

    // Send to each recipient with a small delay between sends
    for (const recipient of recipients) {
      try {
        // Send SMS via Twilio
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            },
            body: new URLSearchParams({
              To: recipient.phone,
              From: TWILIO_PHONE_NUMBER!,
              Body: message,
            }),
          }
        )

        const twilioData = await twilioResponse.json()

        if (twilioResponse.ok) {
          // Log successful send to sms_messages table
          await supabase.from('sms_messages').insert({
            direction: 'outbound',
            user_id: recipient.userId,
            phone: recipient.phone,
            user_name: recipient.name,
            body: message,
            sent_by: user.id,
            sent_by_type: 'admin',
            twilio_sid: twilioData.sid,
            twilio_status: twilioData.status || 'sent',
          })

          results.push({
            userId: recipient.userId,
            status: 'sent',
            twilioSid: twilioData.sid,
          })
          sentCount++
          console.log(`✓ Sent SMS to ${recipient.name} (${recipient.phone})`)
        } else {
          throw new Error(twilioData.message || `Twilio error: ${twilioData.code}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Log failed send
        await supabase.from('sms_messages').insert({
          direction: 'outbound',
          user_id: recipient.userId,
          phone: recipient.phone,
          user_name: recipient.name,
          body: message,
          sent_by: user.id,
          sent_by_type: 'admin',
          twilio_status: 'failed',
          error_message: errorMessage,
        })

        results.push({
          userId: recipient.userId,
          status: 'failed',
          error: errorMessage,
        })
        failedCount++
        console.error(`✗ Failed to send SMS to ${recipient.name}: ${errorMessage}`)
      }

      // Small delay between sends to avoid rate limiting (100ms)
      if (recipients.indexOf(recipient) < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-admin-sms function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
