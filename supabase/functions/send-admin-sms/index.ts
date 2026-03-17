import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Admin emails for authorization
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') || 'eric.alan.boggs@gmail.com,eric@summithealth.app')
  .split(',')
  .map(e => e.trim().toLowerCase())

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

    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()

    // Handle resume-ai action: clear admin_sms_hold_until for a user
    if (body.action === 'resume-ai') {
      const { userId } = body
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ admin_sms_hold_until: null })
        .eq('id', userId)

      if (updateError) {
        console.error('Error clearing admin SMS hold:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to clear hold' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Admin ${user.email} resumed AI for user ${userId}`)
      return new Response(
        JSON.stringify({ success: true, action: 'resume-ai' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { recipients, message }: { recipients: Recipient[]; message: string } = body

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
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]

      const smsResult = await sendSMS(
        { to: recipient.phone, body: message },
        {
          supabase,
          logTable: 'sms_messages',
          extra: {
            user_id: recipient.userId,
            user_name: recipient.name,
            sent_by: user.id,
            sent_by_type: 'admin',
          },
        }
      )

      if (smsResult.success) {
        results.push({ userId: recipient.userId, status: 'sent', twilioSid: smsResult.sid })
        sentCount++
        console.log(`✓ Sent SMS to ${recipient.name} (${recipient.phone})`)
      } else {
        results.push({ userId: recipient.userId, status: 'failed', error: smsResult.error })
        failedCount++
        console.error(`✗ Failed to send SMS to ${recipient.name}: ${smsResult.error}`)
      }

      // Small delay between sends to avoid rate limiting (100ms)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Set admin_sms_hold_until = NOW() + 24h for all successfully-sent recipients
    const sentUserIds = results.filter(r => r.status === 'sent').map(r => r.userId)
    if (sentUserIds.length > 0) {
      const holdUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const { error: holdError } = await supabase
        .from('profiles')
        .update({ admin_sms_hold_until: holdUntil })
        .in('id', sentUserIds)

      if (holdError) {
        console.error('Error setting admin SMS hold:', holdError)
      } else {
        console.log(`Set admin SMS hold until ${holdUntil} for ${sentUserIds.length} user(s)`)
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
