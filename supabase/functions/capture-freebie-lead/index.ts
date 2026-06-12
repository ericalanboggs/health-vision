import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://go.summithealth.app'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// The freebies we offer. `file` is the asset under /public/freebies/.
// `kind` selects the download-email template (skill vs. PDF guide).
interface FreebieConfig {
  name: string
  file: string
  kind: 'skill' | 'guide'
}
const FREEBIES: Record<string, FreebieConfig> = {
  'summit-weekly-reflection': {
    name: 'Summit Weekly Reflection',
    file: 'summit-weekly-reflection.zip',
    kind: 'skill',
  },
  'lifestyle-changes-guide': {
    name: 'Lifestyle Changes Guide',
    file: 'lifestyle-changes-guide.pdf',
    kind: 'guide',
  },
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function buildDownloadHtml(downloadUrl: string, logoUrl: string, freebieName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${freebieName} download</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${logoUrl}" alt="Summit" width="120" style="display: block; max-width: 120px; height: auto;">
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 12px 40px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                Here's your free coach
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Thanks for grabbing the <strong>${freebieName}</strong> skill. It's a pocket-sized
                version of how Summit coaches — capture a vision, run a few small weekly experiments,
                and reflect every Sunday. Install it on whatever AI you already use.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 8px 40px 28px 40px;">
              <a href="${downloadUrl}" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Download the skill (.zip)
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                Two-minute setup:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #15803d; font-weight: 600; width: 150px;">Claude Code</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #4a4a4a;">Unzip into ~/.claude/skills/ and say "start my weekly reflection."</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #15803d; font-weight: 600;">Claude.ai Project</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #4a4a4a;">Paste the reference files, then SKILL.md, into your Project instructions.</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #15803d; font-weight: 600;">ChatGPT</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #4a4a4a;">Build a Custom GPT and paste the same three files as its instructions.</td>
                </tr>
              </table>
              <p style="margin: 14px 0 0 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">
                The download includes a step-by-step INSTALL.md for each platform.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Want this same coach over daily text check-ins, challenges, and reminders that
                actually sound human? That's the full Summit experience —
                <a href="https://summithealth.app" style="color: #15803d; font-weight: 600;">take a look</a>.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Best,<br>
                <strong>Coach Eric</strong><br>
                <span style="font-size: 14px; color: #6a6a6a;">Summit Founder</span>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #9a9a9a; text-align: center; line-height: 1.5;">
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

function buildGuideHtml(downloadUrl: string, logoUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Lifestyle Changes Guide</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${logoUrl}" alt="Summit" width="120" style="display: block; max-width: 120px; height: auto;">
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 12px 40px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                Here's your guide
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                "Lifestyle changes" with no instructions is a frustrating place to start. This guide
                is the instructions — a no-overhaul method for actually making them stick. One small
                habit at a time, and the three things that keep it going when motivation doesn't.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 8px 40px 28px 40px;">
              <a href="${downloadUrl}" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Download the guide (PDF)
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                Start here:
              </p>
              <p style="margin: 0; font-size: 15px; color: #4a4a4a; line-height: 1.7;">
                Page 2 is a worksheet. Print it or fill it on your phone — list what's on the table,
                pick the one smallest thing, decide when and where you'll do it this week, and write
                down your why. That's the whole first step.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Want a coach who runs this with you — nudges you over text, adjusts when life gets
                loud, and keeps your why in front of you? That's Summit.
                <a href="https://summithealth.app/use-cases/lifestyle-changes" style="color: #15803d; font-weight: 600;">Try it free for 14 days</a>.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                — <strong>Coach Eric</strong><br>
                <span style="font-size: 14px; color: #6a6a6a;">Summit Founder</span>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #9a9a9a; text-align: center; line-height: 1.5;">
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body = await req.json()
    const email: string = (body.email || '').trim().toLowerCase()
    const freebieSlug: string = body.freebieSlug || 'summit-weekly-reflection'
    const wantsTips: boolean = body.wantsTips !== false
    const source: string = body.source || 'freebies_page'

    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'A valid email is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      )
    }

    const cfg = FREEBIES[freebieSlug] || FREEBIES['summit-weekly-reflection']
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Upsert the lead (idempotent on email + freebie_slug).
    const { error: leadError } = await supabase
      .from('freebie_leads')
      .upsert(
        { email, freebie_slug: freebieSlug, wants_tips: wantsTips, source, updated_at: new Date().toISOString() },
        { onConflict: 'email,freebie_slug' }
      )

    if (leadError) {
      console.error('Error upserting freebie lead:', leadError)
      throw leadError
    }

    // 2. Email the download link. Best-effort — a send failure doesn't fail the capture.
    const downloadUrl = `${FRONTEND_URL}/freebies/${cfg.file}`
    const logoUrl = `${FRONTEND_URL}/summit-logo.png`
    const emailResult = await sendEmail({
      to: email,
      subject: cfg.kind === 'guide'
        ? `Your ${cfg.name} — download inside`
        : `Your ${cfg.name} skill — download inside`,
      html: cfg.kind === 'guide'
        ? buildGuideHtml(downloadUrl, logoUrl)
        : buildDownloadHtml(downloadUrl, logoUrl, cfg.name),
    })

    if (emailResult.success) {
      await supabase
        .from('freebie_leads')
        .update({ email_sent: true })
        .eq('email', email)
        .eq('freebie_slug', freebieSlug)
      console.log(`Sent ${freebieSlug} download email to ${email}`)
    } else {
      console.error(`Failed to send ${freebieSlug} download email:`, emailResult.error)
    }

    return new Response(
      JSON.stringify({ success: true, emailed: emailResult.success }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )

  } catch (error) {
    console.error('Error in capture-freebie-lead:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )
  }
})
