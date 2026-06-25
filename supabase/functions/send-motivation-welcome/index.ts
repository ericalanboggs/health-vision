/**
 * send-motivation-welcome
 * ───────────────────────
 * Fires the moment a user self-enrolls in Motivation Mode (DB trigger on
 * motivation_mode false→true). Sends ONE immediate, expectation-setting welcome
 * SMS — separate from the curated daily content, and NOT gated by admin approval.
 *
 * Why it exists: the first curated batch lands 'pending_review' (hybrid approval)
 * and only sends at ~9:30am local the next day, so without this the user would
 * hear nothing right after onboarding. This text is the honest first touch the
 * landing page promises ("we just texted you").
 *
 * The "[their focus]" phrase is distilled from the free-text steering prompt by a
 * tiny gpt-4o-mini call, with a generic fallback so the message never breaks.
 *
 * Deploy with --no-verify-jwt (DB-trigger invoked via service-role bearer).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendSMS } from '../_shared/sms.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FALLBACK_FOCUS = 'what matters to you'

/** Distill the free-text steering prompt into a short focus phrase for the welcome SMS. */
async function distillFocus(steeringPrompt: string): Promise<string> {
  if (!OPENAI_API_KEY || !steeringPrompt?.trim()) return FALLBACK_FOCUS
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 60,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'Distill the user\'s note into a SHORT focus phrase (3–8 words) naming what they want',
              'inspiration around, phrased in second person where natural (e.g. "finding work that uses',
              'your strengths", "feeling like yourself again", "rebuilding your energy"). Lowercase, no',
              'quotes, no trailing period, no leading "to". If the note is unclear or empty, respond with',
              `exactly: ${FALLBACK_FOCUS}`,
              'Respond as JSON: {"focus":"..."}',
            ].join(' '),
          },
          { role: 'user', content: steeringPrompt.slice(0, 600) },
        ],
      }),
    })
    if (!res.ok) {
      console.error('distillFocus OpenAI error:', res.status, await res.text())
      return FALLBACK_FOCUS
    }
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const focus = (JSON.parse(raw).focus || '').trim().replace(/^["']|["']$/g, '').replace(/\.$/, '')
    return focus || FALLBACK_FOCUS
  } catch (e) {
    console.error('distillFocus failed:', e)
    return FALLBACK_FOCUS
  }
}

function buildWelcome(focus: string): string {
  return (
    `Welcome to Summit 🌱 Here's what to expect: one short text a day with a little inspiration around ` +
    `${focus}. No tracking, no judgment — just small nudges to get you moving. Every so often I'll check ` +
    `in to see if you'd like to turn one into a small habit — but there's zero pressure to reply, ever. ` +
    `Everyone's on their own journey, at their own pace, and yours is exactly right.`
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Auth: service-role bearer only (this is DB-trigger invoked).
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim()
  if (token !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let userId: string | null = null
  try { userId = (await req.json()).userId || null } catch (_e) { /* no body */ }
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, first_name, phone, sms_opt_in, deleted_at, motivation_mode, motivation_prompt')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return new Response(JSON.stringify({ error: 'profile not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Guards: only motivation-mode users with a usable, opted-in phone.
  if (!profile.motivation_mode || profile.deleted_at || !profile.phone || profile.sms_opt_in === false) {
    return new Response(JSON.stringify({ skipped: 'ineligible (mode/phone/opt-in)' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Dedup: never send the welcome twice (trigger only fires on transition, but be safe).
  const { data: prior } = await supabase
    .from('sms_messages')
    .select('id')
    .eq('user_id', userId)
    .eq('sent_by_type', 'motivation_welcome')
    .limit(1)
  if (prior && prior.length > 0) {
    return new Response(JSON.stringify({ skipped: 'welcome already sent' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const focus = await distillFocus(profile.motivation_prompt || '')
  const body = buildWelcome(focus)

  const result = await sendSMS({ to: profile.phone, body }, {
    supabase,
    logTable: 'sms_messages',
    extra: { user_id: userId, user_name: profile.first_name || null, sent_by_type: 'motivation_welcome' },
  })

  return new Response(JSON.stringify({ sent: !!result?.success, focus }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
