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

**⚠️ Triggering cron-driven sends without waiting — READ FIRST.** Several flows fire on a
schedule (reminders, reflections, daily motivation, weekly check-in). You *can* fire one on
demand via SQL, **BUT these functions select the whole currently-DUE population, not just your
test account.** Firing one in prod will text **every real user who is due right now**, in their
own language. The eligibility guards stop it hitting the *wrong* users, not *all due* users.

Before firing any batch sender, do ONE of:
- **Preferred:** verify your test account is the only due row first, e.g. count opted-in users
  whose local send-window is open / who have unsent content — if it's just you, fire away.
- Run against a **staging Supabase project** instead of prod.
- **Safest for voice-checking:** skip the outbound cron entirely and verify the localized voice
  through the **inbound** flows (§2, §3.1, §4.3–4.5) — those are naturally scoped to the phone
  you text from and can't touch other users.

On-demand fire (only after the check above):
```sql
select net.http_post(
  url := 'https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/FUNCTION_NAME',
  headers := jsonb_build_object('Content-Type','application/json',
             'Authorization','Bearer '||(select value from app_config where key='service_role_key')),
  body := '{}'::jsonb
);
```

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

**Dropped accents / typos must STILL fire** (a distressed user won't type cleanly — a missed
crisis is the worst outcome in this whole plan). Detection is now accent-insensitive:
| # | Send | Expect | ✅ |
|---|---|---|---|
| 1.8 | **es no accents:** `suicidio` / `no quiero vivir` | Fires (es) | ☐ |
| 1.9 | **pt-BR no accents:** `nao quero viver` / `suicidio` | Fires | ☐ |

**Idioms must NOT over-fire (much).** These contain matar/morir/morrer but aren't crises:
| # | Send | Expect | ✅ |
|---|---|---|---|
| 1.10 | **es:** `estoy muerto de risa` / `este trabajo me está matando` | **No** crisis reply | ☐ |
| 1.11 | **pt-BR:** `tô morrendo de rir` | **No** crisis reply | ☐ |
| 1.12 | **pt-BR:** `esse trabalho vai me matar` | **KNOWN: still fires** — accepted. We keep bare "me matar" so real statements like "penso em me matar" are caught; over-offering help is the safe direction. Note if it bothers you. | ☐ |

> **Resource-scope decision (intentional):** `es` resources are **US-based** (988 has a Spanish
> line) — assumes Spanish-speaking users are in the US. `pt-BR` includes both US 988/911 **and**
> Brasil **CVV 188**. So an es user *outside* the US currently gets no in-country line. If your
> es audience includes non-US speakers, add a line to the `es` `CRISIS_RESPONSE`. Also note:
> the near-identical cognate "suicidio/suicídio" may resolve to the **es** resources for a pt-BR
> user (single ambiguous word) — still valid crisis help, just possibly the other language's
> resources. Flag if you want to disambiguate.

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

**The `sí` vs `si` semantic trap** (accented "sí" = yes; bare "si" = Spanish "if"). Fixed so
bare "si" only counts as yes when it's the *whole* reply:
| # | Send (in a yes/no context) | Expect | ✅ |
|---|---|---|---|
| 2.6 | **es:** `sí` / `si` / `si!` | Logged **done** (bare "si" as a full reply = yes) | ☐ |
| 2.7 | **es:** `si puedo` / `si termino hoy` | **NOT** auto-logged as done (goes to AI parse) | ☐ |

Regression guards (must NOT false-match):
| # | Send | Expect | ✅ |
|---|---|---|---|
| 2.8 | **en:** `yesterday` | Not "yes" | ☐ |
| 2.9 | **pt-BR:** `simples` / `simplesmente` | Not "sim" (the Portuguese word that literally *is* "simple") | ☐ |
| 2.10 | **pt-BR:** `não` **and** `nao` (no accent) | Both = not done | ☐ |

**Metric replies with a comma decimal** (es/pt-BR write `1,5`, not `1.5`):
| # | Send (metric habit followup) | Expect | ✅ |
|---|---|---|---|
| 2.11 | **es/pt:** `1,5` (or `1,25`) | Logged as **1.5** / **1.25**, not 1 | ☐ |
| 2.12 | `30` / `2.5` (period) | Still logged correctly | ☐ |

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

> **Now auto-detected.** `preferred_language` is set silently from the browser locale
> (`navigator.language`) at profile-setup, *before* phone verification — so an organic es/pt-BR
> signup gets OTP + opt-in in their language automatically. To test: use a browser/OS set to
> Spanish or Portuguese (or override the account's language first), then run the signup path.
| # | Scenario | Send / Trigger | Expect | ✅ |
|---|---|---|---|---|
| 5.0 | **Auto-detect** | Sign up with browser language set to es/pt-BR | New profile's `preferred_language` = es/pt-BR (check DB), OTP/opt-in arrive in-language | ☐ |

| # | Scenario | Send / Trigger | Expect | ✅ |
|---|---|---|---|---|
| 5.1 | **OTP** (`send-phone-verification`) | request a code with lang pre-set | "Tu código…" / "Seu código…" **in-language** | ☐ |
| 5.2 | **Opt-in confirmation** (`verify-phone-code` or text `START`) | verify / `START` | Confirmation **in-language** (keeps HELP/STOP keywords English) | ☐ |
| 5.3 | **HELP** | text `HELP` | HELP response **in-language** | ☐ |
| 5.4 | **STOP** | text `STOP` | Carrier opt-out (English, carrier-level) — expected | ☐ |
| 5.5 | **en control** | text `HELP` on an en account | English HELP (unchanged) | ☐ |
| 5.6 | **Malformed lang code** | `update profiles set preferred_language='pt'` (invalid) then any coaching msg | Falls back cleanly to **English**, no crash. (The DB CHECK constraint should reject `'pt'`/`'es-MX'` outright — confirm the update errors; if it somehow stored, output must be English.) | ☐ |

> **⚠️ Sequencing:** `5.4 (STOP)` sets `sms_opt_in=false`, which will suppress the §6 English
> regression sends. Run STOP **last**, or re-opt-in afterward (`text START`, or
> `update profiles set sms_opt_in=true …`) before continuing.

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

## 8. Signup first-touch — RESOLVED (was a product risk)

Originally: organic es/pt-BR signups got their first touch (OTP, opt-in) in English because
`preferred_language` wasn't set until the Profile page, *after* signup.

**Closed** by silently auto-detecting the language from the browser locale
(`navigator.language`) at profile-setup, *before* phone verification (`src/lib/detectLanguage.js`
→ `ProfileSetup.jsx`). So an organic Spanish/Portuguese signup now gets OTP + opt-in + coaching
in their language with no UI. It's an **overridable default** — the Profile picker and admin
override correct the edge cases (e.g. a US Spanish speaker on an English phone). Verify via test
5.0.

---

## 9. Sign-off

- [ ] Crisis (§1) verified in es + pt-BR, incl. dropped-accent (1.8–1.9) and idiom (1.10–1.11) cases → **safety gate cleared**
- [ ] Inbound parsing (§2) registers es/pt replies; `si puedo` doesn't mislog (2.7); comma decimals parse (2.11)
- [ ] Habit loop (§3) speaks the language
- [ ] Motivation loop (§4) speaks the language; links stay English/on-topic
- [ ] Signup path (§5) localizes when language pre-set
- [ ] English control (§6) unchanged
- [ ] i18n.ts + crisis strings **native-reviewed** by Eric before enrolling real users
