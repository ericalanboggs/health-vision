import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const REPORT_RECIPIENT = 'eric@summithealth.app'

interface FailureRow {
  table: string
  id: string
  created_at: string
  details: string
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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    console.log(`Running daily health report since ${since}`)

    const failures: FailureRow[] = []

    // 1. Failed SMS from sms_messages
    const { data: failedSms, error: smsErr } = await supabase
      .from('sms_messages')
      .select('id, created_at, phone, body, error_message, twilio_status')
      .eq('twilio_status', 'failed')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (smsErr) console.error('Error querying sms_messages:', smsErr)
    for (const row of failedSms || []) {
      failures.push({
        table: 'sms_messages',
        id: row.id,
        created_at: row.created_at,
        details: `Phone: ${row.phone} | Error: ${row.error_message || 'unknown'} | Body: ${(row.body || '').substring(0, 60)}...`,
      })
    }

    // 2. Failed SMS from sms_reminders
    const { data: failedReminders, error: remErr } = await supabase
      .from('sms_reminders')
      .select('id, sent_at, phone, message, error_message, status')
      .eq('status', 'failed')
      .gte('sent_at', since)
      .order('sent_at', { ascending: false })

    if (remErr) console.error('Error querying sms_reminders:', remErr)
    for (const row of failedReminders || []) {
      failures.push({
        table: 'sms_reminders',
        id: row.id,
        created_at: row.sent_at,
        details: `Phone: ${row.phone} | Error: ${row.error_message || 'unknown'} | Msg: ${(row.message || '').substring(0, 60)}...`,
      })
    }

    // 3. Failed emails from email_reminders
    const { data: failedEmails, error: emailErr } = await supabase
      .from('email_reminders')
      .select('id, created_at, email, email_type, error_message, status')
      .eq('status', 'failed')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (emailErr) console.error('Error querying email_reminders:', emailErr)
    for (const row of failedEmails || []) {
      failures.push({
        table: 'email_reminders',
        id: row.id,
        created_at: row.created_at,
        details: `To: ${row.email} | Type: ${row.email_type} | Error: ${row.error_message || 'unknown'}`,
      })
    }

    // 4. Failed cron jobs from net._http_response (via RPC)
    try {
      const { data: failedCrons, error: cronErr } = await supabase
        .rpc('get_failed_cron_responses', { since_ts: since })

      if (cronErr) {
        console.error('Error querying cron responses:', cronErr)
      }
      for (const row of failedCrons || []) {
        failures.push({
          table: 'cron (net._http_response)',
          id: row.id?.toString() || 'unknown',
          created_at: row.created,
          details: `Status: ${row.status_code} | URL: ${row.url || 'unknown'}`,
        })
      }
    } catch (err) {
      console.error('RPC get_failed_cron_responses not available:', err)
    }

    // Build email
    const totalFailures = failures.length
    const subject = totalFailures > 0
      ? `[Summit] Health Report: ${totalFailures} failure${totalFailures > 1 ? 's' : ''} in last 24h`
      : `[Summit] Health Report: All Clear`

    const smsFails = failures.filter(f => f.table === 'sms_messages').length
    const reminderFails = failures.filter(f => f.table === 'sms_reminders').length
    const emailFails = failures.filter(f => f.table === 'email_reminders').length
    const cronFails = failures.filter(f => f.table.startsWith('cron')).length

    let html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
<div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
  <h1 style="margin: 0 0 8px 0; font-size: 22px; color: #1a1a1a;">Summit Daily Health Report</h1>
  <p style="margin: 0 0 24px 0; font-size: 14px; color: #6a6a6a;">Last 24 hours ending ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' })} CST</p>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr>
      <td style="padding: 12px 16px; background: ${smsFails > 0 ? '#fef2f2' : '#f0fdf4'}; border-radius: 8px 8px 0 0;">
        <strong>SMS (sms_messages)</strong>: ${smsFails} failure${smsFails !== 1 ? 's' : ''}
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; background: ${reminderFails > 0 ? '#fef2f2' : '#f0fdf4'};">
        <strong>SMS Reminders</strong>: ${reminderFails} failure${reminderFails !== 1 ? 's' : ''}
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; background: ${emailFails > 0 ? '#fef2f2' : '#f0fdf4'};">
        <strong>Emails</strong>: ${emailFails} failure${emailFails !== 1 ? 's' : ''}
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; background: ${cronFails > 0 ? '#fef2f2' : '#f0fdf4'}; border-radius: 0 0 8px 8px;">
        <strong>Cron Jobs</strong>: ${cronFails} failure${cronFails !== 1 ? 's' : ''}
      </td>
    </tr>
  </table>`

    if (totalFailures > 0) {
      html += `
  <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #1a1a1a;">Failure Details</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <thead>
      <tr style="background: #f9fafb;">
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb;">Source</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb;">Time</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb;">Details</th>
      </tr>
    </thead>
    <tbody>`

      for (const f of failures) {
        const time = new Date(f.created_at).toLocaleString('en-US', { timeZone: 'America/Chicago', timeStyle: 'short', dateStyle: 'short' })
        html += `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb; white-space: nowrap;">${f.table}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb; white-space: nowrap;">${time}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${f.details}</td>
      </tr>`
      }

      html += `
    </tbody>
  </table>`
    } else {
      html += `
  <div style="text-align: center; padding: 32px; color: #15803d;">
    <div style="font-size: 40px; margin-bottom: 8px;">&#10003;</div>
    <p style="font-size: 18px; font-weight: 600; margin: 0;">All systems healthy</p>
    <p style="font-size: 14px; color: #6a6a6a; margin: 8px 0 0 0;">No failures detected in the last 24 hours.</p>
  </div>`
    }

    html += `
</div>
</body></html>`

    // Send report
    const result = await sendEmail({
      to: REPORT_RECIPIENT,
      subject,
      html,
    })

    if (!result.success) {
      console.error('Failed to send health report email:', result.error)
      return new Response(JSON.stringify({ error: 'Failed to send report', details: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Health report sent: ${subject}`)

    return new Response(JSON.stringify({
      message: 'Health report sent',
      totalFailures,
      breakdown: { smsFails, reminderFails, emailFails, cronFails },
      resendId: result.id,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in daily-health-report:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
