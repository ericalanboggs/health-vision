import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const PROGRAM_START_DATE = Deno.env.get('PROGRAM_START_DATE') || '2026-01-12'

interface Profile {
  id: string
  first_name: string
  email: string
}

function getCurrentWeekNumber(): number {
  const programStartDate = new Date(PROGRAM_START_DATE)
  const now = new Date()
  const diffTime = now.getTime() - programStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1
  return Math.max(1, weekNumber)
}

/**
 * Fan-out orchestrator: dispatches per-user digest generation.
 *
 * Each user gets their own `generate-weekly-digest` invocation with its own
 * 150s timeout, so this scales to any number of users.
 *
 * We use a 5s AbortController timeout per request — just enough to confirm
 * the request reached Supabase. The per-user function continues running
 * independently even after we stop waiting for the response.
 */
serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let weekNumber: number
    let dryRun = false

    try {
      const body = await req.json()
      weekNumber = body.week_number || getCurrentWeekNumber()
      dryRun = body.dry_run === true
    } catch {
      weekNumber = getCurrentWeekNumber()
    }

    console.log(`\n=== Generate All Weekly Digests (Fan-Out) ===`)
    console.log(`Week: ${weekNumber}`)
    console.log(`Dry run: ${dryRun}`)
    console.log(`Timestamp: ${new Date().toISOString()}\n`)

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get all users with completed profiles (exclude soft-deleted)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, email')
      .eq('profile_completed', true)
      .not('email', 'is', null)
      .is('deleted_at', null)

    if (profilesError) throw profilesError

    console.log(`Found ${profiles?.length || 0} eligible users`)

    // Check who already has a digest for this week
    const { data: existingDigests } = await supabase
      .from('weekly_digests')
      .select('user_id')
      .eq('week_number', weekNumber)

    const usersWithDigest = new Set(existingDigests?.map(d => d.user_id) || [])
    console.log(`${usersWithDigest.size} users already have digests for week ${weekNumber}`)

    // Filter to users without digests
    const usersToProcess = (profiles || []).filter((p: Profile) => !usersWithDigest.has(p.id))
    console.log(`${usersToProcess.length} users need digests generated`)

    if (dryRun) {
      return new Response(
        JSON.stringify({
          message: 'Dry run complete',
          would_generate_for: usersToProcess.map((p: Profile) => ({ id: p.id, email: p.email, name: p.first_name })),
          count: usersToProcess.length,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (usersToProcess.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All users already have digests', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fan out: invoke generate-weekly-digest for each user
    // Each gets its own function invocation with its own timeout
    const functionUrl = `${SUPABASE_URL}/functions/v1/generate-weekly-digest`
    const results: Array<{ userId: string; email: string; status: string }> = []

    async function dispatchForUser(user: Profile) {
      const controller = new AbortController()
      // 5s timeout — just confirm the request was received by Supabase.
      // The per-user function continues running independently.
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: user.id, week_number: weekNumber }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        // If we get here, the function already completed (fast)
        console.log(`✓ ${user.first_name} (${user.email}): completed ${response.status}`)
        return { userId: user.id, email: user.email, status: response.ok ? 'completed' : `error_${response.status}` }
      } catch (error) {
        clearTimeout(timeoutId)
        if (error.name === 'AbortError') {
          // Request was sent, function is running, we just didn't wait for completion
          console.log(`→ ${user.first_name} (${user.email}): dispatched (running in background)`)
          return { userId: user.id, email: user.email, status: 'dispatched' }
        }
        const msg = error instanceof Error ? error.message : 'Unknown'
        console.error(`✗ ${user.email}: ${msg}`)
        return { userId: user.id, email: user.email, status: 'failed' }
      }
    }

    // Dispatch in batches of 5 to avoid overwhelming the function infrastructure
    const BATCH_SIZE = 5
    for (let i = 0; i < usersToProcess.length; i += BATCH_SIZE) {
      const batch = (usersToProcess as Profile[]).slice(i, i + BATCH_SIZE)
      console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} users)...`)

      const batchResults = await Promise.allSettled(batch.map(dispatchForUser))

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error('Unexpected batch error:', result.reason)
        }
      }

      // Brief delay between batches
      if (i + BATCH_SIZE < usersToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const dispatched = results.filter(r => r.status === 'dispatched' || r.status === 'completed').length
    const failed = results.filter(r => r.status === 'failed').length

    console.log(`\n=== Complete ===`)
    console.log(`Dispatched: ${dispatched}, Failed: ${failed}`)

    return new Response(
      JSON.stringify({
        message: 'Fan-out digest generation complete',
        week_number: weekNumber,
        dispatched,
        failed,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-all-weekly-digests:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
