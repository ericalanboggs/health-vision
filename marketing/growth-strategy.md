# Summit Health — Growth & Engagement Strategy

> Last updated: 2026-04-01

---

## The Three Audiences

Summit's growth engine needs to serve three distinct groups, each with different intent, trust levels, and touch cadences:

| Audience | Who They Are | Goal | Primary Channel |
|----------|-------------|------|-----------------|
| **Cold Leads** | Non-users who've never signed up | Capture email/phone, build trust, convert to trial | Landing pages, content, social |
| **Warm Leads / Inactive Users** | Signed up but churned, trial expired, or never completed onboarding | Re-engage, remind of value, convert to paid | Email, SMS (if opted in) |
| **Active Users** | Subscribed, using the product | Retain, deepen engagement, activate as referral channel | In-app, SMS, email digests |

The funnel is: **Awareness → Capture → Activate → Retain → Refer**. Right now, Summit has strong Activate and Retain infrastructure (SMS coaching, reflections, digests) but thin Awareness, Capture, and Refer layers. This plan addresses that.

---

## 1. Cold Lead Capture (Non-Users)

### Current State
- Tech Neck landing page (`/tech-neck`) is the only lead capture mechanism
- No way to capture an email without creating a full account
- No newsletter, no content hub, no lead magnet outside the $1 challenge

### Strategy: Give Before You Gate

The goal is to build an email list of health-curious people who aren't ready to commit to a subscription but are open to learning. Every touchpoint should deliver value first and pitch second.

### Tactics

**A. Lead Magnet Landing Pages**

Create 2-3 standalone pages (like `/tech-neck`) for specific pain points. Each captures email + first name in exchange for a free resource. No account creation required — just an email list entry.

Ideas:
- **"5-Minute Morning Reset" guide** — downloadable PDF or 5-day email series for people who want a better morning routine. Ties directly to the Energy Masters challenge.
- **"Screen-Free Wind-Down" checklist** — targets the sleep crowd. Ties to Sound Sleepers.
- **"Stress Check: 7 Signs You Need a Reset"** — quiz-style or self-assessment. Ties to Stress-Free challenge.

Each lead magnet maps to a challenge, creating a natural upsell path: free resource → lite challenge ($1) → full subscription.

**B. Email-Only Newsletter (No Account Required)**

A lightweight `leads` or `newsletter_subscribers` table (email, first_name, source, subscribed_at, unsubscribed_at). Not tied to `profiles` or Supabase Auth.

Content: Monthly "Summit Insights" email — 1 habit tip, 1 resource link, 1 user story or data point. Short, valuable, branded. Footer always has a soft CTA: "Ready to build your own habits? Start your free trial."

This is the long game. Some people need 3-6 months of trust-building before they convert.

**C. Tech Neck as Repeatable Template**

The Tech Neck challenge proved the model: low-cost, time-boxed, SMS-delivered. Build the infrastructure to launch a new lite challenge every 4-6 weeks:
- Rotate topics: posture → sleep → stress → hydration → movement
- Each challenge is a standalone lead funnel with its own landing page
- End-of-challenge email always includes the Summit upsell + a referral ask

**D. Social Proof & Content**

Not a platform play — just enough to be findable:
- A `/stories` or `/results` page on the site with anonymized user wins (pulled from reflections with permission)
- OG image and meta tags are already set up — make sure shared links look good on LinkedIn, iMessage, etc.
- Consider a monthly LinkedIn post from Eric's personal account: "Here's what I learned coaching X people on habits this month." Founder-led content converts at early stage.

### Implementation Priority
1. Newsletter subscriber table + simple capture form (low effort, high leverage)
2. One lead magnet landing page (reuse Tech Neck template)
3. Monthly newsletter email (reuse existing Resend infra)

---

## 2. Warm Leads & Inactive Users (Re-Engagement)

### Current State
- 3-email post-trial-expiry drip (Days 1, 3, 5 after trial ends)
- Trial expiry SMS with SUMMIT50 promo code
- `last_login_at` exists but no automated re-engagement based on it
- Admin can send bulk SMS/email manually, but no automated win-back flows

### Strategy: Segment by Drop-Off Point, Then Re-Engage

Not all inactive users are the same. Someone who never finished onboarding needs a different message than someone who used the app for 3 weeks and stopped.

### User Segments

| Segment | Definition | Re-Engagement Approach |
|---------|-----------|----------------------|
| **Abandoned Signup** | `profile_completed = false` | "You started something" — finish setup nudge |
| **Onboarded, No Habits** | `onboarding_completed = true`, 0 rows in `weekly_habits` | "Let's pick your first habit" — guided habit setup |
| **Trial Expired, Never Paid** | `trial_ends_at` < now, no active subscription | Existing drip + extend with a 30-day check-in |
| **Churned Subscriber** | `subscription_status = 'canceled'` or `deleted_at` is set | Win-back offer at 30 and 90 days |
| **Inactive Active** | Paying but `last_login_at` > 14 days ago | "We miss you" + highlight what they're missing |

### Tactics

**A. Automated Lifecycle Emails (Extend Existing Drips)**

The current post-trial drip stops at Day 5. Add:
- **Day 14:** "What held you back?" — short, personal, asks a single question. Replies go to Eric's inbox. The goal isn't conversion, it's intel.
- **Day 30:** "Your habits are still here" — show them what they set up (pull from `weekly_habits`). Personalized, not templated.
- **Day 60:** Final soft touch. "We've been building. Here's what's new since you left." Link to a changelog or update page.

**B. Abandoned Onboarding Recovery**

Users with `profile_completed = false` or `onboarding_completed = false` who signed up 48+ hours ago should get a nudge:
- Email: "You're one step away from your health vision" — direct link to resume where they left off
- If SMS opted in: a single text. "Hey {{name}}, your Summit setup is waiting. Pick up where you left off: [link]"

**C. "We Miss You" for Inactive Subscribers**

Paying users who haven't logged in for 14+ days are at churn risk. A weekly cron job could flag these and send:
- Week 2: Friendly check-in email with their habit summary
- Week 4: SMS (if opted in): "Hey {{name}}, just checking in. Your [habit_name] streak was at X days. Want to pick it back up?"
- Week 6: Personal email from Eric (or admin-triggered)

**D. Win-Back for Churned Users**

The `deleted_at` soft-delete and `/welcome-back` page already exist. Add:
- 30-day post-churn email: "We made Summit better since you left" — highlight 2-3 improvements
- 90-day post-churn email: "Start fresh" — offer a new trial or discount
- These should be one-time, not loops. Respect the exit.

### Implementation Priority
1. Segment users by drop-off point (SQL query, surface in admin dashboard)
2. Abandoned onboarding email (48h trigger — high-intent, easy win)
3. Extend post-trial drip to Day 14 and Day 30
4. "We miss you" cron for inactive subscribers

---

## 3. Active User Retention & Referral

### Current State
- Weekly digests, SMS coaching, reflections — strong engagement loop
- No referral program at all (admin-only invites via `pilot_invites`)
- Tech Neck CTA in the March email was the first referral ask
- No in-app referral mechanism

### Strategy: Make Sharing Effortless and Rewarding

Active users are the highest-leverage growth channel at this stage. A single user who refers 2 friends is worth more than any ad spend. But people won't refer unless (a) they're genuinely happy and (b) sharing is frictionless.

### Tactics

**A. Referral Program (Keep It Simple)**

Don't over-engineer this. Phase 1:
- Each user gets a unique referral link: `summithealth.app/join/[code]`
- When someone signs up via that link, both parties get something: referrer gets 1 month free (or a free coaching session), new user gets an extended trial (14 days instead of 7)
- Track in a `referrals` table: `referrer_id`, `referred_id`, `code`, `status`, `rewarded_at`
- Surface in Profile: "Share Summit" card with the link + copy button

Phase 2 (later):
- Referral leaderboard or milestone rewards ("Refer 3 friends, unlock Premium for a month")
- But don't build this until Phase 1 proves people will share at all

**B. Shareable Moments**

Create natural "share triggers" at emotional high points:
- **After a reflection:** "You completed 4 weeks of reflections. Share your streak?" → generates a branded image or link
- **Challenge completion:** "You finished the Stress-Free Challenge!" → share card with a CTA for their friends
- **Milestone SMS:** "You've logged habits for 30 days straight. That puts you in the top 10% of Summit users." — pride moment, natural share trigger

These don't need a formal referral program. Even a "Send this to a friend" text link at the right moment works.

**C. Monthly "State of Your Habits" Email**

Beyond the weekly digest, a monthly email that zooms out:
- Habits tracked this month vs. last month
- Longest streak
- Most consistent day of the week
- One insight from their reflection data
- Footer: "Know someone who'd benefit from this? [Share Summit]"

This doubles as retention (people love seeing their data) and a referral touchpoint.

**D. NPS / Feedback Loop → Testimonial Pipeline**

After 30 days of active use, ask:
- "On a scale of 1-10, how likely are you to recommend Summit to a friend?"
- 9-10: Immediately ask for a testimonial or offer the referral link. These people are your advocates.
- 7-8: Ask "What would make it a 10?" — product feedback gold.
- 1-6: Ask "What's not working?" — churn prevention.

This can be an email or an in-app modal. The key is timing: ask when they have enough experience to have an opinion, not during onboarding.

**E. Community & Word-of-Mouth Seeds**

At 18 users, you don't need a community platform. But you can plant seeds:
- Invite active users to a small group text or Slack: "Summit Founders Circle" — 10-15 engaged users who get early access to features and give feedback
- This creates ownership and loyalty. These people become organic evangelists.
- Low-tech, high-touch. Eric can run this manually for now.

### Implementation Priority
1. Referral link system (table + unique codes + tracking)
2. "Share Summit" card on Profile page
3. Post-challenge and milestone share moments
4. NPS email at Day 30

---

## Touch Cadence Framework

The risk at early stage is over-communicating or under-communicating. Here's a framework:

### Active Users (Subscribed, Logging Habits)
| Channel | Cadence | Content |
|---------|---------|---------|
| SMS reminders | Daily (per their schedule) | Habit tracking prompts |
| SMS followups | Daily (at their preferred time) | Completion check-ins |
| SMS synthesis | Weekly (Friday) | Top habit highlight |
| SMS reflection | Weekly (Sunday) | Guided reflection conversation |
| Email digest | Weekly | Habit summary + resources |
| Email update | Monthly | Product updates, data summary, referral CTA |
| NPS / feedback | Once (Day 30) | Satisfaction check |

### Trial Users (First 7 Days)
| Channel | Cadence | Content |
|---------|---------|---------|
| Welcome email | Day 1 | Founder letter |
| Onboarding drip | Days 2-7 | Educational sequence |
| SMS coaching | Daily (if opted in) | Habit prompts |
| Trial expiry SMS | Day 8 | Farewell + promo code |

### Post-Trial / Churned
| Channel | Cadence | Content |
|---------|---------|---------|
| Post-trial drip | Days 1, 3, 5 | Existing sequence |
| Extended follow-up | Days 14, 30, 60 | Personal check-ins (NEW) |
| Win-back | Days 30, 90 post-churn | "We've improved" + offer (NEW) |

### Cold Leads (Newsletter Only)
| Channel | Cadence | Content |
|---------|---------|---------|
| Newsletter | Monthly | 1 tip + 1 resource + 1 story + soft CTA |
| Lead magnet drip | Days 1, 3, 5 after download | Related content + trial CTA |

### The Golden Rule
**Never send more than one "ask" per week.** Tracking prompts and coaching don't count — those are the product. But marketing emails, referral asks, feedback requests, and upgrade nudges should be spaced so users never feel sold to.

---

## Metrics to Track

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Lead capture rate | Newsletter signups / landing page visits | 15-25% |
| Trial start rate | New trials / leads captured | 10-20% |
| Trial → Paid conversion | Paid subscriptions / trial starts | 30-50% |
| Onboarding completion | `onboarding_completed = true` / signups | > 80% |
| 30-day retention | Active at Day 30 / paid subscribers | > 60% |
| Referral rate | Users who share / total active users | 10-15% |
| Referral conversion | Signups via referral / referral clicks | 20-30% |
| Re-engagement rate | Reactivated / inactive users contacted | 5-10% |

---

## What to Build (Prioritized)

### Now (April)
1. **Newsletter subscriber table** — `newsletter_subscribers` (email, first_name, source, created_at, unsubscribed_at). Decoupled from auth.
2. **Email capture form** — simple component, deployable on any landing page or as a standalone `/subscribe` page.
3. **Abandoned onboarding email** — cron that catches `profile_completed = false` after 48h.
4. **Extend post-trial drip** — add Day 14 and Day 30 emails.

### May
5. **Referral system** — `referrals` table, unique codes, "Share Summit" UI on Profile.
6. **Lead magnet landing page** — one new topic (sleep or stress), reuse Tech Neck template pattern.
7. **Monthly newsletter** — first edition to cold leads + all users.

### June
8. **NPS email** — Day 30 trigger, route responses by score.
9. **Inactive subscriber alerts** — cron for 14-day no-login, automated "we miss you" email.
10. **Shareable milestone moments** — post-challenge and streak share cards.

### Later
11. **Win-back campaigns** — 30/90 day post-churn emails.
12. **Rotating lite challenges** — new topic every 4-6 weeks.
13. **Founders Circle** — curated group of top users for feedback + advocacy.

---

## Key Principle

At 18 users, every interaction is personal. The advantage over larger platforms is that Eric can reply to every email, text every user, and build genuine relationships. The strategy should amplify that personal touch, not replace it. Automation handles the cadence; the founder handles the connection.

Scale the infrastructure now so it's ready when the user base grows, but never let the automation feel impersonal at this stage. Every email should feel like it came from a person — because it did.
