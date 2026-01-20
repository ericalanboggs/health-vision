import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

// Keyword patterns for fallback suggestions
const KEYWORD_PATTERNS: Record<string, { type: string; unit: string | null; target: number | null }> = {
  water: { type: 'metric', unit: 'oz', target: 64 },
  drink: { type: 'metric', unit: 'oz', target: 8 },
  hydrate: { type: 'metric', unit: 'oz', target: 64 },
  run: { type: 'metric', unit: 'miles', target: 3 },
  walk: { type: 'metric', unit: 'steps', target: 10000 },
  workout: { type: 'metric', unit: 'minutes', target: 30 },
  exercise: { type: 'metric', unit: 'minutes', target: 30 },
  gym: { type: 'metric', unit: 'minutes', target: 45 },
  read: { type: 'metric', unit: 'pages', target: 20 },
  reading: { type: 'metric', unit: 'pages', target: 20 },
  meditate: { type: 'metric', unit: 'minutes', target: 10 },
  meditation: { type: 'metric', unit: 'minutes', target: 10 },
  sleep: { type: 'metric', unit: 'hours', target: 8 },
  pushup: { type: 'metric', unit: 'reps', target: 20 },
  'push-up': { type: 'metric', unit: 'reps', target: 20 },
  situp: { type: 'metric', unit: 'reps', target: 20 },
  squat: { type: 'metric', unit: 'reps', target: 20 },
  plank: { type: 'metric', unit: 'minutes', target: 2 },
  yoga: { type: 'metric', unit: 'minutes', target: 20 },
  stretch: { type: 'metric', unit: 'minutes', target: 10 },
  weight: { type: 'metric', unit: 'lbs', target: null },
  weigh: { type: 'metric', unit: 'lbs', target: null },
  calories: { type: 'metric', unit: 'calories', target: 2000 },
  protein: { type: 'metric', unit: 'servings', target: 3 },
  vegetables: { type: 'metric', unit: 'servings', target: 5 },
  fruit: { type: 'metric', unit: 'servings', target: 3 },
  cycling: { type: 'metric', unit: 'miles', target: 10 },
  bike: { type: 'metric', unit: 'miles', target: 10 },
  swim: { type: 'metric', unit: 'minutes', target: 30 },
  journal: { type: 'boolean', unit: null, target: null },
  gratitude: { type: 'boolean', unit: null, target: null },
  floss: { type: 'boolean', unit: null, target: null },
  vitamins: { type: 'boolean', unit: null, target: null },
  supplements: { type: 'boolean', unit: null, target: null }
}

const VALID_UNITS = [
  'oz', 'cups', 'liters', 'lbs', 'kg', 'miles', 'km', 'steps',
  'minutes', 'hours', 'reps', 'sets', 'servings', 'calories', 'pages'
]

function getSuggestionFromKeywords(habitName: string): {
  tracking_type: string
  unit: string | null
  suggested_target: number | null
  reasoning: string
} {
  const lowerName = habitName.toLowerCase()

  for (const [keyword, config] of Object.entries(KEYWORD_PATTERNS)) {
    if (lowerName.includes(keyword)) {
      return {
        tracking_type: config.type,
        unit: config.unit,
        suggested_target: config.target,
        reasoning: `Based on "${keyword}" in your habit name`
      }
    }
  }

  // Default to boolean if no match
  return {
    tracking_type: 'boolean',
    unit: null,
    suggested_target: null,
    reasoning: 'Default to simple yes/no tracking'
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { habitName } = await req.json()

    if (!habitName || typeof habitName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'habitName is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    // If OpenAI is not configured, use keyword fallback
    if (!OPENAI_API_KEY) {
      console.log('OpenAI not configured, using keyword fallback')
      const suggestion = getSuggestionFromKeywords(habitName)
      return new Response(
        JSON.stringify(suggestion),
        {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    // Try OpenAI suggestion
    try {
      const prompt = `You are a health coaching assistant. Given a habit name, suggest the best way to track it.

Habit: "${habitName}"

Available units: ${VALID_UNITS.join(', ')}

Respond with a JSON object (no markdown):
{
  "tracking_type": "boolean" or "metric",
  "unit": "one of the available units" or null for boolean,
  "suggested_target": number or null,
  "reasoning": "brief explanation"
}

Rules:
- Use "boolean" for habits that are simply done or not done (journaling, taking vitamins, etc.)
- Use "metric" for habits that have measurable amounts (water intake, exercise duration, etc.)
- Only use units from the available list
- Be conservative with targets - suggest achievable daily goals
- Keep reasoning under 50 characters`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a health coaching assistant that suggests how to track habits. Always respond with valid JSON only, no markdown.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.3,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content?.trim()

      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Parse JSON response
      const suggestion = JSON.parse(content)

      // Validate the response
      if (!['boolean', 'metric'].includes(suggestion.tracking_type)) {
        throw new Error('Invalid tracking_type')
      }

      if (suggestion.tracking_type === 'metric' && suggestion.unit && !VALID_UNITS.includes(suggestion.unit)) {
        throw new Error('Invalid unit')
      }

      console.log(`AI suggestion for "${habitName}":`, suggestion)

      return new Response(
        JSON.stringify(suggestion),
        {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      )

    } catch (aiError) {
      console.error('OpenAI error, falling back to keywords:', aiError)
      const suggestion = getSuggestionFromKeywords(habitName)
      return new Response(
        JSON.stringify(suggestion),
        {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

  } catch (error) {
    console.error('Error in habit-ai-suggest:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    )
  }
})
