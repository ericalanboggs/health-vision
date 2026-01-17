import { UserContext, PersonalInsight } from './types.ts'

/**
 * Generate personalized insight by analyzing patterns across reflections
 * and connecting to the user's vision.
 *
 * This creates the "What I Noticed" section that makes the digest feel
 * like a real coach is paying attention.
 */
export async function generateInsight(
  context: UserContext,
  openaiApiKey: string
): Promise<PersonalInsight> {
  console.log('Generating personal insight...')
  console.log(`Reflections available: ${context.all_reflections.length}`)

  // Build reflection summary for the prompt
  const reflectionSummary = context.all_reflections.map(r => {
    return `Week ${r.week_number}:
- What went well: ${r.went_well}
- Friction/challenges: ${r.friction}
- Adjustments planned: ${r.adjustment}`
  }).join('\n\n')

  // Determine milestone based on week number
  const milestoneText = getMilestone(context.week_number, context.all_reflections.length)

  const prompt = `You are a supportive health coach reviewing a user's journey. Analyze their reflections and vision to generate a personal insight.

USER'S VISION:
${context.vision?.visionStatement || 'Not provided'}

WHY IT MATTERS TO THEM:
${context.vision?.whyMatters || 'Not provided'}

HOW THEY WANT TO FEEL:
${context.vision?.feelingState || 'Not provided'}

THEIR REFLECTIONS SO FAR:
${reflectionSummary || 'No reflections yet'}

THEIR CURRENT HABITS:
${context.habits.map(h => `- ${h.habit_name}`).filter((v, i, a) => a.indexOf(v) === i).join('\n') || 'No habits set'}

Generate a personal insight that:
1. Spots a pattern or theme across their reflections (if multiple exist)
2. Connects what they're experiencing to their stated vision/why
3. Feels warm and observational, not prescriptive
4. Is 2-3 sentences max

If there's only one reflection or none, focus on connecting their habits to their vision.

Also generate a "connection to vision" statement that explicitly ties their recent experience to their goals (1 sentence).

Return as JSON:
{
  "observation": "Your main insight here - what you noticed across their journey",
  "connection_to_vision": "How their recent experience connects to their stated vision/why"
}

Keep the tone warm, curious, and encouraging. Use "you" language. Avoid being preachy.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a warm, observant health coach who notices patterns and makes meaningful connections. You speak directly to the user in a supportive way.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI insight generation error:', error)
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    let content = data.choices[0].message.content.trim()

    // Strip markdown code fences if present
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    const insight = JSON.parse(content)

    console.log('Generated insight:', insight)

    return {
      observation: insight.observation,
      connection_to_vision: insight.connection_to_vision || null,
      milestone: milestoneText,
    }

  } catch (error) {
    console.error('Error generating insight:', error)
    // Return a fallback insight
    return {
      observation: context.all_reflections.length > 0
        ? "Looking at your reflections, you're building self-awareness about what works for you. That's the foundation of lasting change."
        : "You're at the beginning of your journey. Each week you'll learn more about what works for you.",
      connection_to_vision: context.vision?.visionStatement
        ? `Every small step is moving you toward: ${context.vision.visionStatement.toLowerCase()}`
        : null,
      milestone: milestoneText,
    }
  }
}

/**
 * Generate milestone text based on week number and reflection count
 */
function getMilestone(weekNumber: number, reflectionCount: number): string | null {
  if (weekNumber === 2 && reflectionCount >= 1) {
    return "You've completed your first week and reflected on it. That's real commitment."
  }
  if (weekNumber === 3 && reflectionCount >= 2) {
    return "Two weeks in. You're building a practice of showing up for yourself."
  }
  if (weekNumber === 4 && reflectionCount >= 3) {
    return "Three weeks of reflection. You now have real data about what works for you."
  }
  if (reflectionCount === 1) {
    return "Your first reflection is complete. You're learning what works for you."
  }
  return null
}

/**
 * Generate a reflection prompt for the week ahead
 */
export function getReflectionPrompt(context: UserContext): string {
  const prompts = [
    "What's one small thing you could let go of this week to make more room for your habits?",
    "What time of day tends to work best for you? How might you lean into that?",
    "What's one thing that made your habits easier last week that you could repeat?",
    "If this week gets busy, what's the one habit you'd protect above all others?",
    "What would it feel like to finish this week knowing you showed up for yourself?",
  ]

  // Pick based on week number for variety
  const index = (context.week_number - 1) % prompts.length
  return prompts[index]
}
