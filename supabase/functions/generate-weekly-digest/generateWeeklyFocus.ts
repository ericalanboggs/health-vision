import { UserContext, WeeklyFocus } from './types.ts'

/**
 * Generate weekly focus using OpenAI
 */
export async function generateWeeklyFocus(
  context: UserContext,
  openaiApiKey: string
): Promise<WeeklyFocus> {
  console.log('Generating weekly focus with OpenAI...')

  // Create prompt for weekly focus generation
  const prompt = `Based on this user's context, generate a personalized weekly focus theme:

User Context:
- Name: ${context.user_name}
- Habits: ${context.habits.map(h => `- ${h.habit_name} (${h.day_of_week})`).join('\n')}
- Vision: ${context.vision?.visionStatement || 'Not provided'}
- Previous Reflection: ${context.reflection ? JSON.stringify(context.reflection) : 'No reflection'}

Generate a concise weekly focus theme (3-6 words) that:
1. Reinforces what's working in their habits
2. Addresses potential challenges they might face
3. Connects to their broader vision
4. Is motivational but realistic

Also provide:
- 2-3 patterns to reinforce
- 2-3 potential challenges they might face
- 3-4 specific strategies to overcome challenges

Return as JSON:
{
  "theme": "Focus theme here",
  "patterns_to_reinforce": ["pattern1", "pattern2"],
  "top_blockers": ["blocker1", "blocker2"],
  "strategies": [
    {"blocker": "blocker1", "strategy": "strategy1"},
    {"blocker": "blocker2", "strategy": "strategy2"}
  ]
}

Keep it practical and actionable.`

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
            content: 'You are a habit formation coach. Generate practical, personalized weekly focus themes.'
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
      console.error('OpenAI focus generation error:', error)
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    const focus = JSON.parse(data.choices[0].message.content.trim())

    console.log('Generated weekly focus:', focus)
    return focus

  } catch (error) {
    console.error('Error generating weekly focus:', error)
    throw error
  }
}
