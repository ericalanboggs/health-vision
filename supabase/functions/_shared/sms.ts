/**
 * Shared Twilio SMS utility with retry logic
 * - Exponential backoff on 429 and network errors (1s, 2s, 4s)
 * - Optional logging to sms_messages or sms_reminders table
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

export interface SMSPayload {
  to: string
  body: string
}

export interface SMSLogOptions {
  supabase: ReturnType<typeof createClient>
  logTable: 'sms_messages' | 'sms_reminders'
  /** Extra columns to merge into the log row */
  extra?: Record<string, unknown>
}

export interface SMSResult {
  success: boolean
  sid?: string
  error?: string
}

/**
 * Send an SMS via Twilio with exponential backoff retry
 */
export async function sendSMS(
  payload: SMSPayload,
  logOptions?: SMSLogOptions,
  maxRetries = 3
): Promise<SMSResult> {
  const { to, body } = payload

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          },
          body: new URLSearchParams({
            To: to,
            From: TWILIO_PHONE_NUMBER!,
            Body: body,
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        // Log success if logOptions provided
        if (logOptions) {
          try {
            await logSMS(logOptions, to, body, data.sid, data.status || 'sent', null)
          } catch (err) {
            console.error('Error logging outbound SMS:', err)
          }
        }
        return { success: true, sid: data.sid }
      }

      // Rate limited — apply exponential backoff
      if (response.status === 429) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          console.log(`SMS rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await sleep(delay)
          continue
        }
        const errorMsg = 'Rate limit exceeded after retries'
        if (logOptions) {
          try { await logSMS(logOptions, to, body, null, 'failed', errorMsg) } catch {}
        }
        return { success: false, error: errorMsg }
      }

      // Non-retryable API error
      const errorMsg = data.message || `Twilio API error: ${response.status}`
      if (logOptions) {
        try { await logSMS(logOptions, to, body, null, 'failed', errorMsg) } catch {}
      }
      return { success: false, error: errorMsg }
    } catch (error) {
      // Network error — retry with backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        console.log(`SMS request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(delay)
        continue
      }
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      if (logOptions) {
        try { await logSMS(logOptions, to, body, null, 'failed', errorMsg) } catch {}
      }
      return { success: false, error: errorMsg }
    }
  }

  return { success: false, error: 'Max retries exceeded' }
}

/**
 * Log SMS to the specified table
 */
async function logSMS(
  opts: SMSLogOptions,
  phone: string,
  body: string,
  sid: string | null,
  status: string,
  errorMsg: string | null
): Promise<void> {
  const { supabase, logTable, extra = {} } = opts

  if (logTable === 'sms_messages') {
    const row: Record<string, unknown> = {
      direction: 'outbound',
      phone,
      body,
      sent_by_type: 'system',
      twilio_sid: sid,
      twilio_status: status,
      ...extra,
    }
    if (errorMsg) row.error_message = errorMsg
    const { error } = await supabase.from('sms_messages').insert(row)
    if (error) console.error('Error logging to sms_messages:', error)
  } else if (logTable === 'sms_reminders') {
    const row: Record<string, unknown> = {
      phone,
      message: body,
      status,
      twilio_sid: sid,
      ...extra,
    }
    if (errorMsg) row.error_message = errorMsg
    const { error } = await supabase.from('sms_reminders').insert(row)
    if (error) console.error('Error logging to sms_reminders:', error)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
