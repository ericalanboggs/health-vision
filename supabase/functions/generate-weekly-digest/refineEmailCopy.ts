/**
 * Refine email copy to sound natural and conversational
 * This post-processing step polishes the generated markdown
 */
export async function refineEmailCopy(
  emailMarkdown: string,
  openaiApiKey: string
): Promise<string> {
  console.log('Refining email copy for natural voice...')

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
          content: `You are a copy editor refining a weekly coaching email. Your job is to:

1. Make language sound natural and conversational, like it's coming from a real person
2. Remove awkward phrasing, redundancy, and overly formal language
3. Keep it warm but not cheesy
4. Maintain all markdown formatting, links, and structure
5. Don't change core content or meaning - just polish the delivery

The voice should be:
- Direct and clear
- Supportive without being patronizing
- Conversational but professional
- Like a thoughtful coach who knows you

Return ONLY the refined markdown. Do not add explanations or comments.`
        },
        {
          role: 'user',
          content: `Please refine this email to sound more natural and conversational:\n\n${emailMarkdown}`
        }
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenAI refinement error:', error)
    // Return original if refinement fails
    return emailMarkdown
  }

  const data = await response.json()
  const refinedCopy = data.choices[0].message.content.trim()

  console.log('Email copy refined successfully')
  return refinedCopy
}
