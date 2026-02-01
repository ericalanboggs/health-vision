/**
 * Shared Resend utilities with rate limiting support
 * - Batch sending (up to 100 emails per request)
 * - Exponential backoff for 429 rate limit errors
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Summit <hello@summithealth.app>'

export interface EmailPayload {
  to: string
  subject: string
  html: string
  from?: string
}

export interface SendResult {
  success: boolean
  id?: string
  error?: string
}

export interface BatchSendResult {
  success: boolean
  data?: Array<{ id: string }>
  error?: string
}

/**
 * Send a single email with exponential backoff retry on rate limit
 */
export async function sendEmail(
  payload: EmailPayload,
  maxRetries = 3
): Promise<SendResult> {
  const { to, subject, html, from = RESEND_FROM_EMAIL } = payload

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({ from, to, subject, html }),
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, id: data.id }
      }

      // Rate limited - apply exponential backoff
      if (response.status === 429) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await sleep(delay)
          continue
        }
        return { success: false, error: 'Rate limit exceeded after retries' }
      }

      return { success: false, error: data.message || `API error: ${response.status}` }
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(delay)
        continue
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  return { success: false, error: 'Max retries exceeded' }
}

/**
 * Send multiple emails using Resend's Batch API (up to 100 per request)
 * This reduces API calls from N to ceil(N/100)
 */
export async function sendEmailBatch(
  emails: EmailPayload[],
  maxRetries = 3
): Promise<BatchSendResult> {
  if (emails.length === 0) {
    return { success: true, data: [] }
  }

  if (emails.length > 100) {
    return { success: false, error: 'Batch size cannot exceed 100 emails' }
  }

  const payload = emails.map(email => ({
    from: email.from || RESEND_FROM_EMAIL,
    to: email.to,
    subject: email.subject,
    html: email.html,
  }))

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, data: data.data || data }
      }

      // Rate limited - apply exponential backoff
      if (response.status === 429) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000
          console.log(`Batch rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await sleep(delay)
          continue
        }
        return { success: false, error: 'Rate limit exceeded after retries' }
      }

      return { success: false, error: data.message || `API error: ${response.status}` }
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        console.log(`Batch request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(delay)
        continue
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  return { success: false, error: 'Max retries exceeded' }
}

/**
 * Send emails in batches of up to 100, handling large lists
 * Returns results for each email in order
 */
export async function sendEmailsInBatches(
  emails: EmailPayload[],
  batchSize = 100,
  delayBetweenBatches = 1000
): Promise<Array<{ email: string; success: boolean; id?: string; error?: string }>> {
  const results: Array<{ email: string; success: boolean; id?: string; error?: string }> = []

  // Process in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(emails.length / batchSize)

    console.log(`Sending batch ${batchNumber}/${totalBatches} (${batch.length} emails)`)

    const batchResult = await sendEmailBatch(batch)

    if (batchResult.success && batchResult.data) {
      // Match results to emails by index
      batch.forEach((email, index) => {
        const resultId = batchResult.data?.[index]?.id
        results.push({
          email: email.to,
          success: true,
          id: resultId,
        })
      })
    } else {
      // Batch failed - mark all as failed
      batch.forEach(email => {
        results.push({
          email: email.to,
          success: false,
          error: batchResult.error || 'Batch send failed',
        })
      })
    }

    // Delay between batches to respect rate limits
    if (i + batchSize < emails.length) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`)
      await sleep(delayBetweenBatches)
    }
  }

  return results
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
