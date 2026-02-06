# Plan: Admin SMS Interface & User Management

## Goal
Add full 2-way SMS capability and user management to the `/admin` interface, enabling personalized communication with users at scale.

---

## Features

### Phase 1: Core SMS Infrastructure
1. **1-to-1 SMS**: Click user row → open modal → send message
2. **Bulk SMS**: Checkbox selection → action toolbar → send to many (not group text)
3. **Delete Users**: Multi-select → confirm dialog → delete with cascade
4. **Incoming SMS Webhook**: Capture all user replies via Twilio webhook

### Phase 2: Conversation History & Filtering
1. **2-Way Conversation View**: See full SMS history for each user in AdminUserDetail
2. **Engagement Filtering**: Filter users by status (new, active, inactive, not completing habits)
3. **Quick Reply**: Reply directly from conversation view

### Phase 3 (Future)
- "Magic moment" triggers (auto-send on milestones)
- Templated messages with variable substitution
- Scheduled sends

---

## User Flow

```
/admin
├── [Checkbox] column (leftmost)
├── Existing columns: Name, Email, Phone, SMS, Last Login, Habits, Status
│
├── When 0 selected: Normal view with invite form
│
└── When 1+ selected: Bulk Action Toolbar appears
    ├── "{N} selected" count
    ├── [Send SMS] button → Opens SendSMSModal
    ├── [Delete] button → Opens DeleteConfirmModal
    └── [X] Clear selection

/admin/users/:userId
└── [Send SMS] button in profile section → Opens SendSMSModal (1 recipient)
```

---

## UI Components

### 1. Checkbox Selection (Admin.jsx)
```
┌──┬──────────┬─────────────────┬─────────────┬─────┬────────────┬────────┬────────────┐
│☑ │ Name     │ Email           │ Phone       │ SMS │ Last Login │ Habits │ Status     │
├──┼──────────┼─────────────────┼─────────────┼─────┼────────────┼────────┼────────────┤
│☐ │ John Doe │ john@email.com  │ +1555...    │ Y   │ 2h ago     │ 3      │ Pilot Ready│
│☑ │ Jane Doe │ jane@email.com  │ +1555...    │ Y   │ 1d ago     │ 2      │ Needs Setup│
└──┴──────────┴─────────────────┴─────────────┴─────┴────────────┴────────┴────────────┘
```

- Header checkbox: Select all / deselect all (with indeterminate state)
- Row checkbox: Toggle individual selection
- Checkbox click stops propagation (doesn't navigate to detail)

### 2. Bulk Action Toolbar
When `selectedUserIds.size > 0`, replaces invite section:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🟢 3 selected        [📱 Send SMS]  [🗑️ Delete]                         [X] │
└─────────────────────────────────────────────────────────────────────────────┘
```
- Summit mint background (`bg-summit-mint`)
- Slide-down animation on appear

### 3. SendSMSModal
```
┌─────────────────────────────────────────────────────────────────┐
│ Send SMS to 3 users                                    [X]  │
├─────────────────────────────────────────────────────────────────┤
│ ⚠️ 1 user will be skipped (no phone or SMS opt-out)         │
│                                                             │
│ Recipients: John Doe, Jane Doe, and 1 more                  │
│                                                             │
│ Message:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Hi! Quick check-in from Summit...                       │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ 1 SMS segment                                     45/320    │
├─────────────────────────────────────────────────────────────────┤
│                                    [Cancel]  [Send to 2]    │
└─────────────────────────────────────────────────────────────────┘
```

### 4. DeleteConfirmModal
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Delete 2 users?                                     [X]  │
├─────────────────────────────────────────────────────────────────┤
│ This will permanently delete these users and all data:      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ • John Doe (john@email.com)                             │ │
│ │ • Jane Doe (jane@email.com)                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Type "DELETE" to confirm:                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                            [Cancel]  [Delete Permanently]   │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Conversation History View (AdminUserDetail)
Located in the AdminUserDetail page, shows full 2-way SMS history:
```
┌─────────────────────────────────────────────────────────────────┐
│ 📱 SMS Conversation                              [Send Message] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────┐                   │
│  │ Summit: Hi Sarah! Quick check-in - how   │ ← Outbound (right)│
│  │ is your energy this week?                │   Jan 15, 2:30pm  │
│  └──────────────────────────────────────────┘                   │
│                                                                 │
│  ┌──────────────────────────────────────────┐                   │
│  │ Much better! The morning walks are       │ ← Inbound (left)  │
│  │ really helping. Thanks for checking in!  │   Jan 15, 3:45pm  │
│  └──────────────────────────────────────────┘                   │
│                                                                 │
│  ┌──────────────────────────────────────────┐                   │
│  │ Summit: That's great to hear! Keep it up │ ← Outbound        │
│  └──────────────────────────────────────────┘   Jan 15, 4:00pm  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Type a message...                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                      [Send] │
└─────────────────────────────────────────────────────────────────┘
```

- Outbound messages (from Summit): Right-aligned, green/mint background
- Inbound messages (from user): Left-aligned, gray background
- Timestamps shown for each message
- Auto-scroll to most recent
- Quick reply input at bottom

### 6. Engagement Filter Toolbar (Admin.jsx)
Filter bar above the user table:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Filter: [All ▼]  [New (7 days) ▼]  [Inactive ▼]  [Low Engagement ▼]        │
│                                                                             │
│ Quick filters:  [🆕 New]  [⚠️ No habits]  [📉 Declining]  [✅ Active]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Filter definitions:**
- **New**: Joined within last 7 days
- **No Habits**: Has vision but 0 habits created
- **Inactive**: No login in 7+ days
- **Low Engagement**: < 30% habit completion rate (last 2 weeks)
- **Declining**: Engagement dropped 50%+ from previous week
- **Active**: Logged in within 3 days AND completing habits

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/admin/SendSMSModal.jsx` | SMS composition modal |
| `src/components/admin/DeleteConfirmModal.jsx` | Delete confirmation modal |
| `src/components/admin/BulkActionToolbar.jsx` | Selection actions bar |
| `src/components/admin/ConversationView.jsx` | 2-way SMS history display |
| `src/components/admin/EngagementFilter.jsx` | User filtering toolbar |
| `supabase/functions/send-admin-sms/index.ts` | Edge function for admin SMS |
| `supabase/functions/twilio-webhook/index.ts` | Webhook to receive incoming SMS |
| `supabase/migrations/20260201_create_sms_messages.sql` | Unified SMS messages table |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/Admin.jsx` | Add checkbox column, selection state, toolbar, filters |
| `src/pages/AdminUserDetail.jsx` | Add ConversationView component, quick reply |
| `src/services/adminService.js` | Add `sendAdminSMS()`, `deleteUsers()`, `getConversation()`, `getUserEngagement()` |

---

## Database Schema

### New Table: `sms_messages` (Unified for all SMS - inbound & outbound)
```sql
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Direction: 'inbound' (user → Summit) or 'outbound' (Summit → user)
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- User association (can be NULL if we can't match phone to user)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,  -- User's phone number (E.164 format)
  user_name TEXT,       -- Cached for display

  -- Message content
  body TEXT NOT NULL,

  -- For outbound: who sent it (admin user ID, or 'system' for automated)
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_by_type TEXT CHECK (sent_by_type IN ('admin', 'system')),  -- 'admin' or 'system' (automated reminders)

  -- Twilio metadata
  twilio_sid TEXT,
  twilio_status TEXT,  -- 'queued', 'sent', 'delivered', 'failed', 'received'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- For failed messages
  error_message TEXT
);

-- Indexes for common queries
CREATE INDEX idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_phone ON sms_messages(phone);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at DESC);
CREATE INDEX idx_sms_messages_direction ON sms_messages(direction);

-- Composite index for conversation view (user's messages sorted by time)
CREATE INDEX idx_sms_messages_conversation ON sms_messages(user_id, created_at DESC);
```

### View: `user_engagement` (for filtering)
```sql
CREATE VIEW user_engagement AS
SELECT
  p.id as user_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.sms_opt_in,
  p.created_at as joined_at,
  p.last_login_at,

  -- Days since joined
  EXTRACT(DAY FROM NOW() - p.created_at) as days_since_joined,

  -- Days since last login
  EXTRACT(DAY FROM NOW() - p.last_login_at) as days_since_login,

  -- Habit counts
  (SELECT COUNT(*) FROM weekly_habits wh WHERE wh.user_id = p.id) as habit_count,

  -- Has vision
  (SELECT COUNT(*) > 0 FROM health_journeys hj WHERE hj.user_id = p.id) as has_vision,

  -- Reflection count (last 14 days)
  (SELECT COUNT(*) FROM weekly_reflections wr
   WHERE wr.user_id = p.id
   AND wr.created_at > NOW() - INTERVAL '14 days') as recent_reflections,

  -- Engagement status (computed)
  CASE
    WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 'new'
    WHEN p.last_login_at < NOW() - INTERVAL '7 days' THEN 'inactive'
    WHEN (SELECT COUNT(*) FROM weekly_habits wh WHERE wh.user_id = p.id) = 0 THEN 'no_habits'
    ELSE 'active'
  END as engagement_status

FROM profiles p
WHERE p.profile_completed = true;
```

---

## Edge Function: send-admin-sms

**Endpoint:** `POST /functions/v1/send-admin-sms`

**Request:**
```json
{
  "recipients": [
    { "userId": "uuid", "phone": "+15551234567", "name": "John" }
  ],
  "message": "Hi! Quick check-in from Summit..."
}
```

**Response:**
```json
{
  "success": true,
  "sent": 2,
  "failed": 1,
  "results": [
    { "userId": "...", "status": "sent", "twilioSid": "SM..." },
    { "userId": "...", "status": "failed", "error": "Invalid number" }
  ]
}
```

**Logic:**
1. Verify admin authorization (check JWT email === admin email)
2. Loop through recipients, send via Twilio REST API
3. Log each send to `sms_messages` table (direction: 'outbound', sent_by_type: 'admin')
4. Small delay (100ms) between sends to avoid rate limits
5. Return aggregated results

---

## Edge Function: twilio-webhook (Incoming SMS)

**Endpoint:** `POST /functions/v1/twilio-webhook`

**Purpose:** Receive incoming SMS from users and log to `sms_messages` table.

**Twilio sends (form-encoded):**
```
From: +15551234567
To: +18005551234 (your Twilio number)
Body: "Yes, I completed my meditation!"
MessageSid: SM...
```

**Logic:**
1. Validate Twilio signature (X-Twilio-Signature header)
2. Parse incoming message (From, Body, MessageSid)
3. Look up user by phone number in `profiles` table
4. Insert into `sms_messages`:
   - direction: 'inbound'
   - user_id: matched user (or NULL if not found)
   - phone: From number
   - body: message text
   - twilio_sid: MessageSid
   - twilio_status: 'received'
5. Return TwiML response (empty or auto-reply if configured)

**TwiML Response (minimal):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

**Twilio Console Setup:**
1. Go to Phone Numbers → Your Number → Messaging
2. Set "A MESSAGE COMES IN" webhook to:
   `https://<project>.supabase.co/functions/v1/twilio-webhook`
3. Method: HTTP POST

---

## Service Layer Functions

### adminService.js additions:

```javascript
// Send SMS to one or more users
async function sendAdminSMS(recipients, message) {
  const response = await supabase.functions.invoke('send-admin-sms', {
    body: { recipients, message }
  })
  return response.data
}

// Get conversation history for a user
async function getConversation(userId, limit = 50) {
  const { data, error } = await supabase
    .from('sms_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit)
  return { data, error }
}

// Get users with engagement data
async function getUsersWithEngagement() {
  const { data, error } = await supabase
    .from('user_engagement')
    .select('*')
    .order('joined_at', { ascending: false })
  return { data, error }
}

// Delete users (cascade)
async function deleteUsers(userIds) {
  const response = await supabase.functions.invoke('delete-users', {
    body: { userIds }
  })
  return response.data
}
```

---

## Implementation Steps

### Phase 1: Core SMS Infrastructure

#### Step 1.1: Database Migration
Create `sms_messages` table with indexes and RLS policies.

```bash
# Create migration file
supabase/migrations/20260207_create_sms_messages.sql
```

#### Step 1.2: Edge Function - send-admin-sms
Create `send-admin-sms` function following `send-invite-email` pattern:
- CORS handling
- JWT verification
- Twilio REST API calls
- Log to `sms_messages` table

#### Step 1.3: Edge Function - twilio-webhook
Create `twilio-webhook` function:
- Validate Twilio signature
- Parse incoming SMS
- Match phone to user
- Log to `sms_messages` table
- Configure in Twilio Console

#### Step 1.4: Service Layer
Add to `adminService.js`:
- `sendAdminSMS(recipients, message)` - calls Edge Function
- `deleteUsers(userIds)` - creates Edge Function for auth.admin access

#### Step 1.5: Components
Build in this order:
1. `SendSMSModal.jsx` - reusable for both bulk and single user
2. `DeleteConfirmModal.jsx` - confirmation with "DELETE" typing
3. `BulkActionToolbar.jsx` - selection count and action buttons

#### Step 1.6: Admin.jsx Integration
- Add selection state: `const [selectedUserIds, setSelectedUserIds] = useState(new Set())`
- Add checkbox column to table header and rows
- Conditionally render BulkActionToolbar vs invite form
- Wire up modal opens/closes
- Clear selection after successful actions

### Phase 2: Conversation History & Filtering

#### Step 2.1: Database View
Create `user_engagement` view for filtering.

#### Step 2.2: ConversationView Component
- Fetch messages for user via `getConversation()`
- Display in chat bubble format (left/right aligned)
- Auto-scroll to latest
- Quick reply input at bottom

#### Step 2.3: AdminUserDetail.jsx Updates
- Add ConversationView component as a card section
- "Send SMS" button opens modal OR uses inline quick reply
- Show SMS opt-in status prominently

#### Step 2.4: Engagement Filtering
- Add `EngagementFilter.jsx` component
- Quick filter chips: New, Inactive, No Habits, Active
- Update `getAllUsers()` to use `user_engagement` view

#### Step 2.5: Admin.jsx Filter Integration
- Add filter toolbar above table
- Wire up filter state
- Show filter counts

---

## Key Implementation Details

### Selection State Management
```javascript
const [selectedUserIds, setSelectedUserIds] = useState(new Set())

// Select all
setSelectedUserIds(new Set(sortedUsers.map(u => u.id)))

// Clear all
setSelectedUserIds(new Set())

// Toggle individual
const newSet = new Set(selectedUserIds)
checked ? newSet.add(userId) : newSet.delete(userId)
setSelectedUserIds(newSet)

// Get selected users for modals
const selectedUsers = sortedUsers.filter(u => selectedUserIds.has(u.id))
```

### SMS Eligibility Filter
```javascript
// In SendSMSModal - filter to users who can receive SMS
const eligibleRecipients = recipients.filter(r =>
  r.smsOptIn && r.phone && r.phone !== 'N/A'
)
const ineligibleCount = recipients.length - eligibleRecipients.length
```

### Checkbox Column (stop propagation to prevent row navigation)
```jsx
<td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
  <input
    type="checkbox"
    checked={selectedUserIds.has(user.id)}
    onChange={(e) => handleToggleUser(user.id, e.target.checked)}
    className="rounded border-stone-300 text-summit-emerald"
  />
</td>
```

---

## Verification

1. **Checkbox Selection**
   - [ ] Header checkbox selects/deselects all visible users
   - [ ] Individual checkboxes toggle correctly
   - [ ] Selection persists through sort/filter changes
   - [ ] Clicking checkbox doesn't navigate to user detail

2. **Bulk Action Toolbar**
   - [ ] Appears when 1+ users selected
   - [ ] Shows correct count
   - [ ] Clear button resets selection
   - [ ] Hides when selection cleared

3. **Send SMS Modal**
   - [ ] Shows recipient count and names
   - [ ] Warns about ineligible users (no phone/SMS opt-out)
   - [ ] Character counter works (160 = 1 segment, 320 = 2)
   - [ ] Send button disabled when empty or no eligible recipients
   - [ ] Shows loading state during send
   - [ ] Success clears selection and closes modal

4. **Delete Confirm Modal**
   - [ ] Lists users to be deleted
   - [ ] Requires typing "DELETE"
   - [ ] Delete button disabled until confirmed
   - [ ] Users actually deleted from database
   - [ ] Selection cleared after delete

5. **Admin User Detail**
   - [ ] "Send SMS" button visible for users with phone
   - [ ] Opens modal with single recipient

6. **Edge Function - send-admin-sms**
   - [ ] Rejects non-admin requests
   - [ ] Sends via Twilio successfully
   - [ ] Logs to `sms_messages` table (direction: outbound)
   - [ ] Returns per-recipient status

7. **Edge Function - twilio-webhook**
   - [ ] Validates Twilio signature
   - [ ] Parses incoming message correctly
   - [ ] Matches phone to user in profiles
   - [ ] Logs to `sms_messages` table (direction: inbound)
   - [ ] Returns valid TwiML response

8. **Conversation View (Phase 2)**
   - [ ] Loads message history for user
   - [ ] Displays outbound messages on right (green)
   - [ ] Displays inbound messages on left (gray)
   - [ ] Shows timestamps for each message
   - [ ] Auto-scrolls to most recent
   - [ ] Quick reply sends message and refreshes view

9. **Engagement Filtering (Phase 2)**
   - [ ] Filter chips display correctly
   - [ ] "New" shows users joined < 7 days
   - [ ] "Inactive" shows users with no login > 7 days
   - [ ] "No Habits" shows users with vision but 0 habits
   - [ ] Filters combine correctly
   - [ ] Selected count updates with filters
