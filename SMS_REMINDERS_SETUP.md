# SMS Reminders Setup Guide

Complete guide to setting up SMS reminders with Twilio and Supabase Edge Functions.

## Prerequisites

- Supabase project with database set up
- Twilio account (sign up at https://www.twilio.com)
- Supabase CLI installed (`npm install -g supabase`)

## Step 1: Set Up Twilio

1. **Create Twilio Account**
   - Go to https://www.twilio.com/try-twilio
   - Sign up for a free trial account
   - Verify your phone number

2. **Get a Twilio Phone Number**
   - In Twilio Console, go to Phone Numbers → Buy a Number
   - Choose a number with SMS capabilities
   - Note: Trial accounts can only send to verified numbers

3. **Get Your Credentials**
   - Go to Twilio Console Dashboard
   - Copy your **Account SID**
   - Copy your **Auth Token**
   - Copy your **Twilio Phone Number** (format: +1234567890)

## Step 2: Create Database Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create table to track sent SMS reminders
CREATE TABLE IF NOT EXISTS sms_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES weekly_habits(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent',
  twilio_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_reminders_user_id ON sms_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_habit_id ON sms_reminders(habit_id);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_scheduled_for ON sms_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_status ON sms_reminders(status);

ALTER TABLE sms_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders"
  ON sms_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all reminders"
  ON sms_reminders FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

## Step 3: Deploy Edge Function

1. **Login to Supabase CLI**
   ```bash
   supabase login
   ```

2. **Link Your Project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Find your project ref in Supabase Dashboard → Settings → General

3. **Deploy the Function**
   ```bash
   supabase functions deploy send-sms-reminders
   ```

4. **Set Environment Variables**
   ```bash
   supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid_here
   supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
   supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
   ```

   Or set them in Supabase Dashboard:
   - Go to Edge Functions → send-sms-reminders → Settings
   - Add each secret

## Step 4: Enable pg_cron Extension

1. Go to Supabase Dashboard → Database → Extensions
2. Search for `pg_cron`
3. Click "Enable" on the pg_cron extension

## Step 5: Set Up Cron Job

Run this SQL in your Supabase SQL Editor:

```sql
-- Run every 15 minutes to check for reminders to send
SELECT cron.schedule(
  'send-sms-reminders-job',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-sms-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

**Important:** Replace:
- `YOUR_PROJECT_REF` with your actual project reference
- `YOUR_ANON_KEY` with your anon/public API key (from Settings → API)

## Step 6: Test the System

### Manual Test

Test the function manually to ensure it works:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-sms-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### End-to-End Test

1. Create a test habit scheduled for 15-30 minutes from now
2. Ensure your profile has:
   - Valid phone number
   - `sms_opt_in = true`
3. Wait for the cron job to run (every 15 minutes)
4. Check your phone for the SMS reminder
5. Check `sms_reminders` table to see the logged reminder

### View Cron Job Status

```sql
-- View scheduled cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## How It Works

1. **Cron triggers** every 15 minutes
2. **Edge Function runs** and queries `weekly_habits` table
3. **Filters habits** scheduled for today
4. **Checks timing** - sends reminders 15-30 minutes before habit time
5. **Verifies consent** - only sends to users with `sms_opt_in = true`
6. **Prevents duplicates** - checks `sms_reminders` table
7. **Sends SMS** via Twilio API
8. **Logs result** in `sms_reminders` table

## Message Format

Users receive messages like:
```
Hi Eric! 🏔️ Reminder: "Take a 10-minute walk" is coming up at 14:00. You've got this!
```

## Troubleshooting

### No SMS Received

1. **Check user profile**
   - Verify `sms_opt_in = true`
   - Verify phone number is correct format (+1234567890)

2. **Check habit timing**
   - Reminders sent 15-30 minutes before habit time
   - Habit must be scheduled for today

3. **Check cron job**
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-sms-reminders-job')
   ORDER BY start_time DESC LIMIT 5;
   ```

4. **Check Edge Function logs**
   - Go to Supabase Dashboard → Edge Functions → send-sms-reminders → Logs

5. **Check sms_reminders table**
   ```sql
   SELECT * FROM sms_reminders ORDER BY created_at DESC LIMIT 10;
   ```

### Twilio Trial Limitations

- Trial accounts can only send to verified phone numbers
- Add test numbers in Twilio Console → Phone Numbers → Verified Caller IDs
- Upgrade to paid account for production use

### Cron Job Not Running

1. Verify pg_cron extension is enabled
2. Check cron job exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-sms-reminders-job';
   ```
3. If missing, re-run the cron.schedule SQL

## Cost Estimates

### Twilio Pricing (US)
- SMS: $0.0079 per message
- Phone number: $1.15/month

### Example Costs
- 10 users × 2 habits/day × 7 days = 140 messages/week
- Monthly cost: ~$4.50 + $1.15 = **$5.65/month**

### Supabase Edge Functions
- 500K invocations/month free
- Cron runs 2,880 times/month (every 15 min)
- Well within free tier

## Production Checklist

- [ ] Upgrade Twilio account from trial
- [ ] Set up Twilio phone number
- [ ] Configure all environment variables
- [ ] Deploy Edge Function
- [ ] Enable pg_cron extension
- [ ] Create cron job
- [ ] Test with real users
- [ ] Monitor Edge Function logs
- [ ] Set up error alerting
- [ ] Document opt-out process for users

## Next Steps

1. **Monitor usage** - Check Twilio and Supabase dashboards
2. **Gather feedback** - Use the app feedback field in reflections
3. **Optimize timing** - Adjust reminder window based on user feedback
4. **Add features**:
   - Weekly reflection reminders (Sundays)
   - Habit streak notifications
   - Motivational messages
