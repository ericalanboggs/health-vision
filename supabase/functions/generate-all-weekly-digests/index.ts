import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Import modules from generate-weekly-digest
import { loadUserContext } from '../generate-weekly-digest/loadUserContext.ts'
import { normalizeReflection } from '../generate-weekly-digest/normalizeReflection.ts'
import { generateWeeklyFocus } from '../generate-weekly-digest/generateWeeklyFocus.ts'
import { generateInsight, getReflectionPrompt } from '../generate-weekly-digest/generateInsight.ts'
import { ContentRecommendationEngine } from '../generate-weekly-digest/contentRecommendationEngine.ts'
import { assembleMarkdown, generateSubject } from '../generate-weekly-digest/assembleMarkdown.ts'
import { refineEmailCopy } from '../generate-weekly-digest/refineEmailCopy.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
const PILOT_START_DATE = Deno.env.get('PILOT_START_DATE') || '2026-01-12'

interface Profile {
  id: string
  first_name: string
  email: string
}

function getCurrentWeekNumber(): number {
  const pilotStartDate = new Date(PILOT_START_DATE)
  const now = new Date()
  const diffTime = now.getTime() - pilotStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1
  return Math.max(1, weekNumber)
}

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

    console.log(`\n=== Generate All Weekly Digests ===`)
    console.log(`Week: ${weekNumber}`)
    console.log(`Dry run: ${dryRun}`)
    console.log(`Timestamp: ${new Date().toISOString()}\n`)

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get all users with completed profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, email')
      .eq('profile_completed', true)
      .not('email', 'is', null)

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

    const results: Array<{ userId: string; email: string; status: string; error?: string }> = []

    for (const user of usersToProcess as Profile[]) {
      console.log(`\n--- Generating for ${user.first_name} (${user.id}) ---`)

      try {
        // Load user context
        const context = await loadUserContext(supabase, user.id, weekNumber)

        // Normalize reflection signals
        context.reflection_signals = normalizeReflection(context.reflection)

        // Generate weekly focus
        const focus = await generateWeeklyFocus(context, OPENAI_API_KEY!)

        // Load past recommendations to avoid duplicates
        const { data: pastDigests } = await supabase
          .from('weekly_digests')
          .select('recommendations')
          .eq('user_id', user.id)
          .lt('week_number', weekNumber)

        const pastVideoIds: string[] = []
        if (pastDigests) {
          for (const digest of pastDigests) {
            if (digest.recommendations && Array.isArray(digest.recommendations)) {
              for (const rec of digest.recommendations) {
                if (rec.url?.includes('youtube.com')) {
                  const match = rec.url.match(/[?&]v=([^&]+)/)
                  if (match) pastVideoIds.push(match[1])
                }
              }
            }
          }
        }

        // Generate content recommendations
        const contentEngine = new ContentRecommendationEngine(YOUTUBE_API_KEY!)
        contentEngine.setExcludedVideoIds(pastVideoIds)
        const recommendations = await contentEngine.generateRecommendations(context)

        // Generate insight
        const insight = await generateInsight(context, OPENAI_API_KEY!)
        const reflectionPrompt = getReflectionPrompt(context)

        // Assemble email
        const draftMarkdown = assembleMarkdown(context, focus, recommendations, insight, reflectionPrompt)
        const emailMarkdown = await refineEmailCopy(draftMarkdown, OPENAI_API_KEY!)
        const subject = generateSubject(context, focus)

        // Save to database
        const { error: saveError } = await supabase
          .from('weekly_digests')
          .upsert({
            user_id: user.id,
            week_number: weekNumber,
            subject,
            weekly_focus: focus,
            strategies: focus.strategies,
            recommendations,
            email_markdown: emailMarkdown,
            status: 'draft',
            generated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,week_number'
          })

        if (saveError) throw saveError

        console.log(`✓ Generated digest for ${user.email}`)
        results.push({ userId: user.id, email: user.email, status: 'generated' })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`✗ Failed for ${user.email}:`, errorMessage)
        results.push({ userId: user.id, email: user.email, status: 'failed', error: errorMessage })
      }

      // Delay to avoid rate limits on OpenAI/YouTube
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    const generated = results.filter(r => r.status === 'generated').length
    const failed = results.filter(r => r.status === 'failed').length

    console.log(`\n=== Complete ===`)
    console.log(`Generated: ${generated}, Failed: ${failed}`)

    return new Response(
      JSON.stringify({
        message: 'Batch digest generation complete',
        week_number: weekNumber,
        generated,
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
