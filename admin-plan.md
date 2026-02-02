# Plan: Admin SMS Interface & User Management

## Goal
Add 2-way SMS capability and user management to the `/admin` interface, enabling quick communication with 100-200 pilot users.

---

## Features

### Phase 1 (This Implementation)
1. **1-to-1 SMS**: Click user row → open modal → send message
2. **Bulk SMS**: Checkbox selection → action toolbar → send to many (not group text)
3. **Delete Users**: Multi-select → confirm dialog → delete with cascade

### Phase 2 (Future)
- Sort/filter by engagement groups
- SMS conversation history view
- "Magic moment" triggers

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

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/admin/SendSMSModal.jsx` | SMS composition modal |
| `src/components/admin/DeleteConfirmModal.jsx` | Delete confirmation modal |
| `src/components/admin/BulkActionToolbar.jsx` | Selection actions bar |
| `supabase/functions/send-admin-sms/index.ts` | Edge function for admin SMS |
| `supabase/migrations/20260201_create_admin_sms_log.sql` | SMS logging table |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/Admin.jsx` | Add checkbox column, selection state, toolbar integration |
| `src/pages/AdminUserDetail.jsx` | Add "Send SMS" button in profile section |
| `src/services/adminService.js` | Add `sendAdminSMS()`, `deleteUsers()` functions |

---

## Database Schema

### New Table: `admin_sms_log`
```sql
CREATE TABLE admin_sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'sent', 'failed'
  twilio_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_sms_log_sent_by ON admin_sms_log(sent_by);
CREATE INDEX idx_admin_sms_log_recipient ON admin_sms_log(recipient_user_id);
CREATE INDEX idx_admin_sms_log_sent_at ON admin_sms_log(sent_at DESC);
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
3. Log each send to `admin_sms_log` table
4. Small delay (100ms) between sends to avoid rate limits
5. Return aggregated results

---

## Implementation Steps

### Step 1: Database Migration
Create `admin_sms_log` table with indexes and RLS policies.

### Step 2: Edge Function
Create `send-admin-sms` function following `send-invite-email` pattern:
- CORS handling
- JWT verification
- Twilio REST API calls
- Result logging

### Step 3: Service Layer
Add to `adminService.js`:
- `sendAdminSMS(recipients, message)` - calls Edge Function
- `deleteUsers(userIds)` - creates Edge Function for auth.admin access

### Step 4: Components
Build in this order:
1. `SendSMSModal.jsx` - reusable for both bulk and single user
2. `DeleteConfirmModal.jsx` - confirmation with "DELETE" typing
3. `BulkActionToolbar.jsx` - selection count and action buttons

### Step 5: Admin.jsx Integration
- Add selection state: `const [selectedUserIds, setSelectedUserIds] = useState(new Set())`
- Add checkbox column to table header and rows
- Conditionally render BulkActionToolbar vs invite form
- Wire up modal opens/closes
- Clear selection after successful actions

### Step 6: AdminUserDetail.jsx
- Add "Send SMS" button near phone display
- Opens SendSMSModal with single recipient

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

6. **Edge Function**
   - [ ] Rejects non-admin requests
   - [ ] Sends via Twilio successfully
   - [ ] Logs to `admin_sms_log` table
   - [ ] Returns per-recipient status
