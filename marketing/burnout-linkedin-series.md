# Burnout — founder-led LinkedIn series

*Organic wedge for the `/burnout` funnel (paid skipped — see `paid_ads_learnings`).
Voice: `ERIC_VOICE.md` (Eric, first person). Audience: mid-to-senior knowledge workers
on fumes. Strategy: give the method away, earn trust, let the guide be the soft CTA.
Only posts 3 and 5 carry a link — the rest are pure value so the feed doesn't read as
a funnel. Guide link: `go.summithealth.app/burnout` (posts tag `?source=linkedin-post3`
/ `-post5` so opt-ins are attributable per post). Cadence: ~1/week, in order.*

**Each post cites one real, relatable study** (Eric's standing preference — cite sources
and data). Full source list at the bottom of this file. Voice rule: name the finding,
nod to it, move on — no academic throat-clearing.

**Track opt-ins** (Supabase SQL editor):
```sql
select source, count(*) leads, max(created_at) latest
from freebie_leads
where freebie_slug = 'burnout-guide'
group by source order by leads desc;
```
Watch for `source = 'linkedin-post3'` / `'linkedin-post5'`.

---

## Post 0 — Founder update / who Summit is for (no link)

*Lead-in to the series. Founder-in-public: where the build is, and the pattern that's
clarifying who Summit is for. Ties all three doors together (approaching-40, postpartum,
burnout) and tees up the posts that follow. No study cited here on purpose — the evidence
is Eric's own pilots. Optional: drop a real number into the "paying members" line if you
want to be concrete (left qualitative so nothing overstates).*

Hi all — really excited to share where Summit is. It's been a little while since I've said much, and I've been heads-down.

One phrase has been guiding a lot of it: meet people where they are. I keep coming back to it, and honestly it's taught me more about who Summit is for than anything on a whiteboard did.

Here's what I mean. When you run pilots and start getting paying members, you begin to see who it really clicks for. Early on you tell yourself it's "anyone who wants to be healthier." But that's not really a person — and I think trying to build for everyone is part of why some folks drifted off early.

What I've found is a pattern. The people it clicks for tend to be at a similar moment — a point where the way they'd always done things quietly stopped working. A few keep showing up:

- Folks coming up on 40, where the body starts keeping score and the numbers talk back a little.
- New moms, six months to a few years in, trying to find themselves again in a life that runs on everyone else.
- High-output people who are good at the job but burned out, and not so sure anymore what it's all for.

Different lives, but the same thing underneath. They've all tried the plans, the apps, the willpower resets. And those didn't fail because they weren't trying. They failed because each one was really just one more thing to manage.

What I'm finding actually works is smaller, and more human. One small habit at a time. A little support on the ordinary days. Something that actually asks what matters to you. That's what I've been building toward — and getting clear on who it's for has changed how I think about all of it.

I'll have more to say on each of these groups soon. And if you're one of them, my guess is you already know it.

---

## Post 1 — The reframe (no link)

Burnout isn't a stamina problem.

I used to think it was. If I was this tired, I must not be tough enough. Just push harder, sleep less, catch up on the weekend.

Then I looked at the data. Gallup surveyed 7,500 full-time employees and found about two in three feel burned out at least sometimes. And the top causes weren't personal — unmanageable workload, unreasonable time pressure, unfair treatment. Not "wasn't disciplined enough." Not once.

That reframed it for me. Burnout isn't your body running out of gas. It's a signal — your days stopped matching what you actually care about.

You're not weak. You're spending all your energy on things that aren't yours.

The fix isn't more grit. It's getting a little of your life pointed back at what it's for.

That's a different problem. And a much more solvable one.

*(Source: Gallup, "Employee Burnout: The 5 Main Causes.")*

---

## Post 2 — The good-at-your-job trap (no link)

The reason you're burned out is that you're good at your job.

I used to think that was just a feeling. Turns out there's research on it.

Harvard Business School and Wharton researchers spent two decades studying how work actually gets distributed. What they found: at most companies, 20 to 35% of the valuable collaboration comes from just 3 to 5% of people. A tiny group carries a wildly outsized share.

And here's the trap. Being that person is a reward and a sentence at the same time. You're reliable, so the work comes to you. You say yes, because saying yes is who you are. You deliver. So more comes.

Nobody's doing this to you. There's no villain. It's just a loop that rewards the exact thing that's draining you.

And the first thing to fall off the list is you. The workout. The real dinner. The eight hours.

The loop won't break itself. You're too good at feeding it. The only way out is to protect something small — before the calendar votes on it for you.

*(Source: Cross, Rebele & Grant, "Collaborative Overload," Harvard Business Review.)*

---

## Post 3 — The method, given away (LINK)

I've tried the trackers. Whoop. Fitbit. A few others.

Here's what I noticed. They're genuinely good at answering one specific question. And then you're done.

With Whoop, I was curious how my sleep, my activity, and a few habits actually added up to how I felt. Real question. It answered it — pretty fast. And then that was kind of it. What was left was the feeling of being tracked, which, honestly, I didn't love.

Fitbit was the anxious one. Some stress, a racing heart, and half of what I wanted was just to know I was okay. It told me. My heart rate was fine — dropped when I was stressed, sometimes, which was genuinely interesting. Question answered. And I was done being tracked.

Here's the thing none of them did. Not one ever asked what actually matters to me. They measure you. They don't support you. And when your questions change — and they do — a tracker just keeps tracking.

What I needed was something more human. A two-way thing that moves with me as I evolve. A tracker hands you a number. It can't hand you a life pointed back at what it's for.

That starts with a method that's about you, not your data:

1. Pick one thing you've lost. Not the whole list. One.
2. Shrink it until it's almost too small to skip. A walk after the last meeting. Laptop shut by 9.
3. Anchor it to something you already do. Across more than 90 studies, deciding exactly *when and where* a small action happens — tied to a cue you already hit — is one of the most reliable ways to follow through. The cue does the remembering, not your willpower.
4. Run it a week. Add the next only when the last one holds.

And if it feels slow — the research on habit formation found a median of 66 days to stick, ranging from 18 to 254. Slow isn't you failing. Slow is why it survives a 60-hour week.

I wrote the whole thing up — 2 pages, free, with a worksheet. Just drop your email and it's yours.

→ go.summithealth.app/burnout?source=linkedin-post3

*(Sources: Gollwitzer & Sheeran, implementation-intentions meta-analysis; Lally et al., UCL, on habit formation.)*

---

## Post 4 — Why I built the coach I wanted (no link)

I got certified as a health coach at Mayo Clinic. Then I did the thing you're not supposed to admit: I built the product I personally needed.

Because here's what I kept running into. The plans were never the problem. I knew what to do. Everyone knows what to do.

What was missing was someone in my corner on the ordinary days. And it turns out that's not a soft thing — it's measurable. In a Dominican University study, people who sent a weekly progress note to someone else hit their goals more than 70% of the time. The ones who just kept their goals in their head? 35%. Same goals. Double the follow-through, from accountability alone.

That's the whole gap. Not knowledge. Not motivation on the good days. Someone tracking the small stuff with you on the Tuesday with back-to-back meetings and no willpower left.

So that's what I built. Think of it as an assistant coach. The AI handles the daily — a nudge on the day it slips, a check-in, real adjustments when your week falls apart. It's genuinely good at that, and it shows up every single day. No app to open. No streak guilt.

But the part that makes it real is what's behind it. A human. Me, and real coaches — actually available when you want more than a text. The assistant carries the everyday. The person is what keeps it from being AI for AI's sake.

That's the two-tier idea, and I think it's where this is all going. An assistant can do a lot. Knowing a real human is genuinely in your corner is what makes you believe it.

Not to help you grind better at your job. I have no interest in that.

To help you get back to what the job was supposed to be for.

*(Source: Matthews, Dominican University, goal-achievement study.)*

---

## Post 5 — Proof, in a member's words (LINK)

I don't want to oversell what this does. So I'll let a member say it instead.

Jen came in burned out and stretched thin. Here's what she told me a while in:

"Summit helped me see what was holding me back. It gave me the tools to kickstart my path toward a more centered and healthier life."

Notice what she didn't say. Not a transformation. Not a six-week overhaul. She saw what was in the way, and she started — small, and for real.

There's a reason that works. Harvard researchers analyzed nearly 12,000 daily diary entries from people at work, looking for what actually drives motivation. The single biggest factor on people's best days wasn't a raise or a big win. It was simply making progress — even small progress — on something that mattered to them.

Small wins aren't a consolation prize. They're the engine.

That's what I want for anyone stuck on the treadmill. If that's you, the free guide is the place to start. Same method Jen used. Just an email, then it's yours.

→ go.summithealth.app/burnout?source=linkedin-post5

*(Source: Amabile & Kramer, "The Progress Principle," Harvard Business School.)*

---

## Sources (for reference / if anyone asks in comments)

- **Post 1 — burnout prevalence + causes:** Gallup, "Employee Burnout, Part 1: The 5 Main Causes" (survey of 7,500 full-time employees; ~2 in 3 burned out at least sometimes; top causes are workload/time-pressure/unfair-treatment, not individual resilience). https://www.gallup.com/workplace/237059/employee-burnout-part-main-causes.aspx
- **Post 2 — the good-at-your-job trap:** Cross, Rebele & Grant, "Collaborative Overload," Harvard Business Review, Jan–Feb 2016 (20–35% of value-added collaboration comes from 3–5% of people; collaborative load up 50%+ over two decades). https://hbr.org/2016/01/collaborative-overload
- **Post 3 — anchoring to a cue / how long habits take:** Gollwitzer & Sheeran (2006), "Implementation Intentions and Goal Achievement: A Meta-Analysis" (94 studies, 8,000+ people; if-then "when/where" plans reliably boost follow-through). Lally et al. (2009), UCL, European Journal of Social Psychology (median 66 days to automaticity, range 18–254). https://www.ucl.ac.uk/news/2009/aug/how-long-does-it-take-form-habit
- **Post 4 — accountability / support:** Matthews, Dominican University (267 participants; weekly progress notes to a friend → >70% goal success vs 35% who kept goals to themselves). https://www.dominican.edu/sites/default/files/2020-02/gailmatthews-harvard-goals-researchsummary.pdf
- **Post 5 — small wins:** Amabile & Kramer, "The Progress Principle" (Harvard Business School; ~12,000 daily diary entries; progress on meaningful work is the #1 driver of motivation, even in small steps). https://www.hbs.edu/faculty/Pages/item.aspx?num=40692

## Notes for Eric
- **Post 3 is the workhorse** — it gives the full method away and carries the link. If you only
  post one, post that.
- **Every stat above is from a primary/reputable source and verified** — safe to stand behind in
  comments. Numbers are stated conservatively (e.g. "more than 90 studies," "about two in three")
  so nothing overshoots the research.
- **Links suppress reach on LinkedIn.** Standard move: put the link in the *first comment* and
  add "(link in comments)" to the post body. Test both — you have two link posts (3 and 5) to
  compare. The `?source=linkedin-post3` / `-post5` tags let you see which post actually converted.
- **Cadence:** ~1/week, in order. The no-link posts (1, 2, 4) build the audience that makes the
  link posts convert. Don't front-load the asks.
- **Reuse:** these double as newsletter sections, a Twitter/X thread, or the founder-note block
  on the landing. Same voice, same method, same citations.
