# SMS Reminders Edge Function

This Supabase Edge Function sends SMS reminders to users for their scheduled habits via Twilio.

## How It Works

1. **Triggered by cron job** - Runs every 15 minutes
2. **Queries habits** - Finds habits scheduled for today
3. **Filters by time** - Sends reminders 15-30 minutes before habit time
4. **Checks consent** - Only sends to users with `sms_opt_in = true`
5. **Prevents duplicates** - Tracks sent reminders in `sms_reminders` table
6. **Sends via Twilio** - Uses Twilio API to send SMS

## Environment Variables Required

Set these in your Supabase project settings (Dashboard → Edge Functions → Secrets):

```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Deployment

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy send-sms-reminders

# Set environment variables
supabase secrets set TWILIO_ACCOUNT_SID=your_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_token
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
```

## Setting Up Cron Job

In your Supabase Dashboard:
1. Go to Database → Extensions
2. Enable `pg_cron` extension
3. Run this SQL to create the cron job:

```sql
-- Run every 15 minutes
SELECT cron.schedule(
  'send-sms-reminders',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/send-sms-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

## Testing

Test the function manually:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/send-sms-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Message Format

Reminders are sent in this format:
```
Hi [FirstName]! 🏔️ Reminder: "[Habit Name]" is coming up at [Time]. You've got this!
```

Example:
```
Hi Eric! 🏔️ Reminder: "Take a 10-minute walk" is coming up at 14:00. You've got this!
```
