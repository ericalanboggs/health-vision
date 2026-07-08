# Localization — Phase 0 test plan (Spanish / Brazilian Portuguese)

Execute these to validate the localized SMS coaching experience end-to-end. Run each scenario
in **`es`** and **`pt-BR`**, and keep one **`en`** control account to confirm English is
unchanged.

> **Reviewer note:** every es/pt-BR string (SMS + crisis) is best-effort and marked in code for
> your native review. As you test, you're also proof-reading the voice. Fix wording in
> `supabase/functions/_shared/i18n.ts` (static strings) or the `languageDirective` helper in
> `_shared/coach_knowledge.ts` (AI voice), then redeploy the affected function.

---

## 0. Setup

**Set a test account's language** (any one):
- **Admin (easiest):** Admin → user detail → **Overview tab → "Coaching language"** → pick es / pt-BR.
- **Self-serve:** log in as the user → Profile → **"Coaching language"** → Save.
- **SQL:** `update profiles set preferred_language='es' where email='...';` (or `'pt-BR'`).

**Reset to English when done:** set it back to `en` (or `update ... set preferred_language='en'`).

**Triggering cron-driven sends without waiting:** several flows fire on a schedule (reminders,
reflections, daily motivation, weekly check-in). To fire one on demand, POST the function via
SQL (mirrors how we regenerate batches):
```sql
select net.http_post(
  url := 'https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/FUNCTION_NAME',
  headers := jsonb_build_object('Content-Type','application/json',
             'Authorization','Bearer '||(select value from app_config where key='service_role_key')),
  body := '{}'::jsonb
);
```
(Each still applies its own time-window / eligibility guards, so the target user must otherwise
be due.)

**Prereqs for the SMS scenarios:** the test account has a **verified phone**, **sms_opt_in = true**,
and (for habit flows) at least one **active tracked habit**; (for motivation flows)
**motivation_mode = true** with a steering prompt.

---

## 1. Crisis safety (Workstream S) — do this first, it's the gate

Text a crisis phrase from the test phone (you know it's a test).

| # | Send (from phone set to lang) | Expect | ✅ |
|---|---|---|---|
| 1.1 | **es:** `quiero morir` | Crisis reply in **Spanish** with 988 (oprime 2), 741741, 911 | ☐ |
| 1.2 | **es:** `me quiero matar` | Same Spanish crisis reply | ☐ |
| 1.3 | **pt-BR:** `quero morrer` | Crisis reply in **Portuguese** with US 988/911 + **Brasil CVV 188** | ☐ |
| 1.4 | **pt-BR:** `vou me matar` | Same Portuguese crisis reply | ☐ |
| 1.5 | **en control:** `I want to die` | English crisis reply (unchanged) | ☐ |
| 1.6 | Benign, e.g. **es** `hoy me siento cansado` | **No** crisis reply — normal coaching path | ☐ |

**Detection is language-agnostic:** even set to `en`, texting `quero morrer` should still trigger
the Portuguese crisis reply (crisis is detected across all languages regardless of the set one).
- 1.7 Account set to `en`, text `me quiero matar` → Spanish crisis reply fires ☐

> ⚠️ If any resource/number reads wrong to you, fix `CRISIS_RESPONSE` in
> `supabase/functions/twilio-webhook/index.ts` and redeploy `--no-verify-jwt`.

---

## 2. Inbound parsing (Workstream C) — replies must register

With an active **tracked habit** and a pending followup/clarification (or reply to a followup):

| # | Send | Expect | ✅ |
|---|---|---|---|
| 2.1 | **es:** `sí` / `hecho` / `listo` | Habit logged as **done** (not "didn't understand") | ☐ |
| 2.2 | **es:** `no` / `todavía no` | Habit logged as **not done** | ☐ |
| 2.3 | **pt-BR:** `sim` / `feito` / `pronto` | Habit logged as **done** | ☐ |
| 2.4 | **pt-BR:** `não` / `pulei` / `ainda não` | Habit logged as **not done** | ☐ |
| 2.5 | **en control:** `yes` / `done` and `no` / `skip` | Log correctly (unchanged) | ☐ |

Regression guard (must NOT false-match):
- 2.6 `simple` does NOT count as "sim"; `yesterday` does NOT count as "yes" ☐

---

## 3. Habit coaching loop (Workstream B)

| # | Scenario | Send / Trigger | Expect | ✅ |
|---|---|---|---|---|
| 3.1 | **Coaching reply** (non-tracking msg) | **es:** `¿cómo voy con mis hábitos?` | Warm coaching reply **in Spanish**, references their habits/data | ☐ |
| 3.2 | Coaching reply | **pt-BR:** `como estou indo?` | Coaching reply **in Portuguese** | ☐ |
| 3.3 | **Morning reminder** (`send-sms-reminders`) | trigger fn (or wait for AM window) | Reminder SMS **in-language** + localized "Responde STOP…"/"Responda STOP…" footer | ☐ |
| 3.4 | **Habit followup** (`habit-sms-followup`) | trigger fn (user due for followup) | Followup nudge **in-language** | ☐ |
| 3.5 | **Sunday reflection opener** (`send-reflection-reminders`) | trigger fn | Opener **in-language**; reply → follow-up + wrap-up **in-language** | ☐ |
| 3.6 | **en control** for 3.1/3.3 | English msg | Unchanged English | ☐ |

Check under the hood (optional): stored `weekly_habits.habit_name` stays **English** even for a
localized user (habit names are not translated — by design). ☐

---

## 4. Motivation Mode (Workstreams B + D) — the loop you're exploring

Set the test account `motivation_mode = true` + a steering prompt + `preferred_language = es`/`pt-BR`.

| # | Scenario | Trigger | Expect | ✅ |
|---|---|---|---|---|
| 4.1 | **Welcome SMS** | flip motivation_mode off→on (or new enroll) | Welcome **in-language**, with the AI "focus" phrase also in-language | ☐ |
| 4.2 | **Daily content** | regenerate batch + approve (see prior runbook) | Each card's `coach_framing` **in-language**; but the **video/article link is a real, on-topic English-source link** (search stays English — expected) | ☐ |
| 4.3 | **Mid-week re-tune ask** | reply to a card, e.g. **es** `quiero más sobre correr distancias largas` | Honest ack **in Spanish** ("lo verás en tu próximo mensaje"), upcoming cards re-tuned | ☐ |
| 4.4 | **Weekly check-in** (Sat) | trigger `send-daily-motivation` on the check-in day | Opener **in-language**; reply → ruler prompt / handoff offer / close all **in-language** | ☐ |
| 4.5 | **Readiness handoff** | answer the ruler high twice | Handoff offer **in-language**; "Reply YES / responde SÍ" accepts `sí`/`sim` | ☐ |

---

## 5. Signup path & compliance (Workstream F)

> **Timing caveat:** OTP + opt-in localize **only if `preferred_language` is set _before_ phone
> verification.** There's no onboarding language picker in Phase 0, so a brand-new signup is
> normally English unless you (admin) set the language first, or the user set it on profile-setup.
> To test the localized path, set the account's language, then re-trigger these.

| # | Scenario | Send / Trigger | Expect | ✅ |
|---|---|---|---|---|
| 5.1 | **OTP** (`send-phone-verification`) | request a code with lang pre-set | "Tu código…" / "Seu código…" **in-language** | ☐ |
| 5.2 | **Opt-in confirmation** (`verify-phone-code` or text `START`) | verify / `START` | Confirmation **in-language** (keeps HELP/STOP keywords English) | ☐ |
| 5.3 | **HELP** | text `HELP` | HELP response **in-language** | ☐ |
| 5.4 | **STOP** | text `STOP` | Carrier opt-out (English, carrier-level) — expected | ☐ |
| 5.5 | **en control** | text `HELP` on an en account | English HELP (unchanged) | ☐ |

---

## 6. English regression (must be untouched)

Run a normal English account through §§2–5. **Everything should be byte-for-byte as before**
(the language directive returns empty and `t()` falls back to English for `en`). Any English
change is a bug. ☐

---

## 7. Known Phase-0 gaps (expected English — NOT failures)

These are deliberately deferred; seeing English here is correct for Phase 0:
- **`BACKUP` / `ADD` flows** (`sms-backup-plan`, `sms-add-habit`) — flow copy stays English
  (keyword-gated; brief pilot users). Their **yes/no parsing** *is* localized, so `sí`/`não`
  still register.
- **Emails** — welcome email + all drip/onboarding emails stay English (only the SMS signup
  trio is localized).
- **App UI** — the whole web app stays English (Phase 1); only SMS coaching is localized.
- **`habit-ai-suggest`** (in-app habit suggestions) — English (app-facing; habit names must
  stay English).
- **Product keywords** — `ADD / BACKUP / ARCHIVE / STOP / HELP / START` stay English by design.

---

## 8. Sign-off

- [ ] Crisis (§1) verified in es + pt-BR, resources correct → **safety gate cleared**
- [ ] Inbound parsing (§2) registers es/pt replies, no false matches
- [ ] Habit loop (§3) speaks the language
- [ ] Motivation loop (§4) speaks the language; links stay English/on-topic
- [ ] Signup path (§5) localizes when language pre-set
- [ ] English control (§6) unchanged
- [ ] i18n.ts + crisis strings **native-reviewed** by Eric before enrolling real users
