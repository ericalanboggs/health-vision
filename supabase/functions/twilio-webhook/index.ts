import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { sendSMS } from '../_shared/sms.ts'
import { t } from '../_shared/i18n.ts'

const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// ─── Crisis detection (multilingual) ─────────────────────────────────────
// Detection runs across ALL supported languages regardless of the user's set language —
// someone may have preferred_language='en' but express crisis in Spanish/Portuguese. The
// response is sent in the language the crisis was expressed in.
//
// SAFETY GATE (localization Workstream S): patterns + resources reviewed & approved by
// Eric (native es/pt-BR speaker) on 2026-07-06 — 988 confirmed for the US pilot population,
// CVV 188 for Brazil. Re-verify resource numbers periodically. See LOCALIZATION_PHASE0_PLAN.md.

const CRISIS_PATTERNS: Record<string, RegExp[]> = {
  en: [
    /\b(kill\s*(my\s*)?self|suicide|suicidal)\b/i,
    /\b(want\s+to\s+die|wanna\s+die|ready\s+to\s+die)\b/i,
    /\b(end\s+(my\s+)?life|end\s+it\s+all)\b/i,
    /\b(self[\s-]?harm|hurt\s*(my\s*)?self|cutting\s*(my\s*)?self)\b/i,
    /\b(no\s+reason\s+to\s+live|better\s+off\s+dead)\b/i,
    /\b(overdose|od'?ing)\b/i,
  ],
  es: [
    /\b(quiero\s+morir(me)?|me\s+quiero\s+morir|ganas\s+de\s+morir)\b/i,
    /\b(matarme|me\s+quiero\s+matar|quiero\s+matarme|voy\s+a\s+matarme)\b/i,
    /\b(suicid(arme|io|arme|a)|me\s+voy\s+a\s+suicidar)\b/i,
    /\b(no\s+quiero\s+vivir|no\s+vale\s+la\s+pena\s+vivir|mejor\s+muert[oa])\b/i,
    /\b(acabar\s+con\s+(mi\s+vida|todo)|terminar\s+con\s+mi\s+vida)\b/i,
    /\b(hacerme\s+da[ñn]o|lastimarme|cortarme)\b/i,
  ],
  'pt-BR': [
    /\b(quero\s+morrer|vontade\s+de\s+morrer|prefiro\s+morrer)\b/i,
    /\b(me\s+matar|vou\s+me\s+matar|quero\s+me\s+matar)\b/i,
    /\b(suic[íi]d(io|ar|a)|vou\s+me\s+suicidar)\b/i,
    /\b(n[ãa]o\s+quero\s+viver|n[ãa]o\s+vale\s+a\s+pena\s+viver|melhor\s+mort[oa])\b/i,
    /\b(acabar\s+com\s+(a\s+minha\s+vida|tudo)|dar\s+um\s+fim)\b/i,
    /\b(me\s+machucar|me\s+cortar|me\s+ferir)\b/i,
  ],
}

const CRISIS_RESPONSE: Record<string, string> = {
  en:
    `If you or someone you know is in crisis, please reach out:\n\n` +
    `988 Suicide & Crisis Lifeline: Call or text 988\n` +
    `Crisis Text Line: Text HOME to 741741\n` +
    `Emergency: Call 911\n\n` +
    `You are not alone. These services are free, confidential, and available 24/7.`,
  es:
    `Si tú o alguien que conoces está en crisis, por favor busca ayuda:\n\n` +
    `988 Línea de Prevención del Suicidio y Crisis: llama o envía un mensaje al 988 (oprime 2 para español)\n` +
    `Crisis Text Line: envía AYUDA al 741741\n` +
    `Emergencias: llama al 911\n\n` +
    `No estás solo/a. Estos servicios son gratuitos, confidenciales y están disponibles 24/7.`,
  'pt-BR':
    `Se você ou alguém que você conhece está em crise, por favor procure ajuda:\n\n` +
    `EUA — 988 (Linha de Prevenção ao Suicídio e Crise): ligue ou envie mensagem para 988\n` +
    `Emergência nos EUA: ligue 911\n` +
    `Brasil — CVV: ligue 188 (24h, gratuito) ou acesse cvv.org.br\n\n` +
    `Você não está sozinho/a. Esses serviços são gratuitos, confidenciais e disponíveis 24 horas.`,
}

/** Returns the language a crisis message was expressed in ('en'|'es'|'pt-BR'), or null. */
function detectCrisisLang(text: string): string | null {
  for (const [lang, patterns] of Object.entries(CRISIS_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(text))) return lang
  }
  return null
}

async function sendCrisisSMS(to: string, lang: string): Promise<void> {
  const result = await sendSMS({ to, body: CRISIS_RESPONSE[lang] || CRISIS_RESPONSE.en })
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

    // Look up user by phone number (prefer non-lite user if multiple profiles share a phone)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, challenge_type, preferred_language')
      .eq('phone', fromPhone)
      .is('deleted_at', null)

    if (profileError) {
      console.error('Error looking up user by phone:', profileError)
    }

    // If multiple profiles match, prefer the Summit (non-lite) user
    const profile = profiles && profiles.length > 0
      ? profiles.find(p => p.challenge_type !== 'lite') || profiles[0]
      : null

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
    const crisisLang = detectCrisisLang(messageBody)
    if (crisisLang) {
      console.warn(`⚠️ CRISIS MESSAGE detected [${crisisLang}] from ${fromPhone}: "${messageBody.substring(0, 80)}"`)

      // Log crisis event (in the language the resources were sent)
      if (userId) {
        await supabase.from('sms_messages').insert({
          direction: 'outbound',
          user_id: userId,
          phone: fromPhone,
          user_name: userName,
          body: CRISIS_RESPONSE[crisisLang] || CRISIS_RESPONSE.en,
          sent_by_type: 'system',
          twilio_status: 'sent',
        })
      }

      // Send crisis resources immediately, in the detected language
      await sendCrisisSMS(fromPhone, crisisLang)

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
      const helpResult = await sendSMS({ to: fromPhone, body: t('help_response', profile?.preferred_language || 'en') })
      if (!helpResult.success) {
        console.error('Error sending HELP response SMS:', helpResult.error)
      }
    }

    // Handle opt-in keywords (START, SUBSCRIBE, YES)
    // Only treat YES as opt-in if user is NOT already opted in — otherwise it's a habit reply
    const isOptInKeyword = upperBody === 'START' || upperBody === 'SUBSCRIBE' ||
      (upperBody === 'YES' && (!profile || !profile.sms_opt_in))
    if (isOptInKeyword) {
      console.log(`User ${fromPhone} requested opt-in via SMS keyword: ${upperBody}`)
      if (userId) {
        await supabase
          .from('profiles')
          .update({ sms_opt_in: true })
          .eq('id', userId)
        console.log(`Updated user ${userId} sms_opt_in to true`)
        const optInResult = await sendSMS(
          { to: fromPhone, body: t('optin_confirm', profile?.preferred_language || 'en') },
          { supabase, logTable: 'sms_messages', extra: { user_id: userId, sent_by_type: 'system' } }
        )
        if (!optInResult.success) {
          console.error('Error sending opt-in confirmation SMS:', optInResult.error)
        }
      } else {
        // Unknown phone number — direct them to sign up
        await sendSMS({ to: fromPhone, body: 'Summit Health: To subscribe, create an account at go.summithealth.app and enable SMS reminders during setup.' })
      }
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Handle ARCHIVE keyword — archive challenge habits from most recent completed challenge
    if (userId && upperBody === 'ARCHIVE') {
      try {
        console.log(`Processing ARCHIVE request for user ${userId}`)

        // Find most recently completed challenge
        const { data: completedEnrollment } = await supabase
          .from('challenge_enrollments')
          .select('id, challenge_slug')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!completedEnrollment) {
          await sendSMS(
            { to: fromPhone, body: 'No recently completed challenge habits to archive. Your habits are still active.' },
            { supabase, logTable: 'sms_messages', extra: { user_id: userId, sent_by_type: 'system' } }
          )
        } else {
          // Check if there are un-archived habits for this challenge
          const { data: challengeHabits } = await supabase
            .from('weekly_habits')
            .select('id, habit_name')
            .eq('user_id', userId)
            .eq('challenge_slug', completedEnrollment.challenge_slug)
            .is('archived_at', null)

          if (!challengeHabits || challengeHabits.length === 0) {
            await sendSMS(
              { to: fromPhone, body: 'Your challenge habits are already archived.' },
              { supabase, logTable: 'sms_messages', extra: { user_id: userId, sent_by_type: 'system' } }
            )
          } else {
            // Archive all challenge habits
            const { error: archiveError } = await supabase
              .from('weekly_habits')
              .update({ archived_at: new Date().toISOString() })
              .eq('user_id', userId)
              .eq('challenge_slug', completedEnrollment.challenge_slug)

            if (archiveError) {
              console.error('Error archiving challenge habits:', archiveError)
              await sendSMS({ to: fromPhone, body: 'Something went wrong archiving your habits. Please try again later.' })
            } else {
              const habitNames = [...new Set(challengeHabits.map(h => h.habit_name))]
              console.log(`Archived ${habitNames.length} challenge habits for user ${userId}`)
              await sendSMS(
                { to: fromPhone, body: `Done! ${habitNames.length} challenge habit${habitNames.length > 1 ? 's' : ''} archived. You can restore them anytime from the Habits page in the app.` },
                { supabase, logTable: 'sms_messages', extra: { user_id: userId, sent_by_type: 'system' } }
              )
            }
          }
        }
      } catch (archiveError) {
        console.error('Error processing ARCHIVE:', archiveError)
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
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

    // Handle ADD keyword — route to sms-add-habit for new habit creation
    if (userId && (upperBody === 'ADD' || upperBody === 'NEW HABIT')) {
      try {
        console.log(`Routing ADD request to sms-add-habit for user ${userId}`)
        const addHabitUrl = `${SUPABASE_URL}/functions/v1/sms-add-habit`
        const addHabitRes = await fetch(addHabitUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: bodyText,
        })
        console.log(`sms-add-habit status: ${addHabitRes.status}`)
      } catch (addError) {
        console.error('Error forwarding to sms-add-habit:', addError)
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Check for active reflection session — route to sms-reflection-response
    if (userId) {
      const { data: reflectionSession } = await supabase
        .from('sms_reflection_sessions')
        .select('id')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle()

      if (reflectionSession) {
        try {
          console.log(`Routing to sms-reflection-response for user ${userId} (active session)`)
          const reflectionUrl = `${SUPABASE_URL}/functions/v1/sms-reflection-response`
          const reflectionRes = await fetch(reflectionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: bodyText,
          })
          console.log(`sms-reflection-response status: ${reflectionRes.status}`)
        } catch (reflectionError) {
          console.error('Error forwarding to sms-reflection-response:', reflectionError)
        }

        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }
    }

    // Check for Motivation Mode: active check-in session OR a motivation_mode user.
    // These users are off the habit-tracking track, so their replies must NOT fall through
    // to habit-sms-response (it would misparse them as habit-tracking answers).
    if (userId) {
      const { data: motivationSession } = await supabase
        .from('sms_motivation_checkin_sessions')
        .select('id')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle()

      let routeMotivation = !!motivationSession
      if (!routeMotivation) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('motivation_mode')
          .eq('id', userId)
          .maybeSingle()
        routeMotivation = !!prof?.motivation_mode
      }

      if (routeMotivation) {
        try {
          console.log(`Routing to sms-motivation-checkin for user ${userId}`)
          const motUrl = `${SUPABASE_URL}/functions/v1/sms-motivation-checkin`
          const motRes = await fetch(motUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: bodyText,
          })
          console.log(`sms-motivation-checkin status: ${motRes.status}`)
        } catch (motError) {
          console.error('Error forwarding to sms-motivation-checkin:', motError)
        }

        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }
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
