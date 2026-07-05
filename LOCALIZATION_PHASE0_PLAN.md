# Localization — Phase 0 plan (Spanish / Portuguese)

**Goal:** Stand up a real, near-complete *coaching* experience in Spanish and Brazilian
Portuguese — because health coaching accessible to everyone is a core principle of the
business, and we want to honestly say we have it. Build the coaching loop in-language at the
lowest cost; defer full frontend UI translation to Phase 1.

**Pilot languages:** **Spanish (`es`) and Brazilian Portuguese (`pt-BR`)** — both ship in
Phase 0.

**Strategy:** Build the language plumbing once, language-neutral. Localize the AI coaching
loop via *surgical, per-field* prompt directives (not a blanket "respond in X"). Translate
only the bounded static content the coaching loop actually hits. Localize the safety path
(crisis) deterministically.

> **Status note (2026-07-05):** This plan was rewritten after a code audit (two sub-agents)
> found real gaps the original prompt-only plan missed. All file:line citations below are
> from that audit and are ~point-in-time — **re-verify against current code at build time.**

---

## Decisions

1. **UN-GATED — build proactively (2026-07-05).** Originally gated on landing a community
   partner. Eric decided to build it now as a core-principle investment, not wait on a
   partner. (Partner brief `marketing/partner-brief-language-equity.md` still useful for
   distribution, but no longer a build gate.)

2. **Reviewer = Eric (2026-07-05).** Eric speaks both Spanish and Portuguese. He is the
   voice + safety reviewer. This resolves the biggest open risk (a monolingual founder
   couldn't review non-English flagged conversations). **Dependency, now VERIFIED:** the
   coach-flag email ships the raw user phrase verbatim — `habit-sms-response/index.ts:379`
   (`<strong>User message:</strong> "${userMessage}"`) — plus a log entry in the admin SMS
   thread. So Eric receives the actual user words, in-language, on every flag.

3. **Pilot languages — DECIDED:** `es` + `pt-BR`, both in Phase 0. Infra is language-neutral;
   per-language cost is the translation pass (Workstream D) + Eric's review per language.

4. **Portuguese variant — DECIDED:** pt-BR. Cape Verdean communities often use Kriolu, not
   standard Portuguese — out of scope for Phase 0.

5. **How language gets set — DECIDED:** two surfaces writing `profiles.preferred_language`:
   user self-service in `Profile.jsx`, admin override in `AdminUserDetail.jsx`. No
   onboarding-flow picker in Phase 0.

6. **Clinical guardrail stays AI-generated in-language — ACCEPTED RESIDUAL.** The clinical
   guardrail (`_shared/coach_knowledge.ts:70-76`) is model *instructions*, not fixed phrases
   — there's no clean seam to make refer-out phrasing a vetted static string without building
   deterministic interception (not in scope). Mitigation: Eric is bilingual and reviews
   flagged conversations. Residual = an un-flagged message the AI phrases slightly wrong.
   Accepted for Phase 0. (Contrast with **crisis**, which IS a fixed string and WILL be
   localized — see Workstream S.)

---

## Scope boundary (what Phase 0 is NOT)

- **NOT** full frontend i18n. App UI stays English (no i18n lib today; ~3k strings = Phase 1).
- **NOT** translating the full drip/nurture email suite. But the **signup-path trio** (OTP,
  opt-in confirmation, welcome email) IS in scope — it's the localized user's first
  impression (Workstream F).
- **NOT** a voice rewrite of `coach_knowledge.ts`. English instructions stay; the model
  *outputs* in-language. Eric refines voice via review.

---

## Workstream S — Safety / crisis path (DO FIRST — gate) (~0.5–1 day)

The audit's #1 finding: the crisis path is monolingual in both detection AND resources. A
Spanish/Portuguese user in crisis is **not detected** and falls through to the normal AI
coach. This is the one true must-fix and it goes first.

- **Localize crisis DETECTION.** `twilio-webhook/index.ts:12-19` `CRISIS_PATTERNS` is
  English regex ("kill myself", "suicide", "want to die"). Add es/pt-BR patterns
  ("quiero morir", "me quiero matar", "me quero matar", "quero morrer", "acabar con todo",
  etc.). Have a native-fluent (Eric) pass on the pattern list per language.
- **Route to country-correct RESOURCES.** `twilio-webhook/index.ts:21-26` `CRISIS_RESPONSE`
  hardcodes US-English 988 / 741741 / 911. Make it a per-language fixed string:
  - `es` (US): 988 (has a Spanish line) / Crisis Text Line "AYUDA" to 741741.
  - `pt-BR` (Brazil): **CVV 188** (Centro de Valorização da Vida) + 192 (SAMU). Confirm the
    right lines before shipping.
  This is a fixed, vetted static string per language — exactly the safe pattern.
- **Localize the phantom-log safety backstop.** `PHANTOM_LOG_PATTERN`
  (`habit-sms-response.ts:~535`) is English regex catching the AI falsely claiming "logged".
  A Spanish "lo registré" sails past it. Add es/pt-BR verbs (registré/registrei, guardé,
  anoté/anotei, marqué/marquei…). Backstop only — the prompt instruction still stands.

**Gate:** no localized user is enrolled until Workstream S ships and Eric has reviewed the
crisis patterns + resources for both languages.

---

## Workstream A — Plumbing (language-neutral, ~1 day)

### A1. Migration
New `supabase/migrations/YYYYMMDD_add_preferred_language.sql` (unique date prefix). Mirror
`20260531_add_acquisition_source.sql`:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_language_chk
  CHECK (preferred_language IN ('en','es','pt-BR'));
```

### A2. Read path — NARROW-SELECT AUDIT (audit finding #5)
The column is invisible to any sender that loads the profile with an explicit column list.
Add `preferred_language` to each. Confirmed narrow selects to fix (re-verify lines):
- `_shared/user_context.ts:82` — the **shared loader** (used by habit-sms-response +
  sms-reflection-response). Add the column AND a `language` field to the `UserContext` type.
  This is the single highest-leverage spot.
- `sms-add-habit/index.ts:168`, `send-confidence-check/index.ts:69`,
  `generate-motivation-batch/index.ts:575` (motivation generator — in scope, would emit
  English otherwise), `send-reflection-reminders/index.ts:331`,
  `send-daily-motivation/index.ts:91`, `send-welcome-tour-sms:69`.
- Free (already `select('*')`): `send-sms-reminders:394`, `habit-sms-followup:209`,
  `sms-reflection-response:247`, `sms-motivation-checkin:169`, `sms-backup-plan:375`,
  `habit-sms-response:846`.

### A3. Shared language directive helper
Add to `_shared/coach_knowledge.ts` a centralized, **field-scoped** directive (see B for why
scoping matters):
```ts
const LANG_NAMES = { en: 'English', es: 'Spanish (neutral Latin American)', 'pt-BR': 'Brazilian Portuguese' }
export function languageDirective(lang = 'en'): string {
  if (!lang || lang === 'en') return ''
  const name = LANG_NAMES[lang] ?? 'English'
  return `\n\nLANGUAGE: Write ONLY the user-facing free-text fields in ${name} (warm, direct, ` +
    `terse Summit voice; write like a native ${name} coach, not a word-for-word translation). ` +
    `Do NOT translate JSON keys, enum values, search queries, or habit names — those stay ` +
    `EXACTLY as specified in English. Keep it SMS-length.`
}
```

---

## Workstream B — Localize the AI coaching loop, SURGICALLY (~1–2 days)

**Audit finding #1 (critical):** a blanket "respond in {language}" corrupts machine-parsed
output. Many prompts return JSON whose **enum values are compared literally in code** and
whose **strings feed other systems**. The directive must be per-field: translate free text,
keep the rest English.

| Function | Line | What's user-facing (localize) | What MUST stay English |
|---|---|---|---|
| `habit-sms-response` | ~254 `smartParseMessage` | `friendly_response`, `clarification_question` | enums `value_type` (boolean/metric), `clarification_type` (metric_needed/…); `habit_name` (verbatim from DB) |
| `habit-sms-response` | ~482 `generateCoachingResponse` | `response` | `flag_for_human_coach`, `flag_reason` (keep parseable) |
| `sms-reflection-response` | ~157 `generateFollowUp` / `~185 generateWrapUp` | the conversational replies | — |
| `sms-reflection-response` | ~139 `parseReflection` | **nothing** — leave fully English (internal extraction) | all |
| `send-reflection-reminders` | `generateOpener` | Sunday opener | — |
| `generate-motivation-batch` | ~translation of `coach_framing`, `quote_text` | framing + quote text | `type` enum; **`search_query` (feeds YouTube/Tavily — English keeps retrieval quality)** |
| `sms-motivation-checkin` | check-in replies | conversational replies | — |
| `habit-sms-followup`, `send-sms-reminders` | reminder/followup copy | the message | — |
| `habit-ai-suggest`, `sms-backup-plan`, `sms-add-habit` | free-text confirmations | confirmations | structured fields (target/frequency/habit definition) |

Notes:
- **`search_query` staying English is important** — a Spanish YouTube/Tavily query wrecks
  content retrieval. The framing the user reads is Spanish; the query behind it is English.
- **Length:** es/pt-BR run ~20–30% longer than English. Keep char caps in the prompt AND see
  Workstream G (SMS cost) — accented text also changes segment math.

---

## Workstream C — Inbound parsing (~1 day — bigger than "sí/sim")

**Audit finding #3:** inbound English matching is ~10 hardcoded sites across 5 functions. A
user replying "sí, hecho" won't log. Extend each (re-verify lines):
- `habit-sms-response.ts:203` (affirmative), `:209` (negative), `:732-734`
  (`boolean_needed`): add `sí/si/claro/dale/listo/hecho` (es), `sim/claro/pronto/feito` (pt),
  negatives `no` (shared), `não/nao/nunca/ainda não`. Emoji already language-agnostic.
- `sms-backup-plan.ts:597,639,848,890` (confirm/reject arrays) — same additions.
- `sms-motivation-checkin.ts` `isAffirmative` / `isReadyIntent` — add es/pt readiness/affirm
  terms (the TTM handoff is currently English-only).
- **Numeric parsers** (confidence 1-5, readiness ruler `\b(10|[1-9])\b`) are cross-language —
  but their **re-prompt strings** are English and embed command keywords ("text BACKUP") →
  handle as static (Workstream D), and see command-keyword note below.
- **Command keywords** (`BACKUP`, `ADD`, `ARCHIVE`) — Phase 0: keep English, brief pilot
  users; optionally add localized aliases later (`AYUDA`, `AGREGAR`). `STOP/HELP/START` stay
  English (carrier-level) but their *responses* localize (Workstream F).
- **Habit-name fuzzy matcher** (`habit-sms-response.ts:112-141`, English stopwords/stemming +
  Jaccard ≥0.3): coupled to Workstream D — if `challengeConfig` habit names are translated,
  stored `habit_name` becomes Spanish and this matcher degrades. Decide per D (below).

---

## Workstream D — Bounded static content (~per language)

Parallel locale files + selector keyed off `preferred_language`. Only the coaching-loop hot
path:
1. **Onboarding segments** — `src/data/onboardingSegments.js` (~1.5k words).
2. **Challenges** — `src/data/challengeConfig.js` (~12k words). **Coupling caveat:** habit
   names here get written to `weekly_habits.habit_name` and must round-trip through the
   English fuzzy matcher (Workstream C). Either keep `habit_name` canonical-English (translate
   only display copy) OR localize the matcher too. **Recommend: keep stored `habit_name`
   English, translate only titles/descriptions/focus copy** — least risk.
3. **Core SMS/reflection fallback strings + re-prompts** — the fixed English strings (fallback
   openers, "Reply Y or N", confidence re-prompts) into `_shared/i18n.ts` `t(key, lang)`,
   ~30–40 strings. Includes the command-keyword-bearing re-prompts from Workstream C.

All Workstream-D copy reviewed by Eric per language before enrolling users.

---

## Workstream F — Signup-path & compliance copy (~0.5–1 day)

**Audit finding:** the localized user's first touchpoints are English. In scope for Phase 0
(first impression + compliance):
- **OTP SMS** — `send-phone-verification/index.ts:114` ("Your Summit verification code is…").
- **Opt-in confirmation** — `verify-phone-code/index.ts:139-140,156` + `twilio-webhook:242`
  (A2P-required consent confirmation).
- **HELP response** — `twilio-webhook/index.ts:223`.
- **Reminder compliance footer** — `send-sms-reminders/index.ts:545` ("Reply STOP to opt
  out.").
- **Welcome email** — `send-welcome-email/index.ts` (DB-trigger fired, unavoidable first
  email). Localize this one; the rest of the email drip can lag to Phase 1.
- Note: STOP/HELP/START *keyword detection* stays English (carrier-level). Twilio Advanced
  Opt-Out recognizes localized stop words independently — but our own `sms_opt_in` toggle
  won't fire on "PARAR/AYUDA", so flag as a known minor drift.

---

## Workstream G — SMS cost / encoding (~0.5 day)

**Audit finding:** accented chars (á, ã, ç, ñ, é) force Twilio UCS-2 → **70-char segments
instead of 160**, ~3× cost + more splits. No encoding awareness today (`_shared/sms.ts`).
- Add `smart_encoded: true` (or awareness) in `_shared/sms.ts` where the Twilio POST is built.
- Re-check char budgets that assume GSM-7: `send-sms-reminders:318` (155-char),
  `habit-sms-response:432` (480-char). Consider tighter caps for accented locales, or accept
  the cost explicitly and budget for it.

---

## Workstream E — Set language (two surfaces, ~0.5 day)

Both write `profiles.preferred_language`:
- **User self-service** — selector in `src/pages/Profile.jsx`.
- **Admin override** — selector in `src/pages/AdminUserDetail.jsx` (now tabbed — put it on the
  Overview or a settings row), to set the pilot cohort by hand.

---

## Minor / deferred (note, don't block)

- Day-name arrays / `en-US` formatting leak English into localized copy —
  `generate-weekly-digest/assembleMarkdown.ts:181`, `sms-backup-plan:183`,
  `send-confidence-check`, `send-welcome-tour-sms`, `sms-add-habit`; locale-map when
  convenient.
- Mid-conversation language switch → code-switching in stateful sessions
  (`sms_reflection_sessions`, `sms_backup_sessions`). Rare; accept for Phase 0.
- AI occasionally ignores the directive (esp. when the user writes English). Cosmetic except
  for safety (covered by Workstream S backstops + Eric review).
- Tracker PDF scaffolding stays English (glyphs render fine via embedded Inter).
- Add a `language` prop to PostHog `identify` so es/pt-BR funnels are measurable.
- Guides/`user_resources` recommended inside coaching are English content — recommending
  English articles in Spanish coaching is an unaddressed content gap (Phase 1).

---

## Sequence

1. **Workstream S (crisis/safety)** → deploy. Eric reviews patterns + resources per language. **(gate)**
2. **Workstream A** (migration + narrow-select audit + helper) → deploy migration.
3. **Workstreams B + C** (surgical AI loop + inbound) — gets a working in-language coaching
   conversation.
4. **Workstream D** (bounded static) → Eric review per language.
5. **Workstreams F + G** (signup-path + SMS encoding).
6. **Workstream E** (language pickers) → enroll a small es and/or pt-BR cohort.
7. Run a few weeks; measure engagement/follow-through vs. English baseline. Decide Phase 1
   (full UI i18n, full email suite, guides content).

## Effort

~5–7 engineering days for S/A/B/C/E/F/G (the reusable machine, built once, serves both
languages), plus **two** Workstream-D translation passes (es, pt-BR — each bounded) with
Eric's review. es and pt-BR passes are independent and parallelizable.

## Deploy reminders (from CLAUDE.md)

- Internal-only edge functions touched here (`habit-sms-response`, `sms-reflection-response`,
  `sms-backup-plan`, `twilio-webhook`, `sms-add-habit`, `sms-motivation-checkin`,
  `generate-motivation-batch`, `send-*` cron fns) **must redeploy with `--no-verify-jwt`**.
- Migration must keep a unique `YYYYMMDD` prefix.
- When querying `weekly_habits`, keep `.is('archived_at', null)`.
