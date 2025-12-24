# SMS Reminders Implementation Progress

## 🎯 Goal
Implement automated SMS reminders for users' scheduled habits using Twilio and Supabase Edge Functions with a cron scheduler.

---

## ✅ What We've Completed

### 1. Database Schema
- ✅ Created `sms_reminders` table to track sent messages
  - Columns: id, user_id, habit_id, phone, message, scheduled_for, sent_at, status, twilio_sid, error_message
  - RLS policies for user access and service role management
  - Indexes for performance
  - Location: `supabase/migrations/create_sms_reminders_table.sql`

- ✅ Added `time_of_day` column to `weekly_habits` table
  - Location: `supabase/migrations/add_time_of_day_to_habits.sql`
  - **Important**: Times must be stored in UTC format (e.g., 20:30 for 2:30pm CST)

### 2. Supabase Edge Function
- ✅ Created `send-sms-reminders` Edge Function
  - Location: `supabase/functions/send-sms-reminders/index.ts`
  - Deployed to Supabase via Dashboard (not CLI due to Xcode version conflict)
  - Queries habits scheduled for today
  - Filters by time window (15-30 minutes before habit time)
  - Checks SMS consent (`sms_opt_in = true`)
  - Sends SMS via Twilio API
  - Logs all attempts to `sms_reminders` table
  - Prevents duplicate reminders

### 3. Twilio Setup
- ✅ Created Twilio account
- ✅ Obtained credentials:
  - Account SID
  - Auth Token
  - ~~Toll-free phone number~~ (requires verification - see issues below)
- ✅ Verified user phone number (+1 858 886 9929)
- ✅ Configured environment variables in Supabase Edge Function:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER` (currently toll-free, needs to be updated)

### 4. Cron Job Setup
- ✅ Enabled `pg_cron` extension in Supabase
- ✅ Created cron job to run every 15 minutes
  - Triggers Edge Function via HTTP POST
  - Uses anon key for authorization

### 5. Testing & Debugging
- ✅ Fixed multiple issues:
  - Missing `time_of_day` column in habits table
  - Profile `sms_opt_in` not set to true
  - Phone number format (added +1 country code)
  - Timezone handling (UTC vs local time)
  - `updated_at` trigger conflicts in profiles table
  - Missing `reminder_time` column requirement
- ✅ Successfully sent test SMS to Twilio (status: "sent")
- ✅ Verified message logged in `sms_reminders` table with Twilio SID

---

## ❌ Current Blocker

### Twilio Toll-Free Number Issue
**Problem**: The Twilio phone number (+1 877-812-1292) is toll-free and requires verification before it can send SMS.

**Error**: `Error: 30032 Toll-Free Number Has Not Been Verified Toll-Free Verification Required`

**Impact**: SMS messages are accepted by Twilio but marked as "Undelivered" and never reach the user's phone.

**Twilio Log Details**:
- Message SID: `SMf6ab72364bf51dd04155f1e4d4c935be`
- Status: Undelivered
- From: (US) +1 8778121292 (toll-free)
- To: (US) +1 8588869929
- Error: 30032

---

## 🔧 Next Steps Required

### Immediate (Before Testing Again)

1. **Buy a Local Twilio Phone Number**
   - Go to Twilio Console → Phone Numbers → Buy a number
   - **Uncheck "Toll-Free"** ✓
   - **Check "SMS" capability** ✓
   - Choose a local number (e.g., +1 858 area code)
   - Cost: ~$1.15/month

2. **Update Supabase Edge Function Secret**
   - Go to Supabase Dashboard → Edge Functions → `send-sms-reminders` → Settings
   - Update `TWILIO_PHONE_NUMBER` to new local number
   - Format: `+15551234567`
   - Click Save

3. **Test SMS Delivery**
   ```sql
   -- Delete old test reminder
   DELETE FROM sms_reminders WHERE habit_name LIKE '%Test%';
   
   -- Update test habit for current time + 20 minutes (in UTC)
   -- Example: If it's 3:00pm CST (21:00 UTC), set for 3:20pm CST (21:20 UTC)
   UPDATE weekly_habits 
   SET time_of_day = '21:20',  -- Adjust to current UTC time + 20 min
       reminder_time = '21:05'  -- 15 min before
   WHERE habit_name = 'Test SMS Reminder';
   ```
   
   - Wait until reminder time (15 min before habit)
   - Test Edge Function manually or wait for cron job
   - **Verify SMS is received on phone**

### After Successful SMS Test

4. **Update App to Handle Timezones**
   - When users schedule habits in `/schedule-habits`, convert local time to UTC before saving
   - User's timezone is stored in `profiles.timezone` (e.g., "America/Chicago")
   - Use timezone conversion when saving `time_of_day` to `weekly_habits`

5. **Clean Up Test Data**
   ```sql
   -- Remove test habit
   DELETE FROM weekly_habits WHERE habit_name = 'Test SMS Reminder';
   
   -- Remove test reminders
   DELETE FROM sms_reminders WHERE habit_id NOT IN (SELECT id FROM weekly_habits);
   ```

6. **Production Considerations**
   - Upgrade Twilio account from trial (to send to any phone number)
   - Consider toll-free verification if needed (takes 1-2 weeks)
   - Monitor Twilio usage and costs
   - Set up error alerting for failed SMS
   - Add opt-out handling ("Reply STOP to unsubscribe")

---

## 📋 Key Files & Locations

### Database Migrations
- `supabase/migrations/create_sms_reminders_table.sql` - SMS tracking table
- `supabase/migrations/add_time_of_day_to_habits.sql` - Time field for habits
- `supabase/migrations/add_app_feedback_to_reflections.sql` - Feedback field (completed earlier)

### Edge Function
- `supabase/functions/send-sms-reminders/index.ts` - Main SMS sending logic
- `supabase/functions/send-sms-reminders/README.md` - Deployment instructions

### Documentation
- `SMS_REMINDERS_SETUP.md` - Complete setup guide with troubleshooting
- `SMS_REMINDERS_PROGRESS.md` - This file (current progress)

### Frontend (Needs Updates)
- `src/pages/ScheduleHabits.jsx` - Add timezone conversion when saving habits
- `src/pages/Profile.jsx` - Profile edit page (completed)
- `src/components/TopNav.jsx` - Navigation with profile access (completed)

---

## 🐛 Known Issues & Solutions

### Issue 1: Timezone Mismatch
**Problem**: Habits stored in local time but Edge Function uses UTC
**Solution**: Convert local time to UTC when saving habits
**Status**: Workaround applied (manual UTC entry), needs app-level fix

### Issue 2: Missing `time_of_day` Column
**Problem**: Old habits don't have time set
**Solution**: Migration added column, but existing habits need times assigned
**Status**: Fixed for new habits, old habits skip reminder

### Issue 3: Profile `updated_at` Trigger
**Problem**: Trigger references non-existent `updated_at` column
**Solution**: Dropped trigger with CASCADE
**Status**: Fixed

### Issue 4: Toll-Free Number Verification
**Problem**: Twilio toll-free numbers require verification
**Solution**: Use local number for testing/pilot
**Status**: **Blocking** - needs local number purchase

---

## 💡 Testing Checklist

When you resume:

- [ ] Buy local Twilio phone number
- [ ] Update `TWILIO_PHONE_NUMBER` secret in Supabase
- [ ] Verify profile has:
  - [ ] `phone` = `+18588869929`
  - [ ] `phone_number` = `+18588869929`
  - [ ] `sms_opt_in` = `true`
- [ ] Create test habit with UTC time (current time + 20 min)
- [ ] Test Edge Function manually
- [ ] Verify SMS received on phone
- [ ] Check `sms_reminders` table for logged message
- [ ] Verify cron job runs automatically every 15 minutes
- [ ] Clean up test data
- [ ] Commit all changes to GitHub

---

## 📊 System Architecture

```
┌─────────────────┐
│  Supabase Cron  │ (Runs every 15 minutes)
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────────────────┐
│  Edge Function              │
│  send-sms-reminders         │
│                             │
│  1. Query weekly_habits     │
│  2. Filter by time window   │
│  3. Check SMS consent       │
│  4. Send via Twilio API     │
│  5. Log to sms_reminders    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐
│   Twilio API    │ → SMS to user's phone
└─────────────────┘
```

---

## 🎓 Lessons Learned

1. **Timezone Handling**: Always store times in UTC, convert on display
2. **Twilio Trial Limits**: Can only send to verified numbers
3. **Toll-Free Requirements**: Require verification, use local numbers for testing
4. **Phone Format**: Always include country code (+1)
5. **Database Triggers**: Check for column existence before creating triggers
6. **Edge Function Deployment**: Dashboard deployment works when CLI has issues
7. **Cron Timing**: 15-minute intervals work well for reminder windows

---

## 🚀 Future Enhancements

- [ ] Weekly reflection reminders (Sundays)
- [ ] Habit streak notifications
- [ ] Motivational messages
- [ ] Opt-out handling (STOP keyword)
- [ ] Delivery status webhooks
- [ ] SMS analytics dashboard
- [ ] Multi-timezone support in UI
- [ ] Batch SMS sending optimization

---

## 📞 Support Resources

- **Twilio Console**: https://console.twilio.com
- **Twilio Docs**: https://www.twilio.com/docs/sms
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **pg_cron Docs**: https://github.com/citusdata/pg_cron

---

**Last Updated**: December 22, 2025 at 2:24pm CST
**Status**: 95% Complete - Blocked on Twilio local number purchase
**Next Session**: Buy local number, update secret, test SMS delivery
