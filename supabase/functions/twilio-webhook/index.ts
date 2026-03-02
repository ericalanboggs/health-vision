import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { sendSMS } from '../_shared/sms.ts'

const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// ─── Crisis detection ─────────────────────────────────────────────────

const CRISIS_PATTERNS = [
  /\b(kill\s*(my\s*)?self|suicide|suicidal)\b/i,
  /\b(want\s+to\s+die|wanna\s+die|ready\s+to\s+die)\b/i,
  /\b(end\s+(my\s+)?life|end\s+it\s+all)\b/i,
  /\b(self[\s-]?harm|hurt\s*(my\s*)?self|cutting\s*(my\s*)?self)\b/i,
  /\b(no\s+reason\s+to\s+live|better\s+off\s+dead)\b/i,
  /\b(overdose|od'?ing)\b/i,
]

const CRISIS_RESPONSE =
  `If you or someone you know is in crisis, please reach out:\n\n` +
  `988 Suicide & Crisis Lifeline: Call or text 988\n` +
  `Crisis Text Line: Text HOME to 741741\n` +
  `Emergency: Call 911\n\n` +
  `You are not alone. These services are free, confidential, and available 24/7.`

function isCrisisMessage(text: string): boolean {
  return CRISIS_PATTERNS.some(pattern => pattern.test(text))
}

async function sendCrisisSMS(to: string): Promise<void> {
  const result = await sendSMS({ to, body: CRISIS_RESPONSE })
  if (!result.success) {
    console.error('Error sending crisis response SMS:', result.error)
  }
}

/**
 * Validate Twilio webhook signature
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
async function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): Promise<boolean> {
  if (!TWILIO_AUTH_TOKEN) {
    console.warn('TWILIO_AUTH_TOKEN not set - skipping signature validation')
    return true // Allow in development
  }

  // Build the string to sign: URL + sorted params
  const sortedKeys = Object.keys(params).sort()
  let dataToSign = url
  for (const key of sortedKeys) {
    dataToSign += key + params[key]
  }

  // Create HMAC-SHA1 signature
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(TWILIO_AUTH_TOKEN),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(dataToSign)
  )

  // Convert to base64
  const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))

  return computedSignature === signature
}

/**
 * Parse form-urlencoded body from Twilio
 */
function parseFormData(body: string): Record<string, string> {
  const params: Record<string, string> = {}
  const pairs = body.split('&')
  for (const pair of pairs) {
    const [key, value] = pair.split('=')
    if (key && value !== undefined) {
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '))
    }
  }
  return params
}

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Get the raw body
    const bodyText = await req.text()
    const params = parseFormData(bodyText)

    console.log('Received Twilio webhook:', {
      from: params.From,
      to: params.To,
      body: params.Body?.substring(0, 50) + '...',
      messageSid: params.MessageSid,
    })

    // Validate Twilio signature (optional in dev, required in prod)
    const twilioSignature = req.headers.get('X-Twilio-Signature') || ''
    const webhookUrl = `${SUPABASE_URL}/functions/v1/twilio-webhook`

    const isValid = await validateTwilioSignature(webhookUrl, params, twilioSignature)
    if (!isValid) {
      console.error('Invalid Twilio signature')
      return new Response('Invalid signature', { status: 403 })
    }

    // Extract message details
    const fromPhone = params.From // User's phone number
    const toPhone = params.To // Our Twilio number
    const messageBody = params.Body || ''
    const messageSid = params.MessageSid

    if (!fromPhone || !messageBody) {
      console.error('Missing required fields: From or Body')
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Look up user by phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('phone', fromPhone)
      .maybeSingle()

    if (profileError) {
      console.error('Error looking up user by phone:', profileError)
    }

    const userId = profile?.id || null
    const userName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : null

    console.log(`Message from ${fromPhone} ${userName ? `(${userName})` : '(unknown user)'}: "${messageBody}"`)

    // Insert the inbound message into sms_messages table
    const { error: insertError } = await supabase.from('sms_messages').insert({
      direction: 'inbound',
      user_id: userId,
      phone: fromPhone,
      user_name: userName,
      body: messageBody,
      twilio_sid: messageSid,
      twilio_status: 'received',
    })

    if (insertError) {
      console.error('Error inserting inbound message:', insertError)
    } else {
      console.log(`✓ Logged inbound message from ${fromPhone}`)
    }

    // ─── CRISIS CHECK (first priority) ────────────────────────────────
    if (isCrisisMessage(messageBody)) {
      console.warn(`⚠️ CRISIS MESSAGE detected from ${fromPhone}: "${messageBody.substring(0, 80)}"`)

      // Log crisis event
      if (userId) {
        await supabase.from('sms_messages').insert({
          direction: 'outbound',
          user_id: userId,
          phone: fromPhone,
          user_name: userName,
          body: CRISIS_RESPONSE,
          sent_by_type: 'system',
          twilio_status: 'sent',
        })
      }

      // Send crisis resources immediately
      await sendCrisisSMS(fromPhone)

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Handle STOP/HELP keywords (Twilio handles these automatically, but we can log them)
    const upperBody = messageBody.toUpperCase().trim()
    if (upperBody === 'STOP' || upperBody === 'UNSUBSCRIBE') {
      console.log(`User ${fromPhone} requested opt-out via SMS`)
      // Twilio handles the opt-out automatically
      // Optionally update the user's sms_opt_in to false
      if (userId) {
        await supabase
          .from('profiles')
          .update({ sms_opt_in: false })
          .eq('id', userId)
        console.log(`Updated user ${userId} sms_opt_in to false`)
      }
    }

    if (upperBody === 'HELP') {
      console.log(`User ${fromPhone} requested help via SMS`)
      const helpResult = await sendSMS({ to: fromPhone, body: 'Summit Health: For help, email hello@summithealth.app. Reply STOP to unsubscribe.' })
      if (!helpResult.success) {
        console.error('Error sending HELP response SMS:', helpResult.error)
      }
    }

    // Handle BACKUP keyword — route to sms-backup-plan for plan adjustment
    if (userId && (upperBody === 'BACKUP' || upperBody.startsWith('BACKUP '))) {
      try {
        console.log(`Routing BACKUP request to sms-backup-plan for user ${userId}`)
        const backupUrl = `${SUPABASE_URL}/functions/v1/sms-backup-plan`
        const backupRes = await fetch(backupUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: bodyText,
        })
        console.log(`sms-backup-plan status: ${backupRes.status}`)
      } catch (backupError) {
        console.error('Error forwarding to sms-backup-plan:', backupError)
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Forward to habit-sms-response for processing (confirmation + chaining)
    if (userId) {
      try {
        console.log(`Forwarding message to habit-sms-response for user ${userId}`)
        const responseUrl = `${SUPABASE_URL}/functions/v1/habit-sms-response`
        const forwardRes = await fetch(responseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: bodyText,
        })
        console.log(`habit-sms-response status: ${forwardRes.status}`)
      } catch (forwardError) {
        console.error('Error forwarding to habit-sms-response:', forwardError)
      }
    }

    // Return empty TwiML response (habit-sms-response sends replies via Twilio API directly)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )

  } catch (error) {
    console.error('Error in twilio-webhook function:', error)
    // Return valid TwiML even on error to prevent Twilio retries
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
})
