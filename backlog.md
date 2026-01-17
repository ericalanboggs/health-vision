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
**Status:** Idea (infrastructure exists: `generate-weekly-digest` folder)
**Value:** Low-effort, high-touch. Brings users back weekly.

### Description
A Sunday summary email or SMS: "You experimented with 8 habits this week. Here's what you reflected on..." Creates anticipation and feels like a personal coach checking in.

### What to Include
- Habits attempted and experience ratings
- Key phrases from their reflection
- A prompt for the week ahead
- Encouragement tied to their vision

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

*Last updated: January 2026*
