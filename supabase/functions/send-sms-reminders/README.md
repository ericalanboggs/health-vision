# SMS Reminders Edge Function

This Supabase Edge Function sends consolidated daily SMS reminders to users for their scheduled habits via Twilio.

## How It Works

1. **Triggered by cron job** - Runs every 15 minutes throughout the day
2. **Queries habits** - Finds ALL habits scheduled for today for each user
3. **Finds earliest habit** - Determines each user's first habit of the day
4. **Checks timing window** - Only sends 15-30 minutes before user's first habit
5. **Groups by user** - Consolidates all habits into a single message per user
6. **Checks consent** - Only sends to users with `sms_opt_in = true`
7. **Prevents duplicates** - Ensures only ONE message per user per day
8. **Sends via Twilio** - Uses Twilio API to send consolidated SMS

## Environment Variables Required

Set these in your Supabase project settings (Dashboard → Edge Functions → Secrets):

```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PILOT_START_DATE=2026-01-12
```

**Note:** The function will only send reminders during the 3-week pilot period starting from `PILOT_START_DATE`. Outside this date range, the function will exit early without sending any messages.

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
-- Run every 15 minutes to catch users' first habits at the right time
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

Daily reminders are sent 15-30 minutes before the user's first habit in this consolidated format:
```
Hi [FirstName]! 🏔️ Your Summit habits for today:

• [Habit 1] at [Time]
• [Habit 2] at [Time]
• [Habit 3] at [Time]

You've got this! Reply STOP to opt out.
```

Example (sent at 1:45 PM if first habit is at 2:00 PM):
```
Hi Eric! 🏔️ Your Summit habits for today:

• Take a 10-minute walk at 2:00pm
• Drink 8 glasses of water at 5:00pm
• Evening meditation at 8:00pm

You've got this! Reply STOP to opt out.
```

**Note:** 
- Users receive a maximum of ONE message per day, regardless of how many habits they have scheduled
- Message is sent 15-30 minutes before their earliest habit of the day
- If a user has no habits scheduled for a day, no message is sent
- SMS reminders only run during the 3-week pilot period (January 12 - February 1, 2026)
