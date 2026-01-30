import OpenAI from 'openai'

// Initialize OpenAI client
// Note: In production, use environment variables and a backend API
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file')
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // Note: In production, call from backend
  })
}

/**
 * Enhance action plan with AI personalization
 */
export const enhanceActionPlan = async (formData, actionPlan) => {
  try {
    const client = getOpenAIClient()
    
    const prompt = `You are a health coach helping someone personalize their health action plan. Based on their context, make the generic actions more specific, actionable, and tailored to their situation.

USER CONTEXT:
Vision: ${formData.visionStatement || 'Not specified'}
How they want to feel: ${formData.feelingState || 'Not specified'}
Why it matters: ${formData.whyMatters || 'Not specified'}
Current health score: ${formData.currentScore || 5}/10
Time capacity: ${formData.timeCapacity || '10 minutes/day'}
Readiness: ${formData.readiness || 5}/10
Barriers: ${(formData.barriers || []).join(', ') || 'None'}
Barrier notes: ${formData.barriersNotes || 'None'}
Preferred times: ${formData.preferredTimes || 'Not specified'}
Sustainable approach: ${formData.sustainableNotes || 'Not specified'}

CURRENT GENERIC PLAN:
${actionPlan.weeklyActions.map(item => `${item.area}:\n${item.actions.map(a => `- ${a}`).join('\n')}`).join('\n\n')}

TASK:
Provide 4-6 highly specific, personalized action steps for THIS WEEK that:
1. Fit their exact time capacity and schedule
2. Address their specific barriers
3. Align with their vision and why it matters
4. Feel achievable given their readiness level
5. Are concrete and actionable (not vague advice)

IMPORTANT FORMATTING RULES:
- Do NOT include specific days of the week (like "Monday, Wednesday, Friday" or "on Sundays")
- Do NOT include time-specific references (like "tomorrow", "this evening", "tonight", "in the morning", "before bed")
- Do NOT include frequency in the action itself (like "three times this week" or "daily")
- Users will select their own days and times separately during the scheduling step
- Keep actions timeless and focused on WHAT to do, not WHEN to do it
- Example: Instead of "Take a 10-minute walk tomorrow morning", write "Take a 10-minute walk"
- Example: Instead of "Meditate for 5 minutes before bed", write "Meditate for 5 minutes"

Format as a JSON array of objects with this structure:
[
  {
    "action": "Specific action step",
    "why": "Brief reason why this works for them",
    "tip": "One practical tip to make it easier"
  }
]

Keep actions brief, specific, and encouraging. Focus on small wins that build momentum.`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an empathetic health coach who specializes in creating personalized, achievable action plans. You focus on small wins and meeting people where they are.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    const parsed = JSON.parse(content)
    
    // Handle different possible response formats
    return parsed.actions || parsed.plan || parsed
  } catch (error) {
    console.error('AI Enhancement Error:', error)
    throw error
  }
}

/**
 * Get personalized barrier strategies with AI
 */
export const enhanceBarrierStrategy = async (barrier, userContext) => {
  try {
    const client = getOpenAIClient()
    
    const prompt = `You are a health coach helping someone overcome a specific barrier.

BARRIER: ${barrier}
USER CONTEXT: ${userContext}

Provide 3-4 highly specific, actionable strategies to overcome this barrier given their exact situation. Be practical and empathetic.

Format as a JSON object:
{
  "mainStrategy": "One sentence main approach",
  "tactics": ["Specific tactic 1", "Specific tactic 2", "Specific tactic 3"]
}`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a practical health coach who gives specific, actionable advice tailored to individual circumstances.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    return JSON.parse(response.choices[0].message.content)
  } catch (error) {
    console.error('AI Barrier Strategy Error:', error)
    throw error
  }
}

/**
 * Generate a personalized motivational message
 */
export const generateMotivationalMessage = async (formData) => {
  try {
    const client = getOpenAIClient()

    const prompt = `Create a brief, personalized motivational message for someone starting their health journey.

Their vision: ${formData.visionStatement || 'Not specified'}
Why it matters: ${formData.whyMatters || 'Not specified'}
Current score: ${formData.currentScore || 5}/10
Readiness: ${formData.readiness || 5}/10

Write 2-3 sentences that are:
- Encouraging and warm
- Specific to their situation
- Focused on their "why"
- Realistic about where they are

Just return the message text, no JSON.`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an empathetic health coach who writes brief, personalized encouragement.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 150
    })

    return response.choices[0].message.content.trim()
  } catch (error) {
    console.error('AI Motivational Message Error:', error)
    throw error
  }
}

/**
 * Summarize a habit into a short verb + noun phrase (2-3 words)
 */
export const summarizeHabitAction = async (habitText) => {
  try {
    const client = getOpenAIClient()

    const prompt = `Summarize this habit into a short, actionable phrase of 2-3 words maximum. Start with a verb, followed by a noun.

Habit: "${habitText}"

Examples:
- "Write a short personal story or anecdote from your life" → "Write stories"
- "Limit coffee to one cup each day to reduce anxiety" → "Limit coffee"
- "Take a 10-minute walk around the neighborhood" → "Walk daily"
- "Meditate for 5 minutes using a guided app" → "Meditate daily"

Return ONLY the short phrase in title case, no quotes or punctuation at the end.`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You create concise, actionable summaries. Return only the requested format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 10
    })

    const result = response.choices[0].message.content.trim()
    return result
  } catch (error) {
    console.error('AI Habit Summary Error:', error)
    // Return first 2-3 words as fallback
    const words = habitText.split(' ')
    return words.slice(0, 2).join(' ')
  }
}

/**
 * Consolidate and clean up vision text for clarity and conciseness
 * Removes redundancy and combines similar ideas into flowing prose
 */
export const consolidateVisionText = async (visionText) => {
  try {
    const client = getOpenAIClient()

    const prompt = `Rewrite this vision statement to be clear, concise, and free of redundancy. Combine similar ideas and remove repetition while preserving the person's authentic voice and goals.

Original: "${visionText}"

Rules:
- Remove duplicate or overlapping ideas (e.g., "feel energized" and "have energy" should become one idea)
- Write in first person ("I...")
- Keep it to 2-4 sentences maximum
- Preserve the emotional tone and personal meaning
- Make it flow naturally as a cohesive vision statement

Return ONLY the rewritten vision text, no quotes or explanation.`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an editor who consolidates text for clarity while preserving authentic voice. Return only the requested format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 150
    })

    return response.choices[0].message.content.trim()
  } catch (error) {
    console.error('AI Vision Consolidation Error:', error)
    // Return original text if API fails
    return visionText
  }
}

/**
 * Extract 3 key adjectives from a vision statement
 */
export const extractVisionAdjectives = async (visionText) => {
  try {
    const client = getOpenAIClient()

    const prompt = `Extract exactly 3 key adjectives from this vision statement that capture the person's desired state or feelings. Choose the most powerful and distinctive words.

Vision: "${visionText}"

Return ONLY the 3 adjectives separated by commas, in title case (first letter capitalized, rest lowercase). For example: "Calmer, Confident, Authentic"

Do not include any other text or explanation.`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You extract key adjectives from text with precision. Return only the requested format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 20
    })

    const result = response.choices[0].message.content.trim()

    // Ensure title case (capitalize first letter of each word, rest lowercase)
    const titleCased = result
      .split(',')
      .map(word => {
        const trimmed = word.trim()
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
      })
      .join(', ')

    return titleCased
  } catch (error) {
    console.error('AI Vision Adjectives Error:', error)
    // Return fallback if API fails
    return 'Your Health Vision'
  }
}
