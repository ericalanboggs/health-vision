# Health Vision Feature Backlog

A living document of feature ideas, prioritized by value. Each feature includes context, discussion, and rationale.

---

## Priority Legend

- **High**: Core to engagement/retention, should be considered soon
- **Medium**: Valuable enhancement, good for future iterations
- **Low**: Nice-to-have, consider when resources allow

---

## 1. Habit Experience Check-ins

**Priority:** High
**Status:** Idea
**Value:** Creates the core daily engagement loop currently missing from the app

### Problem
Currently habits are *scheduled* but users can't acknowledge them. The SMS says "time for your walk" but there's no closure. Without this, the app is a planner, not a companion.

### Discussion
There's a tension between "checking a box" (which can feel like tedious homework) and meaningful engagement. The solution is to shift from **"Did you do it?"** to **"How did it go?"**

| Checkbox Mindset | Learning Mindset |
|------------------|------------------|
| "Did you do it? Yes/No" | "How did it go?" |
| Measures compliance | Measures experience |
| Binary (pass/fail) | Nuanced (learned something either way) |
| Can feel like homework | Feels like self-discovery |
| Streaks = pressure | Insights = growth |

### Proposed Approach
After a habit reminder, prompt with:

```
Your morning walk was scheduled for 7am.
How did it go?

😫  Skipped it
😐  Did it, felt meh
😊  Did it, felt good
🔥  Crushed it
```

This implicitly captures completion but focuses on *experience*. Over time, the app learns "walks feel better on weekends" rather than just "completed 73% of walks."

### Alternative: Micro-reflections
A single open-text prompt after a habit:
> "One thing I noticed today..."

Richer data, more meaningful than a checkbox.

---

## 2. Progress Visualization

**Priority:** High
**Status:** Idea
**Value:** Visual progress creates motivation and loss aversion

### Description
Show users their journey visually—but emphasize *experience patterns* over streak counts.

### Discussion
Traditional streaks ("Don't break the chain!") work but can create anxiety. Consider:
- Calendar heat map colored by *how habits felt* (🔥 days vs 😐 days)
- "You've noticed more energy on days you walk" > "10 day streak!"
- Celebrate experiments, not perfection: "You ran 3 experiments this week"

### Language Matters
Instead of:
- "You completed 3/5 habits" → "You ran 3 experiments this week"
- "You missed 2 days" → "You learned what doesn't work yet"
- "Keep your streak!" → "What are you noticing?"

---

## 3. Weekly Digest

**Priority:** High
**Status:** Built (not yet automated)
**Value:** Low-effort, high-touch. Brings users back weekly.

### Description
A personalized weekly email generated via `generate-weekly-digest` edge function. Currently runs manually with coach review before sending.

### Current Features
- Loads user context (habits, vision, reflections)
- AI-generated weekly focus theme (OpenAI)
- Personalized content recommendations (Spotify, YouTube)
- Celebrates wins from reflection
- Lists habits with scheduled days
- Provides challenge strategies
- One-minute action plan
- Saved as draft for review before sending

### Suggested Enhancements
1. **"What I Noticed" insight** — AI-synthesized pattern across weeks ("You mentioned feeling tired twice, but your best days start with movement...")
2. **Connect habits to vision explicitly** — "Your morning walks are building the energy you want for your kids"
3. **Celebrate milestones** — "You've been at this for 2 weeks. That's real momentum."
4. **End with a reflection prompt** — "What's one thing you could let go of this week?"
5. **TL;DR summary at top** — For skimmers: focus + one strategy + one content pick
6. **"Reply to this email" CTA** — Invite engagement when automated

---

## 4. AI-Powered Reflection Insights

**Priority:** High
**Status:** Idea (OpenAI integration already exists)
**Value:** Differentiator from generic habit apps. Feels like having a personal coach.

### Description
After 2-3 weeks of reflections, AI surfaces patterns:
- "You mentioned 'tired' 3 times—consider adjusting evening habits"
- "Your best days seem to be when you start with movement"
- "Here's what I've learned about you over 3 weeks..."

### Why It Matters
This is where Health Vision stands apart from Habitica, Streaks, etc. The reflection data is gold—most apps don't have this qualitative input.

---

## 5. Progress Sharing Cards

**Priority:** Medium-High
**Status:** Idea
**Value:** Organic acquisition channel. Users become ambassadors.

### Description
Pre-designed, visually appealing images summarizing a user's journey—formatted for sharing on social media or messaging.

### Discussion
The instinct is to share stats ("I completed 9/12 habits!") but this reinforces checkbox thinking. Better to share *learnings* and *stories*:

| Stats-Based (Tedious) | Learning-Based (Meaningful) |
|-----------------------|----------------------------|
| "I completed 9/12 habits" | "This week I learned morning movement sets my whole day up better" |
| "5-day streak!" | "Small win: I chose the stairs twice without thinking about it" |
| "Week 2 done" | "My summit: feeling strong enough to hike with my kids" |

### Shareable Moments That Feel Authentic
- **Vision statement**: "My summit is feeling confident in my body again"
- **Weekly insight**: "I discovered I'm a morning person when I actually try"
- **Small win**: "Walked 3 days this week after not exercising for 2 years"
- **Commitment**: "Next week I'm experimenting with meal prep Sundays"
- **The metaphor itself**: "I'm climbing my health summit" — intriguing, invites conversation

### Example Card Concept
```
┌─────────────────────────────────────┐
│            🏔️ SUMMIT PILOT          │
│                                     │
│  "This week I learned that morning  │
│   walks set my whole day up better" │
│                                     │
│         — Week 2 Reflection         │
│                                     │
│    summit-pilot.vercel.app          │
└─────────────────────────────────────┘
```

---

## 6. Celebration Moments

**Priority:** Medium
**Status:** Idea
**Value:** Low effort, high emotional payoff. Makes users *feel* successful.

### Description
Micro-celebrations when milestones hit:
- First habit logged
- First week complete
- First reflection written
- Tried something new

### Implementation
Could be as simple as a confetti animation + encouraging message. Doesn't need to be elaborate.

---

## 7. Daily Micro Check-in

**Priority:** Medium
**Status:** Idea
**Value:** Creates daily touchpoint without friction. Feeds AI insights.

### Description
One-tap "How are you feeling today?" (1-5 scale or emoji). Takes 2 seconds. Builds the "open app daily" habit.

### Consideration
Could be combined with Habit Experience Check-ins (#1) rather than a separate feature.

---

## 8. Re-enable Content Recommendations

**Priority:** Medium
**Status:** Infrastructure exists (currently disabled)
**Value:** Gives users a reason to browse. "Netflix for health content" feeling.

### Description
Personalized podcasts and articles based on their vision, barriers, and interests. The data model already supports this.

---

## 9. Adaptive Goal Suggestions

**Priority:** Medium
**Status:** Idea
**Value:** Makes app feel alive and responsive to user's journey.

### Description
AI reviews reflections and habit patterns, then suggests:
- "You've nailed morning walks. Ready to add 5 minutes?"
- "Struggling with Wednesdays? Consider moving to Thursday"
- "You mentioned wanting more energy—try this..."

---

## 10. Accountability Buddy Pairing

**Priority:** Medium
**Status:** Idea
**Value:** Social proof + gentle accountability. High engagement but adds complexity.

### Description
Optional opt-in to be paired with another pilot user. Weekly SMS: "Your buddy Sarah experimented with 5 habits this week!"

### Considerations
- Privacy concerns
- Matching algorithm
- What if buddy drops out?
- Could start simple: just share that someone else is on the journey too

---

## 11. Push Notifications (Web)

**Priority:** Medium-Low
**Status:** Idea
**Value:** Reduces SMS costs. More flexible timing.

### Limitations
- Requires browser permission
- Doesn't work when browser closed
- Good supplement to SMS, not replacement

---

## 12. Voice Memo Reflections

**Priority:** Medium-Low
**Status:** Idea
**Value:** Lowers friction for some users. Differentiating.

### Description
"Tell me about your week" → transcribe with Whisper API. Some users prefer talking over typing.

---

## 13. Live Calendar Sync

**Priority:** Medium-Low
**Status:** Idea (ICS download exists)
**Value:** Removes friction for calendar-oriented users.

### Description
Two-way sync with Google/Apple Calendar. Habits appear as calendar events.

### Considerations
Technically complex, requires OAuth flows for each provider.

---

## 14. Health App Integrations

**Priority:** Low
**Status:** Idea
**Value:** Auto-logging is convenient but high technical lift.

### Description
Connect to Apple Health, Google Fit, Fitbit. Auto-log walks, sleep, etc.

### Considerations
- Platform-specific implementations
- Not essential for behavior change philosophy
- Could feel like surveillance rather than support

---

## 15. Community Forum

**Priority:** Low
**Status:** Idea
**Value:** Shared experiences, but high overhead.

### Description
Shared experiences, Q&A, success stories.

### Considerations
- High moderation overhead
- Risk of low engagement in small pilot
- Better suited for post-pilot scale

---

## 16. Context Import → Custom Habit Plan

**Priority:** High
**Status:** Idea (added 2026-04-26)
**Value:** Turns Summit from "habit tracker" into "recovery / care companion." Likely the highest-leverage feature for users with a real diagnosis or program they're following.

### Problem
Users arrive with rich context — a doctor's care summary, a book they're following (Outlive, Bredesen, Atomic Habits), a coach's program, a wearable's recommendations. Today none of that informs Summit's habit suggestions; users have to translate their plan into habits themselves, and most don't.

### Proposed Approach
A new `/context-import` flow:
1. User pastes (or uploads) a written summary of what they're working on — care plan, book pillars, program structure, etc.
2. AI (gpt-4o-mini) extracts: goals, restrictions, focus areas, timing patterns
3. AI proposes 3–5 candidate habits with reasoning ("Because your doctor mentioned BP awareness, here's a daily morning BP check…")
4. User reviews each, accepts/edits/rejects
5. Accepted habits go through normal habit creation flow (frequency, days, tracking type)

This is a generalization of the **Custom Challenge Builder** concept from the earlier "future of AI" brainstorm — care summary is one input flavor among several.

### MVP path that sidesteps PHI custodianship
**Don't accept clinical files directly in v1.** Have the user paste their plan **in their own words** ("Here's what my doctor wants me to focus on…"). This is user-generated content, not PHI custodianship — sidesteps HIPAA/BAA overhead while capturing 80% of the value.

If clinical-document support becomes a real ask, it requires:
- BAA with OpenAI (standard API does NOT include one — Enterprise tier or Azure OpenAI required)
- BAA with Twilio, Resend
- Encrypted-at-rest PHI storage with audit logs
- Compliance review

### Liability framing
- Frame outputs as "supportive habits inspired by what your care team mentioned" — never "treatment" or "medical advice"
- Always-visible "talk to your doctor before making changes" disclaimer
- AI is hard-prohibited from suggesting changes to medications, dosages, or anything clinical
- Habits only; never timing/dosage tweaks

### Considerations
- Could replace or complement the 5 hardcoded challenges over time
- Imported context could also feed into the existing AI coaching (richer system prompt)
- Re-import flow when the user's plan changes (post-op recovery progresses, doctor adjusts plan)

---

## 17. Wearable Integration (Behavioral Layer + Data Layer)

**Priority:** Medium — defer until post-iOS-native + niche validation
**Status:** Idea (added 2026-04-30)
**Value:** Reduces logging friction, improves data quality for AI coaching, opens "interpretation layer" positioning. Not the current bottleneck.

### Thesis
Summit is the **behavioral layer** (vision, habits, reflection, AI coaching). Wearables provide the **data layer** (sleep, HR, HRV, activity, workouts). Connecting them lets the AI know what users are doing without requiring them to log it manually — and surfaces patterns ("HRV dropped Monday, you skipped meditation Tuesday") that aren't visible in habit logs alone.

### Why not yet
- Current bottleneck is distribution + niche refinement, not data input friction. Pre-optimization risk.
- Data ≠ behavior change. Whoop users have data and still don't change. Summit's edge is the coaching loop, not the dashboard — over-pivoting toward "biometric dashboard" makes Summit a reporting tool for wearable companies, not a behavior change platform.
- Wearable integration pulls toward "needs iPhone + app installed." Risks bifurcating the SMS-first product (which works on a flip phone today).
- Third-party APIs (Whoop, Garmin, Oura) churn. Maintenance cost compounds.
- Biometric data has stricter handling requirements than habit logs (BAA review, possible HIPAA).

### Sequenced approach when ready

**Phase 1 — Apple Health (HealthKit), via iOS native app**
- Single integration covers steps, sleep, HR, HRV, workouts, mindful minutes
- Apple Health acts as a **hub** — users with Whoop / Oura / Fitbit / Garmin typically also have those connected to Apple Health, so one integration indirectly reaches many wearables
- Requires the iOS Native Conversion (separate doc) to ship first
- Cleanest leverage: one integration, broad coverage

**Phase 2 — Strava** (optional smaller proving ground)
- Public OAuth, well-documented, no app needed
- Narrow scope (workouts only), but cheapest pattern test: OAuth flow, daily data sync, mapping `activity` → `habit completion`
- ~2–3 weeks of work; useful to validate the integration pattern before Phase 1 if iOS app is delayed

**Phase 3 — Direct vendor APIs (Whoop, Oura, etc.)**
- Add only when a specific user/cohort requests it or demand clusters around one platform
- Demand-driven > spec-driven

### Demand-driven exception
If a pilot user (Julie, future enterprise pilot, etc.) asks "can Summit talk to my Whoop?" — that's signal worth chasing, and their wearable becomes the proving-ground integration regardless of the staged plan above.

### How wearable data should map to habits
- "30 min walk" → HealthKit `walkingDistance` / `appleExerciseTime` ≥ threshold → suggest auto-complete, user confirms
- "8 hrs sleep" → HealthKit `sleepAnalysis` → auto-record metric value
- "Box breathing" / meditation → HealthKit `mindfulSession` → suggest auto-complete
- "HIIT workout" → HealthKit `workout` of HIIT-ish type → suggest auto-complete
- **Always require user confirmation initially** (data ≠ intent — a commute walk isn't an intentional walk). After N confirmations, AI can auto-complete with an undo option.

### Considerations
- BAA review for biometric data handling (stricter than habit logs)
- HealthKit entitlement + App Store review process for iOS
- Privacy disclosure: what we read, what we don't read, never sold/shared
- Wearable feed eventually enriches AI coaching context (e.g., "your sleep was poor; want to skip morning HIIT today?")
- Frame the moat: Summit becomes the **interpretation layer** between wearable data and behavior change

---

## 18. Text-Based SMS Onboarding / Activation Rescue

**Priority:** Low (premature at current scale — see finding)
**Status:** Deferred — analyzed 2026-05-28, do manually for now
**Value:** Could recover users who sign up but never add a vision or habits

### Problem
Some users complete signup but stall before adding a vision or any habits, so they never reach the core product. Two distinct framings got conflated in the original idea:

1. **Acquisition variant** — a brand-new person texts START and completes signup + first habits entirely over SMS, never opening the web app.
2. **Activation variant** — a user who already signed up on web but stalled gets a conversational SMS nudge that captures vision + first habits.

### Finding that deferred this (2026-05-28)
Pulled the actual numbers before building:

| Metric | Count |
|--------|-------|
| Signed up | 20 |
| Fully onboarded | 13 |
| Stalled (no vision OR no habits) | 4 |
| Stalled AND reachable by SMS | 4 |
| Stalled but unreachable | 0 |

The entire addressable population is **4 people** out of 20. At this scale the right response is **manual, not software**: text the 4 stalled users by hand via the existing admin SMS tool and learn *why* they stalled (currently unknown — the spec assumes "make it conversational over SMS," but the real reason could be a confusing web vision step, unclear value, or simple distraction). Building the AI parser now means tuning the hardest, most expensive piece against a sample of four. Do-things-that-don't-scale applies: manual beats automated until manual visibly breaks.

### Architecture blockers (acquisition variant only)
The brand-new-user START flow carries landmines the activation variant avoids:
- `profiles.id` is a 1:1 FK to `auth.users`, which needs email + password. SMS can't naturally capture a password.
- The web client uses PKCE, so server-generated magic links don't create valid sessions — an SMS-created user **has no working way to log into the web app** (and Stripe checkout is web-only, so the funnel dead-ends one step before revenue).
- The load-bearing fix is a secure phone→web auto-login (one-time token link). That primitive is undecided and is the hardest part. It would also unlock the lite-to-full upgrade path, so if/when this is built, build that primitive first.
- No timezone capture in the SMS flow (reminders/followups are timezone-driven; area code is unreliable).
- 10DLC compliance: the first reply to an unknown number needs opt-in disclosure (msg frequency, STOP/HELP, rates).

The **activation variant** sidesteps almost all of this: those users already have an account, password, timezone, and SMS opt-in, so account-claiming and timezone gaps vanish. It reuses ~60% of the original spec's machinery (the conversational vision + habit capture + AI parser) without the identity/compliance baggage. If this gets built, build the activation variant, not the acquisition one.

### Revisit trigger
Build the automated activation rescue when **both** hold:
1. Stalled-but-reachable users exceed ~30–50/month (personal outreach stops scaling), **and**
2. Manual outreach has confirmed that a conversational nudge actually converts stalled users (so the AI parser is solving a validated problem, not an assumed one).

Reuse targets when ready: `sms-add-habit` state machine (AI assigns days/times, SMART-goal refinement), `create-lite-enrollment` (account creation pattern, acquisition variant only), `_shared/user_context.ts` (AI context).

---

## Appendix: Acquisition vs. Retention Matrix

| Feature | Helps Acquire New Users | Helps Retain Existing Users |
|---------|------------------------|----------------------------|
| Progress Sharing Cards | Strong | Moderate |
| Streaks & Visualization | Moderate (screenshots) | Strong |
| AI Insights | Strong (differentiator) | Strong |
| Habit Experience Check-ins | Minimal | Critical |
| Buddy System | Moderate (invites) | Strong |
| Weekly Digest | Minimal | Strong |

---

## Appendix: Core Philosophy Reminders

When evaluating features, remember:

1. **Learning over compliance** — The app is about self-discovery, not homework
2. **Experiments over perfection** — Language should celebrate trying, not just completing
3. **No judgment** — Missed days are data, not failures
4. **Personal coach feeling** — AI and messaging should feel supportive, not robotic
5. **The mountain metaphor** — Features should reinforce the journey/summit framing

---

*Last updated: May 2026*
