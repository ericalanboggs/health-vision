import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const CAL_WEBHOOK_SECRET = Deno.env.get('CAL_WEBHOOK_SECRET')

/**
 * Verify Cal.com webhook signature (HMAC-SHA256)
 */
async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  if (!CAL_WEBHOOK_SECRET || !signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(CAL_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return expected === signature
}

/**
 * Derive billing period from a subscription's current_period_end.
 * Mirrors the frontend getBillingPeriod() logic.
 */
function getBillingPeriod(periodEnd: string | null): { start: string; end: string } {
  const now = new Date()
  if (periodEnd) {
    const end = new Date(periodEnd)
    const start = new Date(end)
    start.setMonth(start.getMonth() - 1)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }
  // Fallback: calendar month
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

serve(async (req) => {
  try {
    const body = await req.text()

    // Verify webhook signature
    const signature = req.headers.get('x-cal-signature-256')
    const isValid = await verifySignature(body, signature)
    if (!isValid) {
      console.error('Cal.com webhook signature verification failed')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payload = JSON.parse(body)
    const eventType = payload.triggerEvent

    console.log(`Processing Cal.com event: ${eventType}`)

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    if (eventType === 'BOOKING_CREATED') {
      const booking = payload.payload
      const attendeeEmail = booking.attendees?.[0]?.email

      if (!attendeeEmail) {
        console.error('No attendee email in booking payload')
        return new Response(
          JSON.stringify({ error: 'No attendee email' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Look up user by email in profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, subscription_current_period_end')
        .eq('email', attendeeEmail)
        .single()

      if (profileError || !profileData) {
        console.error('User not found for email:', attendeeEmail, profileError)
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const period = getBillingPeriod(profileData.subscription_current_period_end)
      const sessionDate = booking.startTime
        ? new Date(booking.startTime).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const { error: insertError } = await supabase
        .from('coaching_sessions')
        .insert({
          user_id: profileData.id,
          session_date: sessionDate,
          duration_minutes: 30,
          logged_by: 'cal-webhook',
          billing_period_start: period.start,
          billing_period_end: period.end,
          notes: `Booking ID: ${booking.uid || 'unknown'}`,
        })

      if (insertError) {
        console.error('Error inserting coaching session:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to record session' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Coaching session recorded for user ${profileData.id}, date: ${sessionDate}`)

    } else if (eventType === 'BOOKING_CANCELLED') {
      const booking = payload.payload
      const attendeeEmail = booking.attendees?.[0]?.email

      if (!attendeeEmail) {
        console.error('No attendee email in cancellation payload')
        return new Response(
          JSON.stringify({ received: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Look up user by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', attendeeEmail)
        .single()

      if (profileError || !profileData) {
        console.log('User not found for cancellation, email:', attendeeEmail)
        return new Response(
          JSON.stringify({ received: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Delete the matching coaching session by booking ID in notes
      const bookingUid = booking.uid
      if (bookingUid) {
        const { error: deleteError } = await supabase
          .from('coaching_sessions')
          .delete()
          .eq('user_id', profileData.id)
          .like('notes', `%${bookingUid}%`)

        if (deleteError) {
          console.error('Error deleting coaching session:', deleteError)
        } else {
          console.log(`Coaching session cancelled for user ${profileData.id}, booking: ${bookingUid}`)
        }
      }

    } else {
      console.log(`Unhandled Cal.com event type: ${eventType}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in cal-webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
