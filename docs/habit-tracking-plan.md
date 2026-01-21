# Habit Tracking Feature - Implementation Plan

## Overview
Optional detailed tracking for habits (yes/no completion or numeric metrics) with SMS follow-up reminders. Default behavior (SMS reminders only) remains unchanged.

---

## Implementation Status

### Phase 1: Database Schema - COMPLETE
- [x] `habit_tracking_config` table created
- [x] `habit_tracking_entries` table created
- [x] `sms_followup_log` table created
- [x] `tracking_followup_time` column added to profiles
- [x] Rollback script exists
- [x] Migration run in production

**Files:**
- `supabase/migrations/20260118_add_habit_tracking.sql`
- `supabase/migrations/20260118_rollback_habit_tracking.sql`

---

### Phase 2: Frontend UI - COMPLETE

#### Habits.jsx Refactored
- [x] Inline "Track Details" toggle (ON/OFF)
- [x] Auto-apply AI suggestion when enabling tracking
- [x] Y/N | Metrics segmented button
- [x] Unit dropdown with 15 predefined units
- [x] "Other..." option for custom units
- [x] Helper text for each mode
- [x] Editable habit name in edit mode

#### WeeklyTracker.jsx Refactored
- [x] Vertical list layout (not grid)
- [x] Full day names with dates (e.g., "Saturday (1/17)")
- [x] "Week of January 19th" header format
- [x] Week navigation (back only, respects pilot start date)
- [x] Blur-to-save for metrics input (responsive typing)
- [x] Boolean checkboxes for Y/N mode
- [x] Only shows scheduled days

#### Supporting Files
- [x] `src/services/trackingService.js` - all CRUD operations
- [x] `src/constants/metricUnits.js` - 15 units + keyword patterns
- [x] `src/utils/habitSchedule.js` - date/week helpers

---

### Phase 3: Backend Services - COMPLETE

**trackingService.js functions:**
- [x] `getTrackingConfig` / `getAllTrackingConfigs`
- [x] `saveTrackingConfig`
- [x] `enableTracking` / `disableTracking`
- [x] `getEntriesForWeek` / `getEntryForDate` / `saveEntry`
- [x] `getAiSuggestion`
- [x] `getHabitStats`

---

### Phase 4: AI Suggestions - COMPLETE
- [x] Edge function `habit-ai-suggest` created
- [x] Uses OpenAI GPT-4o-mini with keyword fallback
- [x] Client-side keyword fallback in `metricUnits.js`

**File:** `supabase/functions/habit-ai-suggest/index.ts`

---

### Phase 5: SMS Follow-up System - CODE COMPLETE, NEEDS DEPLOYMENT

#### Edge Functions Created
- [x] `habit-sms-followup/index.ts` - sends follow-up SMS
  - Timezone-aware scheduling
  - Checks user's `tracking_followup_time`
  - Only sends on scheduled days
  - Only sends if no entry exists for today
  - Only sends one follow-up per day per user
  - Logs to `sms_followup_log`

- [x] `habit-sms-response/index.ts` - processes incoming SMS
  - Parses Y/N and numeric responses
  - Type validation (boolean vs metric)
  - Upserts to `habit_tracking_entries`
  - Sends confirmation with target feedback

#### NOT YET DONE
- [ ] Deploy edge functions to Supabase
- [ ] Configure Supabase cron job to trigger `habit-sms-followup`
- [ ] Configure Twilio webhook to point to `habit-sms-response`
- [ ] End-to-end testing with real SMS

---

### Phase 6: User Settings UI - NOT STARTED
- [ ] UI for users to set preferred follow-up time
- [ ] Currently defaults to 5pm (17:00)

---

## Remaining Tasks

### High Priority
1. **Deploy SMS edge functions**
   - Deploy `habit-sms-followup` to Supabase
   - Deploy `habit-sms-response` to Supabase

2. **Configure cron job**
   - Set up Supabase cron to call `habit-sms-followup` every 15 minutes
   - Example: `*/15 * * * *`

3. **Configure Twilio webhook**
   - Point Twilio incoming message webhook to:
   - `https://<project>.supabase.co/functions/v1/habit-sms-response`

4. **Test SMS flow end-to-end**
   - Test follow-up sends at correct time
   - Test Y/N response parsing
   - Test numeric response parsing
   - Test error messages for invalid formats
   - Test confirmation messages

### Medium Priority
5. **Add user settings for follow-up time**
   - Add time picker to profile/settings page
   - Allow users to choose when they get follow-up SMS (default 5pm)

### Low Priority (Future)
- Habit streaks & visualizations
- Weekly/monthly reports
- Export tracking data as CSV
- Multiple metrics per habit

---

## Testing Checklist

### UI Testing
- [ ] Toggle "Track Details" ON - auto-applies AI suggestion
- [ ] Switch between Y/N and Metrics modes
- [ ] Select different units in Metrics mode
- [ ] Enter custom unit via "Other..."
- [ ] Enter values in weekly tracker
- [ ] Navigate to previous weeks
- [ ] Toggle "Track Details" OFF - UI collapses
- [ ] Refresh page - tracking state persists

### SMS Testing
- [ ] Follow-up only sent on scheduled days
- [ ] Follow-up only sent at user's preferred time
- [ ] No follow-up if entry already exists
- [ ] Y/N responses correctly saved as boolean
- [ ] Numeric responses correctly saved as metric
- [ ] Error messages sent for invalid formats
- [ ] Confirmation messages sent after successful save
- [ ] No duplicate messages within same day

---

## Files Reference

### Frontend
- `src/pages/Habits.jsx` - main habits page with tracking UI
- `src/components/WeeklyTracker.jsx` - weekly tracking display
- `src/services/trackingService.js` - tracking API calls
- `src/constants/metricUnits.js` - unit definitions
- `src/utils/habitSchedule.js` - date utilities

### Backend (Edge Functions)
- `supabase/functions/habit-ai-suggest/index.ts`
- `supabase/functions/habit-sms-followup/index.ts`
- `supabase/functions/habit-sms-response/index.ts`

### Database
- `supabase/migrations/20260118_add_habit_tracking.sql`
- `supabase/migrations/20260118_rollback_habit_tracking.sql`

---

## Deployment Steps

### 1. Deploy Edge Functions
```bash
# From project root
supabase functions deploy habit-ai-suggest
supabase functions deploy habit-sms-followup
supabase functions deploy habit-sms-response
```

### 2. Set Environment Variables (Supabase Dashboard)
Required for edge functions:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `OPENAI_API_KEY` (optional, has fallback)
- `PILOT_START_DATE` (defaults to 2026-01-12)

### 3. Configure Cron Job
In Supabase Dashboard > Database > Extensions, enable `pg_cron`, then:
```sql
SELECT cron.schedule(
  'habit-sms-followup',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/habit-sms-followup',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  );
  $$
);
```

### 4. Configure Twilio Webhook
In Twilio Console > Phone Numbers > Your Number:
- Set "A Message Comes In" webhook to:
- `https://<project-ref>.supabase.co/functions/v1/habit-sms-response`
- Method: POST

---

*Last updated: 2026-01-18*
