/**
 * generate-motivation-batch
 * ─────────────────────────
 * Builds a week of Motivation Mode content for a contemplation-stage user.
 *
 * For each motivation_mode user:
 *   1. Load the coach-authored steering prompt (+ first name for the greeting). The
 *      steering prompt is the SOLE topic source — we deliberately do NOT feed the user's
 *      Vision/why from their profile, which is often stale or off-thesis.
 *   2. Load prior queue history so the content "builds on itself" (and to de-dup).
 *   3. gpt-4o-mini plans a coherent arc of N items (videos + quotes) from the steering
 *      prompt + history. Each item ships a coach-voice framing line, and every
 *      video item ALSO ships a fallback quote.
 *   4. Resolve each video via youtube.searchShortVideos() (Reels/Shorts). If a video
 *      slot yields nothing (or fails link-verify), it degrades to its fallback quote —
 *      we NEVER persist a null/broken URL.
 *   5. Rows are written status='pending_review', source='ai'. Nothing sends until a
 *      human approves them (see send-daily-motivation).
 *
 *   ┌── steering prompt + history ──► gpt-4o-mini ──► arc plan (JSON)
 *   │                                                            │
 *   │   video slot ─► searchShortVideos ─► verifyUrl ─┬─ ok ──► video row
 *   │                                                 └─ fail ─► fallback quote row
 *   │   quote slot ────────────────────────────────────────► quote row
 *   └──────────────────────────────────────────────► insert 'pending_review'
 *
 * Trigger: weekly pg_cron (no body) OR admin ({ userId, regenerate }).
 * Deploy with --no-verify-jwt (cron- and admin-invoked).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { loadUserContext } from '../_shared/user_context.ts'
import { coachKnowledgeBlock } from '../_shared/coach_knowledge.ts'
import { YouTubeAPI } from '../generate-weekly-digest/youtubeApi.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')!
// Same fallback as send-admin-sms so admin auth works even without the secret set.
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') || 'eric.alan.boggs@gmail.com,eric@summithealth.app')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Shared voice directive for all generated SMS framing — keeps the planner and the
// video-framer consistent, and warmer than a plain "be warm" instruction.
const FRAMING_VOICE =
  'VOICE: warm, genuinely encouraging, and human — like a coach who is glad to see them. A little positivity ' +
  'goes a long way; celebrate the small stuff. Use 1–2 tasteful emoji that fit the moment (e.g. 🌿 ⛰️ ☀️ 💚 😌 🙌) ' +
  '— never more, never forced. Lead with a touch of warmth, close on the tiny action.'

interface PlannedItem {
  type: 'video' | 'quote'
  theme: string
  search_query?: string
  quote_text?: string
  quote_author?: string
  coach_framing: string
}

async function callOpenAI(systemPrompt: string, userPrompt: string, temperature = 0.7, maxTokens = 1400): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
    }),
  })
  if (!response.ok) {
    const errText = await response.text()
    console.error('OpenAI API error:', response.status, errText)
    throw new Error(`OpenAI API error: ${response.status}`)
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

function parseJSON(content: string): any {
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  }
  return JSON.parse(jsonStr)
}

/** Best-effort link check: drop anything that doesn't return 200. */
async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    return res.ok
  } catch (_e) {
    return false
  }
}

/**
 * Returns the user's LOCAL calendar date, N days from today, as YYYY-MM-DD.
 * Anchors on the user's local "today" (not UTC) so late-evening generation doesn't
 * skew the first scheduled date a day forward.
 */
function localDatePlus(tz: string, days: number): string {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz }) // user-local YYYY-MM-DD
  const [y, m, d] = todayStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().split('T')[0]
}

// Deterministic pre-filter: drop obvious hustle/grind content before it reaches the LLM.
const HUSTLE_RE = /(no excuses|kill your|grind|hustle|beast mode|rise and shine|5\s?am|discipline equals|alpha|stop being lazy|motivational speech|crush it|pump.?up|sigma|warrior mindset|push harder|never quit|outwork)/i
function isHustle(title = ''): boolean {
  return HUSTLE_RE.test(title)
}

/**
 * Second pass: given the REAL candidate videos (title + description), let the model pick the
 * one that genuinely fits the permission genre + theme AND write the framing grounded in that
 * actual clip. Returns { fit:false } if none fit (caller falls back to a quote). This is what
 * keeps the SMS text connected to the video the user actually receives.
 */
async function pickAndFrameVideo(
  item: PlannedItem,
  candidates: { videoId: string; title: string; description: string }[],
  steeringPrompt: string,
  knowledgeHaystack: string,
): Promise<{ fit: boolean; index?: number; coach_framing?: string }> {
  const list = candidates.map((v, i) => `${i}. "${v.title}" — ${(v.description || '').slice(0, 160)}`).join('\n')
  const system = [
    coachKnowledgeBlock(knowledgeHaystack),
    '',
    'You are choosing ONE short video for a burned-out, contemplation-stage user, and writing the SMS that ships with it.',
    'PERMISSION genre only ("do less, on purpose"). REJECT hustle / grind / discipline / "no excuses" / pump-up /',
    'motivational-speech content — it repels this audience. The video CONTENT must genuinely match the message you write;',
    'do not describe a calm video if the clip is a hype speech.',
    'Write coach_framing: an SMS-length note in the Summit coach voice that reflects what THIS specific video',
    'actually is, ties to the coach steering prompt, and ENDS with one absurdly small, optional action tied to it.',
    FRAMING_VOICE,
    'If NONE of the candidates fit the permission genre AND the theme, return {"fit":false}.',
    'Respond as JSON: {"fit":true|false,"index":<number>,"coach_framing":"..."}',
  ].join('\n')
  const user = [
    `THEME: ${item.theme}`,
    `COACH STEERING (the sole thesis — frame everything around this): ${steeringPrompt}`,
    '',
    'CANDIDATE VIDEOS:',
    list,
  ].join('\n')
  const raw = await callOpenAI(system, user, 0.6, 400)
  return parseJSON(raw)
}

/**
 * Build one user's batch and insert it. Returns a small summary.
 */
async function buildBatchForUser(
  supabase: ReturnType<typeof createClient>,
  youtube: YouTubeAPI,
  profile: { id: string; motivation_prompt: string | null; motivation_cadence: string | null; timezone: string | null },
  regenerate: boolean,
): Promise<{ userId: string; status: string; inserted?: number; detail?: string }> {
  const userId = profile.id

  // Guard: don't pile up un-reviewed batches unless explicitly regenerating.
  const { data: pending } = await supabase
    .from('motivation_content_queue')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending_review')
    .limit(1)
  if (pending && pending.length > 0 && !regenerate) {
    return { userId, status: 'skipped', detail: 'pending_review batch already exists (pass regenerate=true to replace)' }
  }
  if (regenerate && pending && pending.length > 0) {
    await supabase.from('motivation_content_queue').delete().eq('user_id', userId).eq('status', 'pending_review')
  }

  if (!profile.motivation_prompt) {
    return { userId, status: 'skipped', detail: 'no motivation_prompt set' }
  }

  const ctx = await loadUserContext(supabase, userId, profile.timezone || undefined)

  // History (last ~20 sent/queued) so the arc builds on itself + we de-dup.
  const { data: history } = await supabase
    .from('motivation_content_queue')
    .select('content_type, title, url, theme:body, week_batch')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  const seenUrls = new Set((history || []).map((h: any) => h.url).filter(Boolean))
  const historyLines = (history || [])
    .map((h: any) => `- [${h.content_type}] ${h.title || h.theme || ''}`)
    .join('\n') || '(none yet — this is the first batch)'

  // Next batch number
  const { data: lastBatch } = await supabase
    .from('motivation_content_queue')
    .select('week_batch')
    .eq('user_id', userId)
    .order('week_batch', { ascending: false })
    .limit(1)
    .maybeSingle()
  const weekBatch = (lastBatch?.week_batch || 0) + 1

  const cadence = profile.motivation_cadence || 'daily'
  const itemCount = cadence === 'daily' ? 7 : 3
  const stepDays = cadence === 'daily' ? 1 : 2

  // ── Plan the arc ──────────────────────────────────────────────────────────
  // Drive the haystack off the steering prompt ALONE so coach_knowledge surfaces
  // condition slices relevant to what the user actually asked for — not stale
  // themes from their profile Vision/why.
  const knowledgeHaystack = profile.motivation_prompt
  const systemPrompt = [
    coachKnowledgeBlock(knowledgeHaystack),
    '',
    'You are planning a week of daily "Motivation Mode" content for a user who is NOT yet ready for habit',
    'tracking — they are in the contemplation stage, and likely burned out and depleted. Your job is to build',
    'readiness, never to pressure them. They are an existing user (retention), so do NOT pitch sign-ups.',
    '',
    'GENRE (critical): this audience is burned out. "Rise and grind", hustle, discipline, 5am-club content',
    'REPELS them. The motivation that lands is PERMISSION: you do not have to earn rest, one small boundary is',
    'enough this week, movement counts even as a 5-minute walk. The message is "do less, on purpose" — never "be more".',
    '',
    'MICRO-ACTION (critical): every single piece must END with ONE absurdly small, near-zero-effort action tied',
    'to the steering prompt, framed as a gentle invitation they can take or leave — NOT an assignment. So small it',
    'is almost impossible to refuse (e.g. "decline one meeting this week", "lights out 10 minutes earlier tonight",',
    '"one 5-minute walk, that is it"). The content is the hook; this tiny action is the point.',
    '',
    `Plan exactly ${itemCount} items forming a COHERENT ARC that builds on what they have already seen (below),`,
    'pointed squarely at the COACH STEERING PROMPT below — that prompt is the SOLE thesis for what this content is',
    'about. Do NOT introduce themes from anywhere else; if a topic is not in the steering prompt, it does not belong.',
    'Favor short videos (Reels/Shorts, under ~5 min)',
    'with some quotes mixed in.',
    'For each VIDEO item: give a SPECIFIC, calming search_query (e.g. "gentle restorative yoga 5 minutes",',
    '"box breathing for stress relief", "short body scan for sleep"). AVOID the words "motivation",',
    '"motivational speech", "no excuses", "hustle", "discipline" — those surface grind content that repels',
    'this user. Also give a fallback quote_text/quote_author (used only if no good video is found).',
    'For each QUOTE item: prefer a REAL, attributable quote that names a mechanism or lands a counterintuitive',
    'reframe. Do NOT use "Unknown" / "Anonymous" — if you cannot attribute it confidently, write an original',
    'one-line reframe in the coach voice and leave quote_author empty. Ban platitudes ("small changes lead to big',
    'results", "you can\'t pour from an empty cup") — they are filler.',
    'For EVERY item: write coach_framing — a warm, SMS-length note in the Summit coach voice that introduces the',
    'piece, ties it to the steering prompt, and ENDS with the one tiny action. Do not number them or say "today\'s".',
    FRAMING_VOICE,
    '',
    'Respond as JSON: {"items":[{"type":"video|quote","theme":"...","search_query":"...","quote_text":"...","quote_author":"...","coach_framing":"..."}]}',
  ].join('\n')

  const userPrompt = [
    `USER: ${ctx.firstName}`,
    '',
    `COACH STEERING PROMPT — the SOLE source of truth for what this content is about.`,
    `Build every item from this and nothing else; do not infer topics from elsewhere:`,
    profile.motivation_prompt,
    '',
    `ALREADY SENT/QUEUED (do not repeat these; build forward from them):`,
    historyLines,
  ].filter(Boolean).join('\n')

  let planned: PlannedItem[]
  try {
    const raw = await callOpenAI(systemPrompt, userPrompt)
    const parsed = parseJSON(raw)
    planned = Array.isArray(parsed) ? parsed : (parsed.items || [])
  } catch (e) {
    console.error(`[${userId}] arc planning failed:`, e)
    return { userId, status: 'error', detail: 'arc planning failed' }
  }
  if (!planned || planned.length === 0) {
    return { userId, status: 'error', detail: 'planner returned no items' }
  }

  // ── Resolve each item to a concrete row ───────────────────────────────────
  const rows: any[] = []
  const tz = profile.timezone || 'America/Chicago'
  let dayOffset = 1
  for (const item of planned.slice(0, itemCount)) {
    const scheduledDate = localDatePlus(tz, dayOffset)
    dayOffset += stepDays

    let resolved: any = null

    if (item.type === 'video' && item.search_query) {
      // Pass 1 already produced the query. Resolve REAL candidates, drop dupes + obvious hustle.
      const candidates = (await youtube.searchShortVideos(item.search_query, 6))
        .filter(v => !seenUrls.has(YouTubeAPI.watchUrl(v.videoId)) && !isHustle(v.title))
      if (candidates.length > 0) {
        try {
          // Pass 2: model picks the best-fitting real clip + writes framing grounded in it (or rejects all).
          const pick = await pickAndFrameVideo(item, candidates, profile.motivation_prompt || '', knowledgeHaystack)
          const chosen = pick?.fit && pick.index != null ? candidates[pick.index] : null
          if (chosen) {
            const url = YouTubeAPI.watchUrl(chosen.videoId)
            if (await verifyUrl(url)) {
              seenUrls.add(url)
              resolved = {
                content_type: 'video',
                title: chosen.title,
                url,
                body: item.theme || (chosen.description || '').slice(0, 280),
                coach_framing: pick.coach_framing || item.coach_framing,
              }
            }
          }
        } catch (e) {
          console.error(`[${userId}] video pick/frame failed:`, e)
        }
      }
    }

    // Quote, or video-slot fallback to its quote (used when no video fit the permission genre)
    if (!resolved) {
      const qText = item.quote_text
      if (qText) {
        // Drop placeholder attributions so we never ship "— Unknown".
        const rawAuthor = (item.quote_author || '').trim()
        const author = /^(unknown|anonymous|n\.?\/?a\.?)$/i.test(rawAuthor) ? '' : rawAuthor
        resolved = {
          content_type: 'quote',
          title: author ? `— ${author}` : 'Quote',
          url: null,
          body: author ? `"${qText}" — ${author}` : `"${qText}"`,
          coach_framing: item.coach_framing,
        }
      }
    }

    if (resolved) {
      rows.push({
        user_id: userId,
        ...resolved,
        week_batch: weekBatch,
        scheduled_date: scheduledDate,
        status: 'pending_review',
        source: 'ai',
      })
    }
  }

  if (rows.length === 0) {
    return { userId, status: 'error', detail: 'no items resolved (video + quote both failed)' }
  }

  const { error: insertError } = await supabase.from('motivation_content_queue').insert(rows)
  if (insertError) {
    console.error(`[${userId}] insert failed:`, insertError)
    return { userId, status: 'error', detail: insertError.message }
  }

  return { userId, status: 'ok', inserted: rows.length, detail: `batch ${weekBatch}` }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const youtube = new YouTubeAPI(YOUTUBE_API_KEY)

  // ── Auth: allow cron (service-role bearer) OR an admin JWT ────────────────
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim()
  let authed = token === SUPABASE_SERVICE_ROLE_KEY
  if (!authed && token) {
    try {
      const { data: { user } } = await supabase.auth.getUser(token)
      authed = !!user && ADMIN_EMAILS.includes((user.email || '').toLowerCase())
    } catch (_e) { authed = false }
  }
  if (!authed) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { userId?: string; regenerate?: boolean } = {}
  try { body = await req.json() } catch (_e) { /* cron sends no body */ }

  // Target one user (admin) or all motivation_mode users (cron).
  let query = supabase
    .from('profiles')
    .select('id, motivation_prompt, motivation_cadence, timezone')
    .eq('motivation_mode', true)
  if (body.userId) query = query.eq('id', body.userId)

  const { data: users, error: usersError } = await query
  if (usersError) {
    return new Response(JSON.stringify({ error: usersError.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const results = []
  for (const profile of users || []) {
    try {
      results.push(await buildBatchForUser(supabase, youtube, profile as any, !!body.regenerate))
    } catch (e) {
      console.error(`[${(profile as any).id}] batch error:`, e)
      results.push({ userId: (profile as any).id, status: 'error', detail: String(e) })
    }
  }

  return new Response(JSON.stringify({ success: true, count: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
