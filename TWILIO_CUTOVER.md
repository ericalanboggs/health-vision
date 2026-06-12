# Twilio Number Cutover: Toll-Free → (617) 655-7921

**Goal:** Move all main Summit SMS from the toll-free number to the local Boston number
**(617) 655-7921**, which is already 10DLC-registered with full Summit context.

**Approach:** This is ~95% an ops cutover, not a code change. Every "from" number resolves
at send time from Supabase secrets (`supabase/functions/_shared/sms.ts:11`) — there are **no
hardcoded numbers in the repo**. We do **not** port the number (porting risks the 10DLC
registration). Instead we point the main Summit secrets at the account that already owns 617.

---

## Step 1 findings (confirmed 2026-06-09)

- **A2P Brand** = Approved — SID `BNd9baeff230e94db9a4a78f187213f904`
- **A2P Campaign** = Approved/Verified — SID `CM2b33c04f49ec6a097eef0c2f43668274`, use case
  **LOW_VOLUME**
- **Messaging Service** assigned to the campaign = `MGdf698b61e29cbcc95f4b12b7e650d856`
- Account shown = **"Summit Health"**
- **Throughput ceiling:** LOW_VOLUME ≈ ~2,000 msgs/day (T-Mobile brand cap) — fine at current
  scale; revisit before any large fan-out.
- **Funds:** account auto-tops-off at $10, so balance is self-managing (no manual top-up needed).
- Outbound stays raw-`From` (no code change); 617 sends with full 10DLC as a sender in the
  messaging service.
- **617 is assigned + REGISTERED** in the campaign's messaging service — `+16176557921`,
  Boston MA, number SID `PNf1f5db0d00aae71c358a58b9f46e2bc4`. ✅
- **Account SID** (account holding 617) = `AC8723973b…(617 acct — full SID in Supabase secrets)`. This is the
  current **lite** account; the **toll-free lives in a separate account**. → Consolidation case:
  Step 3 repoints **all three** main secrets to this account.

**Step 1 complete.** ✅ Compliance green, 617 registered, account identified.

## Key facts (why the plan is shaped this way)

- **617 lives on a separate Twilio account** (the "Lite" / Tech Neck account) with its own
  SID/token. Its 10DLC brand + campaign were registered there with full Summit context, so
  that account is effectively the real Summit account now.
- **Inbound routing ignores the "To" number.** `twilio-webhook/index.ts:127` extracts
  `toPhone` but never uses it — routing is purely on the sender. One number vs. two makes no
  routing difference.
- **Inbound signature validation uses a single `TWILIO_AUTH_TOKEN`**
  (`twilio-webhook/index.ts:43-80`). After cutover this must be the 617 account's token so
  inbound to 617 validates. This is the one real gotcha (see Step 5).
- **Lite is outbound-only** (no inbound handler), so repurposing 617 for interactive Summit
  traffic doesn't break any lite reply flow.

---

## Cutover steps

### Step 1 — Confirm in the Twilio console (617 / "Lite" account)
- [ ] 10DLC brand + campaign status is **Approved**.
- [ ] Note the campaign **throughput / daily cap** — confirm it covers blasting scheduled
      reminders to all active users at once (toll-free gave ~3 MPS).
- [ ] Record the account **SID**, **Auth Token**, and confirm the number is `+16176557921`.

### Step 2 — Point inbound at `twilio-webhook` (via the Messaging Service) — ✅ DONE
**Already configured** (confirmed 2026-06-09): Summit Health service `MGdf6…` Integration → "Send a
webhook" → Request URL `https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/twilio-webhook`, POST.


617 belongs to **Messaging Service `MGdf698b61e29cbcc95f4b12b7e650d856`** (the one assigned to
the approved campaign). When a number is in a Messaging Service, inbound replies are governed by
the **service's Integration settings**, not the number's own "A message comes in" field.

- [ ] **Messaging → Services → [the service] → Integration** → "Send a webhook" → **Request URL**
      = the same `twilio-webhook` function URL. HTTP **POST**.
- [ ] (Summit is interactive — habit replies, `BACKUP`, `ADD`, `STOP`/`START` — so inbound must
      reach `twilio-webhook`.)

### Step 3 — Flip the secrets (the actual cutover) — ✅ DONE (2026-06-12)
All three main secrets now match the `*_LITE` digests (point at `AC8723973b…` / 617). Verified
live: test reply to 617 hit `twilio-webhook` with no 403, logged to `sms_messages`, routed to
`habit-sms-response` (200). Cutover live + verified.

```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=AC8723973b...   # full SID in Supabase secrets (617 acct) \
  TWILIO_AUTH_TOKEN=<auth-token-for-AC8723973b...> \
  TWILIO_PHONE_NUMBER=+16176557921
```
(Auth token = the Auth Token on the dashboard of account `AC8723973b…(617 acct — full SID in Supabase secrets)`.
It's the same account your `*_LITE` secrets already point at, so the lite override keeps working
— now redundant, since main and lite share one account/number.)
- All outbound Summit SMS now sends from 617.
- Inbound signature validation now uses the matching token (inbound to 617 is signed by that
  account).
- No function redeploy needed — secrets are read at runtime.

### Step 4 — Lite override becomes a harmless no-op
- The `*_LITE` vars now point at the same account/number, so the explicit `from` override in
  `verify-phone-code` and `send-lite-challenge-sms` keeps working (sends from the same 617).
- No urgent change. Optional later cleanup: collapse the redundant lite override path.

### Step 5 — Heads-up to active users (transition gotcha) ⚠️
After Step 3, `TWILIO_AUTH_TOKEN` = the 617 token. Any user who replies to an **old thread
that came from the toll-free** will hit `twilio-webhook` signed by the toll-free account's
token → **403, silently dropped**.

**Chosen handling (no code change):**
- [ ] Right after cutover, send the small set of active users a heads-up from 617 (e.g. via
      admin SMS): *"Heads up — Summit now texts you from (617) 655-7921. Save it 👍"*
- [ ] This rolls every active thread onto 617. Users reply to the latest message, so they're
      on the new number immediately.

### Step 6 — Keep toll-free parked as backup
- [ ] Do **not** release the toll-free yet.
- [ ] **Rollback** = revert the three secrets in Step 3 to the toll-free account's values.
- [ ] Cancel the toll-free after a clean week on 617.

### Step 7 — Verify
- [x] Send a test admin SMS → confirm it arrives **from 617**.
- [x] Reply to it → `twilio-webhook` processed it (200, no 403 signature failure) — verified
      2026-06-12.
- [ ] Exercise `STOP` / `START`, `BACKUP`, `ADD`.
- [ ] Watch Supabase function logs for any 403 signature rejections over the next day.

---

## Notes
- No phone number is displayed anywhere in the app or marketing copy, so there are **no
  frontend/code edits** required for the cutover.
- If volume grows, re-check the 10DLC campaign throughput tier against the size of the
  scheduled-reminder fan-out.
