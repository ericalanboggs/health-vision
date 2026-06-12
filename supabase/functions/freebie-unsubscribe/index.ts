import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// One-click unsubscribe for the freebie nurture drip. Linked from the footer
// of every drip email. Sets wants_tips = false so the lead drops out of
// send-freebie-drip-emails. Public GET (clicked from an email) — deploy with
// --no-verify-jwt; auth comes from possession of the link, not a JWT.

function page(title: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
    <td align="center" style="padding:60px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr><td style="padding:48px 40px;text-align:center;">
          <h1 style="margin:0 0 12px;font-size:24px;color:#1a1a1a;">${title}</h1>
          <p style="margin:0;font-size:16px;color:#4a4a4a;line-height:1.6;">${message}</p>
        </td></tr>
      </table>
    </td>
  </tr></table>
</body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const email = (url.searchParams.get('email') || '').trim().toLowerCase()
    const slug = url.searchParams.get('slug') || 'summit-weekly-reflection'

    if (!email) {
      return page('Something went wrong', 'We couldn\'t read your email from that link. Just reply to any email and we\'ll take you off the list.')
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const { error } = await supabase
      .from('freebie_leads')
      .update({ wants_tips: false, updated_at: new Date().toISOString() })
      .eq('email', email)
      .eq('freebie_slug', slug)

    if (error) {
      console.error('Unsubscribe error:', error)
      return page('Something went wrong', 'We hit a snag. Reply to any email and we\'ll take you off the list right away.')
    }

    console.log(`Unsubscribed ${email} from ${slug} tips`)
    return page('You\'re unsubscribed', 'You won\'t get any more tips from us. The free skill is still yours to keep. Take care.')
  } catch (error) {
    console.error('Error in freebie-unsubscribe:', error)
    return page('Something went wrong', 'Reply to any email and we\'ll take you off the list.')
  }
})
