import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') || 'eric.alan.boggs@gmail.com,eric@summithealth.app')
  .split(',')
  .map(e => e.trim().toLowerCase())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildEmailHtml(body: string, ctaText: string, ctaUrl: string): string {
  const logoUrl = 'https://go.summithealth.app/summit-logo.png'

  // Convert newlines in body to <br> tags for HTML
  const htmlBody = body.replace(/\n/g, '<br>')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Summit Health</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${logoUrl}" alt="Summit" width="120" style="display: block; max-width: 120px; height: auto;">
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                ${htmlBody}
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <a href="${ctaUrl}" style="display: inline-block; padding: 16px 32px; background-color: rgb(16, 185, 129); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                ${ctaText}
              </a>
            </td>
          </tr>

          <!-- Footer / Signoff -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Best,<br>
                <strong>Coach Eric</strong><br>
                <span style="font-size: 14px; color: #6a6a6a;">Summit Founder</span>
              </p>
              <p style="margin: 0; font-size: 13px; color: #9a9a9a; text-align: center; line-height: 1.5;">
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Verify the JWT and check if user is admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { userId, subject, body, ctaText, category, toOverride } = await req.json()

    if (!userId || !subject || !body) {
      return new Response(
        JSON.stringify({ error: 'userId, subject, and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.email) {
      return new Response(
        JSON.stringify({ error: 'User has no email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const firstName = profile.first_name || 'Friend'

    // Replace {{name}} in subject and body
    const finalSubject = subject.replace(/\{\{name\}\}/g, firstName)
    const finalBody = body.replace(/\{\{name\}\}/g, firstName)

    const recipientEmail = toOverride || profile.email
    const ctaUrl = 'https://go.summithealth.app/dashboard'
    const finalCtaText = ctaText || 'Open Summit'

    const html = buildEmailHtml(finalBody, finalCtaText, ctaUrl)

    console.log(`Admin ${user.email} sending email to ${recipientEmail} (${userId}), category: ${category || 'none'}`)

    const result = await sendEmail({ to: recipientEmail, subject: finalSubject, html })

    if (result.success) {
      // Log to email_reminders
      await supabase.from('email_reminders').insert({
        user_id: userId,
        email: recipientEmail,
        email_type: `admin-${category || 'general'}`,
        subject: finalSubject,
        status: 'sent',
        resend_id: result.id,
      })

      console.log(`Sent admin email to ${recipientEmail}`)

      return new Response(
        JSON.stringify({ success: true, resendId: result.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Log failure
      await supabase.from('email_reminders').insert({
        user_id: userId,
        email: recipientEmail,
        email_type: `admin-${category || 'general'}`,
        subject: finalSubject,
        status: 'failed',
        error_message: result.error,
      })

      console.error(`Failed to send admin email to ${recipientEmail}:`, result.error)

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in send-admin-email function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
