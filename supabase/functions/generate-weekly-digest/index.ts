import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { loadUserContext } from './loadUserContext.ts'
import { normalizeReflection } from './normalizeReflection.ts'
import { generateWeeklyFocus } from './generateWeeklyFocus.ts'
import { generateInsight, getReflectionPrompt } from './generateInsight.ts'
import { ContentRecommendationEngine } from './contentRecommendationEngine.ts'
import { assembleMarkdown, generateSubject } from './assembleMarkdown.ts'
import { refineEmailCopy } from './refineEmailCopy.ts'
import { DigestOutput } from './types.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
const SPOTIFY_ACCESS_TOKEN = Deno.env.get('SPOTIFY_ACCESS_TOKEN')

/**
 * Generate Weekly Digest - Milestone 1 (Coach Review Mode)
 * 
 * This edge function generates personalized weekly habit reinforcement emails.
 * NO EMAILS ARE SENT - output is stored for manual review.
 * 
 * Usage:
 *   POST /generate-weekly-digest
 *   Body: { "user_id": "uuid", "week_number": 1 }
 */
serve(async (req) => {
  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse request
    const { user_id, week_number } = await req.json()
    
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Default to current week if not specified
    const targetWeek = week_number || getCurrentWeekNumber()

    console.log(`\n=== Generating Weekly Digest ===`)
    console.log(`User: ${user_id}`)
    console.log(`Week: ${targetWeek}`)
    console.log(`Timestamp: ${new Date().toISOString()}\n`)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Step 1: Load user context
    console.log('Step 1: Loading user context...')
    const context = await loadUserContext(supabase, user_id, targetWeek)

    // Step 2: Normalize reflection signals
    console.log('Step 2: Normalizing reflection signals...')
    context.reflection_signals = normalizeReflection(context.reflection)

    // Step 3: Generate weekly focus with OpenAI
    console.log('Step 3: Generating weekly focus...')
    const focus = await generateWeeklyFocus(context, OPENAI_API_KEY!)

    // Step 3.5: Load past recommendations to avoid duplicates
    console.log('Step 3.5: Loading past recommendations to avoid duplicates...')
    const { data: pastDigests } = await supabase
      .from('weekly_digests')
      .select('recommendations')
      .eq('user_id', user_id)
      .lt('week_number', targetWeek)
      .not('recommendations', 'is', null)

    const pastVideoIds: string[] = []
    if (pastDigests) {
      for (const digest of pastDigests) {
        if (digest.recommendations && Array.isArray(digest.recommendations)) {
          for (const rec of digest.recommendations) {
            if (rec.url && rec.url.includes('youtube.com')) {
              const match = rec.url.match(/[?&]v=([^&]+)/)
              if (match) {
                pastVideoIds.push(match[1])
              }
            }
          }
        }
      }
    }
    console.log(`Found ${pastVideoIds.length} previously sent video IDs to exclude`)

    // Step 4: Generate personalized content recommendations
    console.log('Step 4: Generating personalized content recommendations...')
    const contentEngine = new ContentRecommendationEngine(YOUTUBE_API_KEY!, OPENAI_API_KEY!)
    contentEngine.setExcludedVideoIds(pastVideoIds)
    const recommendations = await contentEngine.generateRecommendations(context)

    // Step 5: Generate personal insight ("What I Noticed")
    console.log('Step 5: Generating personal insight...')
    const insight = await generateInsight(context, OPENAI_API_KEY!)
    const reflectionPrompt = getReflectionPrompt(context)

    // Step 6: Assemble email markdown
    console.log('Step 6: Assembling email...')
    const draftMarkdown = assembleMarkdown(context, focus, recommendations, insight, reflectionPrompt)

    // Step 7: Refine email copy for natural voice
    console.log('Step 7: Refining email copy...')
    const emailMarkdown = await refineEmailCopy(draftMarkdown, OPENAI_API_KEY!)
    const subject = generateSubject(context, focus)

    // Step 8: Create digest output
    const output: DigestOutput = {
      user_id: context.user_id,
      week_number: targetWeek,
      subject,
      weekly_focus: focus,
      recommendations,
      email_markdown: emailMarkdown,
      metadata: {
        generated_at: new Date().toISOString(),
        reflection_available: !!context.reflection,
        habits_count: context.habits.length,
        content_sources_used: ['personalized_engine'], // Real content now!
      },
    }

    // Step 9: Save to database for review
    console.log('Step 9: Saving digest to database...')
    const { data: savedDigest, error: saveError } = await supabase
      .from('weekly_digests')
      .upsert({
        user_id: context.user_id,
        week_number: targetWeek,
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
      .select()
      .single()

    if (saveError) {
      console.error('Error saving digest:', saveError)
      throw saveError
    }

    // Step 9b: Also insert recommendations into user_resources for persistent library
    if (recommendations && recommendations.length > 0) {
      const resourceRows = recommendations.map((rec: any) => ({
        user_id: context.user_id,
        title: rec.title,
        url: rec.url,
        description: rec.brief_description || null,
        source: rec.source || null,
        resource_type: rec.type || 'link',
        topic: null,
        duration_minutes: rec.duration_minutes || null,
        thumbnail_url: rec.thumbnail_url || null,
        origin: 'digest',
        week_number: targetWeek,
      }))

      const { error: resourceError } = await supabase
        .from('user_resources')
        .insert(resourceRows)

      if (resourceError) {
        // Non-fatal: log but don't throw
        console.warn('Warning: Failed to insert recommendations into user_resources:', resourceError)
      } else {
        console.log(`Inserted ${resourceRows.length} recommendations into user_resources`)
      }
    }

    console.log(`\n✅ Digest generated successfully!`)
    console.log(`Digest ID: ${savedDigest.id}`)
    console.log(`Status: ${savedDigest.status}`)
    console.log(`Content sources: ${output.metadata.content_sources_used.join(', ')}`)
    console.log(`\n=== Preview ===`)
    console.log(emailMarkdown)
    console.log(`\n=== End Preview ===\n`)

    // Return complete output for review
    return new Response(
      JSON.stringify({
        success: true,
        digest_id: savedDigest.id,
        output,
        message: 'Digest generated and saved for review. Personalized content recommendations used.',
      }, null, 2),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error generating digest:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Get current week number based on program start date
 */
function getCurrentWeekNumber(): number {
  const programStartDate = new Date(Deno.env.get('PROGRAM_START_DATE') || '2026-01-12')
  const now = new Date()
  const diffTime = now.getTime() - programStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1
  return Math.max(1, weekNumber)
}
