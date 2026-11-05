# Intro Talk Track — Instagram Video (~90s)

> Written by Eric, 2026-11-01. Source material for an Instagram intro video.
> Also mined for `/coaching` page copy the same day — see
> [`positioning-lead-with-eric.md`](./positioning-lead-with-eric.md) for how.
> If this track changes for the video, the page copy drifts from it; re-sync by
> hand, there's no single source of truth linking them.

## Hook: the doubt

> "Most guys I talk to don't think they need a coach."
> "Honestly? I get it. You've figured out everything else on your own."
> "But your 40s aren't your 30s. And the old playbook stops working."

## Who I am

> "I'm Coach Eric. Board-certified health and wellness coach. Trained through Mayo Clinic."
> "Before that, 12 years designing healthcare products. My job was making hard things simple."
> "Turns out that's most of coaching."

## My story: gradual, not dramatic

> "I didn't have a rock bottom moment."
> "Just a lot of foggy mornings. Waking up feeling off. Getting down on myself."
> "Slowly, it added up to: I don't want this anymore. I can do better."

## I do the work

> "So I started experimenting. Lifting. Running. Growing my own food."
> "Some of it worked. Some of it didn't. That's the point."
> "I'm still experimenting. I just know what to look for now."

## The plan

> "Now I take everything I've learned and pour it into a 12-week plan."
> "Three parts. Understand: what's actually getting in your way. Stack: small
> habits, backed by science. Believe: the mental game."
> "That last one matters most. Old habits fight back. Self-doubt shows up."
> "I give you tools to fight back. Think of it as updating your operating system."

## Close

> "A coach isn't someone barking orders. It's someone in your corner."
> "If that sounds useful, book a free discovery call. Link's below."

## What's new here, relative to what was already on the page

- **12 years designing healthcare products, before coaching.** Not anywhere on the
  site before this. Explains Eric's specific angle — a product designer's instinct
  for making hard things simple, applied to behavior change — rather than "another
  certified coach."
- **"No rock bottom moment. Foggy mornings."** More specific and more honest than
  the placeholder STORY draft that was on the page before this (built from a bare
  wireframe comment, not Eric's own words). Supersedes it.
- **"Updating your operating system."** A sharp, fresh name for what Phase 3
  (Believe) does. Folded into `PROGRAM.phases[2].body` in `coaching.ts`.
- **The doubt hook** ("most guys don't think they need a coach... I get it") is an
  objection-handling beat not previously on the page.

## The therapy question (raised separately by Eric, same conversation)

Eric asked whether to add that therapy was another area he explored for his own
mental health — specifically the insight that he didn't have to listen to every
voice in his head, especially negative self-talk, which is why he focuses so much
on the mental game of performance. He was explicit: not offering therapy, just
mental strategies to stay consistent, drawn partly from that exploration.

That instinct — frame it as the mental-game insight, not as therapy itself — is the
right line, and it matches the existing clinical guardrail already governing
Summit's AI coach (`freebies/summit-weekly-reflection/references/clinical-guardrail.md`):
stress coaching stays at reframing sticky thoughts and unhooking from them, never at
diagnosing or treating. The same boundary applies to Eric's own public voice, and
arguably more strictly, because this is a credentialed coach speaking in his own
name rather than a chatbot. NBHWC's scope of practice is explicit that coaching is
not therapy and a coach should not present it as a substitute for one.

What shipped in `STORY.body` (2026-11-01): one line naming that doing his own inner
work, therapy included, is where the self-talk insight came from, immediately
followed by the boundary Eric stated himself (mental game, not mental health
treatment). See the comment above `STORY` in `coaching.ts` for the exact wording
and the reasoning. **This is a personal disclosure Eric is making about himself,
not a service claim about coaching** — that distinction is what keeps it on the
right side of the guardrail, and it should stay that way through any future edit.
