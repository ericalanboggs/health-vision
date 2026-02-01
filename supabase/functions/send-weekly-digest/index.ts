import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface WeeklyDigest {
  id: string
  user_id: string
  week_number: number
  subject: string
  email_markdown: string
  status: string
}

interface Profile {
  id: string
  first_name: string
  email: string
}

// Accessible green color (4.5:1 contrast ratio on white)
const BRAND_GREEN = '#15803d'

/**
 * Convert markdown to styled HTML email
 */
function markdownToHtml(markdown: string): string {
  let html = markdown

  // Convert markdown tables to HTML tables FIRST (before line processing)
  html = convertTablesToHtml(html)

  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3 style="margin: 24px 0 12px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="margin: 28px 0 16px 0; font-size: 20px; font-weight: 700; color: #1a1a1a;">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">$1</h1>')

  // Convert blockquotes (before other processing)
  html = html.replace(/^> (.+)$/gm, `<blockquote style="margin: 16px 0; padding: 16px 20px; background-color: #f0fdf4; border-left: 4px solid ${BRAND_GREEN}; border-radius: 0 8px 8px 0; font-style: italic; color: #166534;">$1</blockquote>`)

  // Convert bold and italic (links with underline for accessibility)
  html = html.replace(/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g, `<a href="$2" style="color: ${BRAND_GREEN}; text-decoration: underline; font-weight: 600;">$1</a>`)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color: ${BRAND_GREEN}; text-decoration: underline;">$1</a>`)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 600; color: #1a1a1a;">$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">')

  // Convert unordered lists
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
      // Convert numbered lists
      const numberedItem = line.match(/^(\d+)\. (.+)$/)
      if (numberedItem) {
        processedLines.push(`<p style="margin: 8px 0; padding-left: 24px; color: #4a4a4a; line-height: 1.6;"><span style="color: ${BRAND_GREEN}; font-weight: 600;">${numberedItem[1]}.</span> ${numberedItem[2]}</p>`)
      } else if (line.trim() === '') {
        processedLines.push('')
      } else if (!line.startsWith('<')) {
        // Regular paragraph (if not already HTML)
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

  // Clean up empty paragraphs
  html = html.replace(/<p style="[^"]*"><\/p>/g, '')
  html = html.replace(/<p style="[^"]*">\s*<\/p>/g, '')

  return html
}

/**
 * Convert markdown tables to styled HTML tables
 */
function convertTablesToHtml(markdown: string): string {
  const lines = markdown.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Check if this is a table header row (starts with |)
    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[-\s|]+\|$/)) {
      // Parse header
      const headerCells = line.split('|').filter(cell => cell.trim()).map(cell => cell.trim())

      // Skip separator row
      i += 2

      // Parse data rows
      const dataRows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').filter(cell => cell.trim()).map(cell => cell.trim())
        dataRows.push(cells)
        i++
      }

      // Build HTML table
      const tableHtml = buildHtmlTable(headerCells, dataRows)
      result.push(tableHtml)
    } else {
      result.push(line)
      i++
    }
  }

  return result.join('\n')
}

/**
 * Build a styled HTML table
 */
function buildHtmlTable(headers: string[], rows: string[][]): string {
  const tableStyle = 'width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;'
  const thStyle = `background-color: #f9fafb; padding: 12px 16px; text-align: left; font-weight: 600; color: #1a1a1a; border: 1px solid #e5e7eb;`
  const tdStyle = `padding: 12px 16px; color: #4a4a4a; border: 1px solid #e5e7eb; line-height: 1.5;`

  let html = `<table style="${tableStyle}">`

  // Header row
  html += '<thead><tr>'
  for (const header of headers) {
    html += `<th style="${thStyle}">${header}</th>`
  }
  html += '</tr></thead>'

  // Data rows
  html += '<tbody>'
  for (const row of rows) {
    html += '<tr>'
    for (const cell of row) {
      html += `<td style="${tdStyle}">${cell}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody>'

  html += '</table>'
  return html
}

/**
 * Build the full HTML email with Summit template
 */
function buildEmailHtml(content: string, firstName: string): string {
  const logoUrl = 'https://summit-pilot.vercel.app/summit-logo.png'
  const appUrl = 'https://summit-pilot.vercel.app'

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
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <a href="${appUrl}">
                <img src="${logoUrl}" alt="Summit" width="100" style="display: block; max-width: 100px; height: auto;">
              </a>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              ${content}
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px;">
              <a href="${appUrl}" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Open Summit App
              </a>
            </td>
          </tr>

          <!-- Footer -->
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
    // Validate authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check Resend config
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse request
    const body = await req.json()
    const { digest_id, user_id, week_number, email_override } = body

    console.log(`=== Send Weekly Digest ===`)
    console.log(`digest_id: ${digest_id}`)
    console.log(`user_id: ${user_id}`)
    console.log(`week_number: ${week_number}`)
    console.log(`email_override: ${email_override}`)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    let digest: WeeklyDigest | null = null
    let profile: Profile | null = null

    if (digest_id) {
      // Fetch specific digest
      const { data, error } = await supabase
        .from('weekly_digests')
        .select('*')
        .eq('id', digest_id)
        .single()

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Digest not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      digest = data

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, email')
        .eq('id', digest.user_id)
        .single()

      profile = profileData
    } else if (user_id) {
      // Fetch most recent digest for user (or specific week)
      let query = supabase
        .from('weekly_digests')
        .select('*')
        .eq('user_id', user_id)

      if (week_number) {
        query = query.eq('week_number', week_number)
      }

      const { data, error } = await query
        .order('week_number', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'No digest found for user' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      digest = data

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, email')
        .eq('id', user_id)
        .single()

      profile = profileData
    } else {
      return new Response(JSON.stringify({ error: 'Either digest_id or user_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!digest) {
      return new Response(JSON.stringify({ error: 'Digest not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Determine recipient email
    const recipientEmail = email_override || profile?.email
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'No email address available' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const firstName = profile?.first_name || 'there'

    console.log(`Sending digest to: ${recipientEmail}`)
    console.log(`Subject: ${digest.subject}`)

    // Convert markdown to HTML
    const htmlContent = markdownToHtml(digest.email_markdown)
    const fullHtml = buildEmailHtml(htmlContent, firstName)

    // Send via Resend (with retry on rate limit)
    const result = await sendEmail({
      to: recipientEmail,
      subject: digest.subject,
      html: fullHtml,
    })

    if (!result.success) {
      console.error('Resend error:', result.error)
      return new Response(JSON.stringify({
        error: 'Failed to send email',
        details: result.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`✓ Email sent successfully! Resend ID: ${result.id}`)

    // Update digest status if not using email_override (i.e., real send)
    if (!email_override) {
      await supabase
        .from('weekly_digests')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', digest.id)
    }

    // Log to email_reminders table
    await supabase.from('email_reminders').insert({
      user_id: digest.user_id,
      email: recipientEmail,
      email_type: 'weekly_digest',
      subject: digest.subject,
      status: 'sent',
      resend_id: result.id,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Weekly digest sent successfully',
        resend_id: result.id,
        recipient: recipientEmail,
        subject: digest.subject,
        digest_id: digest.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error sending weekly digest:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
