# Summit Health: Founder Memo

**For:** Designer Fund (Mason review) · **From:** Eric Boggs, founder · **Contact:** eric.alan.boggs@gmail.com · go.summithealth.app/lifestyle-changes
**Stage:** Early, in production, first paying users · **Date:** August 2026

---

## The short version

Summit is a habit-coaching product for people approaching 40 who have had the moment where the old ways stopped working. A lab reading. A diagnosis. A family conversation. They don't want another wellness app. They want a partner to help them figure out what actually works, at their own pace.

The whole product is one design decision carried all the way through: **coaching should adapt to the person, not the other way around.** Everyone else ships the same program to everyone. Summit designs around the individual. Their pace, their why, one behavior at a time. And it lives over text, not in a dashboard you have to remember to open.

---

## The problem

Health behavior change is the largest unsolved problem in a regulated, overlooked category, and the tools for it are badly designed.

Here's what most people actually get. A doctor says "make some changes" and hands them nothing. Or they download an app that tracks everything, gamifies streaks, and quietly becomes one more thing shouting for their attention. Two weeks later the streak breaks and the app becomes a source of guilt.

The pattern isn't a willpower problem. It's a design problem. These products ask a busy 45-year-old to conform to a generic program. When the program doesn't fit their life, the person gets blamed. That isn't fair, and it doesn't work.

## Why now, and why this wins

The timing is real. AI finally makes personalized coaching affordable. A human coach who adapts to each person is the gold standard, and it has never scaled because it's expensive. Blend a coach with a language model correctly and you can give thousands of people something that *feels* individually attended to, at a price that works. At the same time, app fatigue is getting worse. The people we serve don't want a fifth health app. They want the help without the overhead. That constraint isn't a thing to design around. It's the opening.

But the timing isn't the whole reason I think Summit wins. The reason is how it's built. Four things stack:

- **A design-led foundation.** Every choice starts from the person, not the feature list. The whole product is one design decision carried through.
- **AI plus a human, felt as one.** The model does the personalization at scale; a real coach stands behind it. Neither alone works. Together they feel like one presence in your corner.
- **Personalization as the core, not a setting.** The product adapts to each person's pace, stage, and why. That's the value, and it deepens with every reflection a user gives back.
- **Design thinking as the operating method.** This is the part that compounds. I don't guess at what to build. I run the loop: watch a real user hit friction, reframe the problem, ship a small change, watch again. That's how the product got here on almost no resources, and it's how it keeps getting sharper as I grow. It's a way of working, not a phase.

That last one matters most for a fund like yours. The moat isn't a feature anyone can copy. It's a system of taste and method underneath the product that keeps producing the next right thing.

## The product, and where design wins

Summit meets people over SMS. No app to download, no dashboard to obsess over. You tell it what you're working on this week. It helps you shrink that to something small enough to actually happen, anchored to something you already do. It nudges you on the day it tends to slip. On Sunday it asks what stuck and what didn't, and next week adapts from your honest answer.

The craft is in the adaptation. Same behavior, different person, different plan:

- **Pace.** One behavior at a time, sequenced, never a do-everything-at-once list that collapses by week three.
- **Voice.** The coaching meets people where they are, without shame and without hype. We hold two separate voice systems, one for the product-as-coach and one for the founder, because tone is a feature here, not decoration.
- **Stage.** Someone still deciding whether to change gets different treatment than someone ready to act. We model that explicitly rather than pushing everyone down the same funnel.
- **Human plus AI, felt as one.** A real coach stands behind the automation. The design goal is that it feels like one presence in your corner. Warm, timely, never robotic, never absent.

None of this is visible as "AI features." It shows up as a product that feels like it was built for you specifically. That's the moat. It compounds with every reflection a user gives us, and it's very hard to copy without rebuilding the whole system of taste underneath it.

Under the hood: React and Vite on the front, Supabase edge functions and Postgres on the back, Twilio for SMS, Stripe for subscriptions, and a language model doing the personalization inside guardrails that keep it to habit mechanics, never medical advice. Built and running in production, largely solo.

## Where it stands

I'll be straight about the stage, because a padded number is worse than a small honest one.

Three paying subscribers so far, all on the $12 self-serve tier, none churned. Marginal cost to serve is about a dollar per subscriber per month. It's running in production, on zero paid acquisition, and all three came through the free trial. I've built and coached the whole thing on about six to eight hours a month.

Here's the gap I'd rather name myself than have you find. The $69 and $119 coaching tiers are live, but nobody has bought one yet. So the human half of the product, the half I just called the differentiator, is still unproven in dollars. I believe it's what people pay up for once they feel it. I haven't earned the right to say that as fact, so I won't.

Depth is where the promise shows. One founding pilot user has been active 23 weeks across 75 separate days, through work travel, sick weeks, and vacations, honest every week about what slipped. That's not an app working. That's a person building something, with Summit in their corner for it.

Early users, from an eight-person pilot, keep landing on the same word: personal. Tim, a photographer: *"By taking personal information and translating that into customized goals, it really reaches the individual on a personal level."* A postpartum mom in the group: *"Summit provided structure, easy-to-implement habits, and the support I needed to revive energy and feel more connected within."*

I'm not here claiming a hockey stick. I'm here because the thing works on the people who touch it, the design method behind it is real, and I'd rather find the right partner now than after I've bootstrapped past the interesting part.

## Market

The people who need this are not a niche. More than 130 million U.S. adults are 40 or older (U.S. Census), and that's the window where a health wake-up call reframes everything. Behavior change is the throughput problem behind most chronic conditions. Existing options split into two failing camps: generic apps with no accountability, and human coaching that's too expensive to reach most people. Summit sits in the gap, and the gap is the whole market.

We start with professionals approaching 40. The same engine already extends to two more groups we've validated demand for: parents rebuilding after a baby, and burnt-out knowledge workers. Localization into Spanish and Portuguese is in progress, which opens a health-equity wedge in markets that get ignored.

## Business model

Consumer subscription with a real ladder, priced so the design does the sorting. Three live tiers: Core at $12/month (the AI system plus weekly reflections), Plus at $69/month (adds a monthly 30-minute coaching session), and Premium at $119/month (adds a second session plus concierge texting). 14-day free trial, 7-day risk-free guarantee. There's room to go lower too, with $1 challenges and micro-courses as an almost-frictionless on-ramp.

The economics are built so the tiers map onto cost. AI carries the personalization at the bottom, where the margin is high and it scales without me. Human coaching sits on top as the premium, the part people can pay up for rather than the default that has to touch every user. Whether that pay-up holds is the thing I still have to prove, and I name it plainly above. If it does, Summit reaches a lot of people without turning into a staffing problem.

## Why me

I built Summit end to end. The product, the coaching method, the copy, the backend. I'm a Mayo Clinic-trained health coach who sat the NBHWC national board exam, results pending, so the method rests on real behavior-change science, not a hunch.

I spent twelve years designing healthcare software, including the results experience at Everly Health. That's the screen where someone learns something new about their body. We made it clearer and moved NPS fifty points, and then the product ended, and the person was left holding a number and no next step. Then I got my own numbers back. Cholesterol, blood pressure, weight. I went looking for the coach I needed and couldn't find one, so I built him.

I work the way you'd want a design-led founder to work. I don't build from a roadmap. I watch a real person hit friction, reframe what's actually wrong, ship the smallest change that could fix it, and watch again. That loop is why a solo founder on six to eight hours a month has a product in production that people pay for and stay with. Give it a team and a channel and that same method scales. The constraint right now is me, not the approach.

## The ask

I'm not walking in with a set number and a term sheet to sign this quarter. I've built Summit to be capital-efficient, and it's default-alive. What I'm looking for is the right early partner, and I think that might be you.

Here's why I mean you specifically. You back companies where design is how the company wins, in exactly the kind of overlooked, high-friction category this is. Most investors would look at Summit and see a chatbot. I need the partner who sees that *designed around the person* is the entire thesis, and that the design-thinking method underneath is the thing that compounds.

One honest note before you click around. I run two front doors right now. The general site is the old one, and it sells generic habit software. The lifestyle-changes page is the new one, built for men over 40 whose doctor just told them to change something. That page is the real company, and it's the best evidence that design is my operating method, so it's the link I'd point you to first. Pointing everything at it is the next thing I ship.

If there's a fit, funding would go toward the obvious next step: getting me out of the critical path so the method scales past one person, and turning the fact that people stay into a dependable way to reach more of them. I'd love to talk about what that looks like together.

---

*Coaching, not medical advice. Summit's claims stay at adherence and habit mechanics.*
