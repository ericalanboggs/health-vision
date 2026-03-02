import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmailsInBatches, type EmailPayload } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const PROGRAM_START_DATE = Deno.env.get('PROGRAM_START_DATE') || '2026-01-12'

// Accessible green color (4.5:1 contrast ratio on white)
const BRAND_GREEN = '#15803d'

interface Profile {
  id: string
  first_name: string
  email: string
}

interface WeeklyDigest {
  id: string
  user_id: string
  week_number: number
  subject: string
  email_markdown: string
  status: string
}

/**
 * Get current week number based on program start date
 */
function getCurrentWeekNumber(): number {
  const programStartDate = new Date(PROGRAM_START_DATE)
  const now = new Date()
  const diffTime = now.getTime() - programStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1
  return Math.max(1, weekNumber)
}

/**
 * Get the start of the current week (Monday 00:00:00 UTC)
 */
function getWeekStart(): Date {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

/**
 * Convert markdown to styled HTML email
 */
function markdownToHtml(markdown: string): string {
  let html = markdown

  // Convert markdown tables to HTML tables FIRST
  html = convertTablesToHtml(html)

  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3 style="margin: 24px 0 12px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="margin: 28px 0 16px 0; font-size: 20px; font-weight: 700; color: #1a1a1a;">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">$1</h1>')

  // Convert blockquotes
  html = html.replace(/^> (.+)$/gm, `<blockquote style="margin: 16px 0; padding: 16px 20px; background-color: #f0fdf4; border-left: 4px solid ${BRAND_GREEN}; border-radius: 0 8px 8px 0; font-style: italic; color: #166534;">$1</blockquote>`)

  // Convert links (with underline for accessibility)
  html = html.replace(/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g, `<a href="$2" style="color: ${BRAND_GREEN}; text-decoration: underline; font-weight: 600;">$1</a>`)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color: ${BRAND_GREEN}; text-decoration: underline;">$1</a>`)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 600; color: #1a1a1a;">$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">')

  // Convert lists
  const lines = html.split('\n')
  let inList = false
  const processedLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isListItem = line.match(/^- (.+)$/)

    if (isListItem) {
      if (!inList) {
        processedLines.push('<ul style="margin: 16px 0; padding-left: 0; list-style: none;">')
        inList = true
      }
      processedLines.push(`<li style="margin: 8px 0; padding-left: 24px; position: relative; color: #4a4a4a; line-height: 1.6;"><span style="position: absolute; left: 0; color: ${BRAND_GREEN};">•</span>${isListItem[1]}</li>`)
    } else {
      if (inList) {
        processedLines.push('</ul>')
        inList = false
      }
      const numberedItem = line.match(/^(\d+)\. (.+)$/)
      if (numberedItem) {
        processedLines.push(`<p style="margin: 8px 0; padding-left: 24px; color: #4a4a4a; line-height: 1.6;"><span style="color: ${BRAND_GREEN}; font-weight: 600;">${numberedItem[1]}.</span> ${numberedItem[2]}</p>`)
      } else if (line.trim() === '') {
        processedLines.push('')
      } else if (!line.startsWith('<')) {
        processedLines.push(`<p style="margin: 16px 0; color: #4a4a4a; line-height: 1.6;">${line}</p>`)
      } else {
        processedLines.push(line)
      }
    }
  }

  if (inList) {
    processedLines.push('</ul>')
  }

  html = processedLines.join('\n')
  html = html.replace(/<p style="[^"]*"><\/p>/g, '')
  html = html.replace(/<p style="[^"]*">\s*<\/p>/g, '')

  return html
}

function convertTablesToHtml(markdown: string): string {
  const lines = markdown.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[-\s|]+\|$/)) {
      const headerCells = line.split('|').filter(cell => cell.trim()).map(cell => cell.trim())
      i += 2
      const dataRows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').filter(cell => cell.trim()).map(cell => cell.trim())
        dataRows.push(cells)
        i++
      }
      result.push(buildHtmlTable(headerCells, dataRows))
    } else {
      result.push(line)
      i++
    }
  }

  return result.join('\n')
}

function buildHtmlTable(headers: string[], rows: string[][]): string {
  const tableStyle = 'width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;'
  const thStyle = `background-color: #f9fafb; padding: 12px 16px; text-align: left; font-weight: 600; color: #1a1a1a; border: 1px solid #e5e7eb;`
  const tdStyle = `padding: 12px 16px; color: #4a4a4a; border: 1px solid #e5e7eb; line-height: 1.5;`

  let html = `<table style="${tableStyle}"><thead><tr>`
  for (const header of headers) {
    html += `<th style="${thStyle}">${header}</th>`
  }
  html += '</tr></thead><tbody>'
  for (const row of rows) {
    html += '<tr>'
    for (const cell of row) {
      html += `<td style="${tdStyle}">${cell}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}

function buildEmailHtml(content: string): string {
  const logoUrl = 'https://go.summithealth.app/summit-logo.png'
  const appUrl = 'https://go.summithealth.app'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Summit Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <a href="${appUrl}">
                <img src="${logoUrl}" alt="Summit" width="100" style="display: block; max-width: 100px; height: auto;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px;">
              <a href="${appUrl}" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Open Summit App
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #9a9a9a; text-align: center; line-height: 1.5;">
                You're receiving this because you're part of the Summit pilot.<br>
                Questions? Just reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
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

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
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

    console.log(`\n=== Send All Weekly Digests ===`)
    console.log(`Week: ${weekNumber}`)
    console.log(`Dry run: ${dryRun}`)
    console.log(`Timestamp: ${new Date().toISOString()}\n`)

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get all users with completed profiles and email
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, email')
      .eq('profile_completed', true)
      .not('email', 'is', null)

    if (profilesError) throw profilesError

    console.log(`Found ${profiles?.length || 0} eligible users`)

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No eligible users found', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get all digests for this week
    const { data: digests, error: digestsError } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('week_number', weekNumber)

    if (digestsError) throw digestsError

    const digestsByUser = new Map<string, WeeklyDigest>()
    digests?.forEach((d: WeeklyDigest) => digestsByUser.set(d.user_id, d))

    console.log(`Found ${digests?.length || 0} digests for week ${weekNumber}`)

    // Check who already received email this week
    const { data: existingEmails } = await supabase
      .from('email_reminders')
      .select('user_id')
      .eq('email_type', 'weekly_digest')
      .eq('status', 'sent')
      .gte('sent_at', getWeekStart().toISOString())

    const usersAlreadySent = new Set(existingEmails?.map(e => e.user_id) || [])
    console.log(`${usersAlreadySent.size} users already received digest this week`)

    // Filter to users who haven't received email and have a digest
    const usersToProcess = profiles.filter((p: Profile) =>
      !usersAlreadySent.has(p.id) && digestsByUser.has(p.id)
    )

    const usersWithoutDigest = profiles.filter((p: Profile) =>
      !usersAlreadySent.has(p.id) && !digestsByUser.has(p.id)
    )

    console.log(`${usersToProcess.length} users ready to send`)
    console.log(`${usersWithoutDigest.length} users missing digests`)

    if (usersWithoutDigest.length > 0) {
      console.log(`Users missing digests: ${usersWithoutDigest.map((p: Profile) => p.email).join(', ')}`)
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          message: 'Dry run complete',
          would_send_to: usersToProcess.map((p: Profile) => ({ id: p.id, email: p.email, name: p.first_name })),
          missing_digests: usersWithoutDigest.map((p: Profile) => ({ id: p.id, email: p.email, name: p.first_name })),
          count: usersToProcess.length,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (usersToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No users to send to',
          missing_digests: usersWithoutDigest.length,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Prepare email payloads for batch sending
    const emailPayloads: Array<EmailPayload & { userId: string; digestId: string; digestSubject: string }> = []

    for (const user of usersToProcess as Profile[]) {
      const digest = digestsByUser.get(user.id)!
      const htmlContent = markdownToHtml(digest.email_markdown)
      const fullHtml = buildEmailHtml(htmlContent)

      emailPayloads.push({
        to: user.email,
        subject: digest.subject,
        html: fullHtml,
        userId: user.id,
        digestId: digest.id,
        digestSubject: digest.subject,
      })
    }

    console.log(`\nSending ${emailPayloads.length} emails using batch API...`)

    // Send all emails in batches (100 per request, with rate limit handling)
    const batchResults = await sendEmailsInBatches(
      emailPayloads.map(p => ({ to: p.to, subject: p.subject, html: p.html })),
      100, // batch size
      1000 // delay between batches (1 second)
    )

    // Process results and update database
    const results: Array<{ userId: string; email: string; status: string; error?: string }> = []

    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i]
      const payload = emailPayloads[i]

      if (result.success) {
        // Log to email_reminders
        await supabase.from('email_reminders').insert({
          user_id: payload.userId,
          email: payload.to,
          email_type: 'weekly_digest',
          subject: payload.digestSubject,
          status: 'sent',
          resend_id: result.id,
        })

        // Update digest status
        await supabase
          .from('weekly_digests')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', payload.digestId)

        console.log(`✓ Sent to ${payload.to}: ${result.id}`)
        results.push({ userId: payload.userId, email: payload.to, status: 'sent' })
      } else {
        console.error(`✗ Failed to send to ${payload.to}: ${result.error}`)

        await supabase.from('email_reminders').insert({
          user_id: payload.userId,
          email: payload.to,
          email_type: 'weekly_digest',
          subject: payload.digestSubject,
          status: 'failed',
          error_message: result.error,
        })

        results.push({ userId: payload.userId, email: payload.to, status: 'failed', error: result.error })
      }
    }

    const sent = results.filter(r => r.status === 'sent').length
    const failed = results.filter(r => r.status === 'failed').length

    console.log(`\n=== Complete ===`)
    console.log(`Sent: ${sent}, Failed: ${failed}`)

    return new Response(
      JSON.stringify({
        message: 'Batch digest send complete',
        week_number: weekNumber,
        sent,
        failed,
        missing_digests: usersWithoutDigest.length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-all-weekly-digests:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
