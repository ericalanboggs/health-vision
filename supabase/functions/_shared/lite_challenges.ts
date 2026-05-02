// Lite challenge content registry — keyed by challenge_slug.
// Edge functions read messages, themes, email copy, and routine blocks from here.
// Adding a new lite challenge = adding a new entry to LITE_CHALLENGES.

export interface DayTheme {
  title: string
  subtitle: string
}

export interface PreviewEntry {
  dayLabel: string
  theme: string
  description: string
}

export interface RoutineBlock {
  title: string
  items: string[]
  footer: string
}

export interface LiteChallenge {
  slug: string
  displayName: string         // "Tech Neck Challenge" — used in subjects + headings
  shortName: string           // "Tech Neck" — used in mid-sentence references
  brandLine: string           // Eyebrow text in emails: "5-Day Tech Neck Challenge"
  routePath: string           // "/tech-neck" — used in share URLs

  dayThemes: Record<number, DayTheme>
  messages: Record<number, Record<string, string>>
  // Per-channel overrides — only set where SMS and email content intentionally differ
  emailMessageOverrides?: Record<number, Record<string, string>>

  landingPreview: PreviewEntry[]   // Day-by-day on the landing page
  welcomePreview: PreviewEntry[]   // Forward-looking week at a glance in welcome email
  weekRecap: PreviewEntry[]        // Backward-looking recap in summary email
  routine: RoutineBlock

  welcome: {
    intro: string
    nextStep: string
  }
  summary: {
    whatsNext: string
    sharePromptHeading: string
    sharePromptBody: string
  }
}

export const LITE_CHALLENGES: Record<string, LiteChallenge> = {
  'tech-neck': {
    slug: 'tech-neck',
    displayName: 'Tech Neck Challenge',
    shortName: 'Tech Neck',
    brandLine: '5-Day Tech Neck Challenge',
    routePath: '/tech-neck',

    dayThemes: {
      1: { title: 'Environment', subtitle: 'Fix the source' },
      2: { title: 'Release', subtitle: 'Stretch what\'s tight' },
      3: { title: 'Strengthen', subtitle: 'Build what prevents it' },
      4: { title: 'Breathe & Reset', subtitle: 'Nervous system and tension' },
      5: { title: 'Your Daily Routine', subtitle: 'Something you take with you' },
    },

    messages: {
      1: {
        '8am': `Good morning. This week we're tackling tech neck — starting today with the thing that matters most: your setup. Before you dive in, take 10 seconds and notice where your screen is relative to your eyes. Is it below eye level? That gap is where tech neck starts. Today's focus: raise your screen to eye level. Even a few books under your laptop counts. Small change, big difference over 8 hours.`,
        '10am': `Quick check: where's your head right now? If your chin is drifting forward toward your screen, your screen is probably still too low. Adjust it now, even slightly. Your neck should feel neutral — not pulling in any direction.`,
        '12pm': `You've been at it for a few hours. Stand up, roll your shoulders back, and take 3 slow breaths. This isn't just a break — it's a reset. Screens pull us forward physically and mentally. Two minutes away from the desk matters more than you think.`,
        '3pm': `The 3pm slump is real, and it hits your posture first. Before you push through, check your setup one more time. Has your screen drifted? Have you slouched into your chair? One small adjustment now protects you for the rest of the day.`,
        '5pm': `Day one done. Most people are surprised how much one environmental change shifts how they feel by end of day — less pulling, less fatigue. If you noticed even a small difference, that's the signal. Tomorrow we focus on releasing the tension that's already built up. See you then.`,
      },
      2: {
        '8am': `Good morning. Yesterday you fixed your environment. Today is about undoing the damage that's already there. Most tech neck tension lives in three places: the back of your neck, your upper traps, and your chest. We're going to open all three today. Start your morning with this: slowly drop your right ear toward your right shoulder, hold 20 seconds, switch sides. That's it. You just started.`,
        '10am': `Try a chin tuck right now. Sit tall, gently pull your chin straight back (like you're making a double chin), hold 5 seconds, release. Do 5 reps. It looks silly. It works. This is the single most recommended exercise for tech neck — it reactivates the deep neck muscles that forward posture switches off.`,
        '12pm': `Chest opener time. Stand in a doorway, place both forearms on the frame, and gently lean through. Hold 30 seconds. This counters the one posture pattern that underlies almost all tech neck — a tight chest pulls your shoulders forward, which pulls your head forward. Release the chest and everything upstream gets easier.`,
        '3pm': `You've probably tightened back up since this morning — that's normal. Two moves: chin tuck (5 reps) followed by the upper trap stretch from this morning. Takes 90 seconds. Think of it as wringing out a towel that's been sitting wet all day.`,
        '5pm': `Release days have a funny effect — the tension can feel more noticeable once you start working with it, not less. That's not a setback, that's awareness. Your body is recalibrating. Tomorrow we shift from releasing to building, which is where the real prevention starts. See you in the morning.`,
      },
      3: {
        '8am': `Good morning. The first two days were about fixing your environment and releasing tension. Today is about building the strength that makes tech neck less likely to come back. The muscles that hold your head up — deep neck flexors, mid-back, rear shoulders — weaken when we sit for long stretches. Today we start waking them up. First move of the day: 10 scapular retractions. Sit tall, squeeze your shoulder blades together like you're pinching a pencil between them. Hold 3 seconds, release. That's your anchor for today.`,
        '10am': `Check your posture right now. Shoulder blades back and down, chin neutral. Hold it for 30 seconds consciously. Strength isn't just about exercise — it's about training your body to find this position automatically. Every time you reset today, you're reinforcing that pattern.`,
        '12pm': `Try a wall angel. Stand with your back flat against a wall, arms at 90 degrees like a goalpost, slowly slide them overhead and back down. Keep your lower back and head touching the wall the whole time. 8 slow reps. It's harder than it sounds, which tells you exactly which muscles have been underworking.`,
        '3pm': `10 more scapular retractions. Same as this morning. By now your mid-back may feel mildly fatigued — that's the right muscles finally doing their job. Pair it with a chin tuck from Tuesday and you've got a 60-second combo that addresses both strength and alignment.`,
        '5pm': `Strengthening work is quieter than stretching — you won't feel an immediate release. But this is the layer that makes the other habits stick. The body holds better posture when it actually has the capacity to. Tomorrow shifts gears entirely. See you in the morning.`,
      },
      4: {
        '8am': `Good morning. Three days in, your environment is better, you have release and strength tools in your kit. Today is different. A lot of tech neck isn't just mechanical — it's tension that lives in the body because of stress, focus, and the low-grade intensity of screen work. Today's focus is your nervous system. Start here: 4 counts in through your nose, hold 4, out through your mouth for 6. Do that three times right now. Notice your shoulders drop on the exhale. That's not coincidence.`,
        '10am': `Most people unconsciously hold their breath or breathe shallowly during focused screen work. It keeps the nervous system in a mild stress state, which keeps the neck and shoulders braced. Next time you catch yourself tense, the first tool isn't a stretch — it's three slow breaths. Let the body downshift before you move it.`,
        '12pm': `Step outside if you can, even for five minutes. Natural light, a change of environment, and movement together create a nervous system reset that no stretch quite replicates. Tech neck is partly a context problem — the body learns to brace in certain environments. Changing the scene interrupts that pattern.`,
        '3pm': `The afternoon version of today's habit: a full body scan. Start at your feet, move upward. Where are you holding tension right now? Jaw, shoulders, hands? Take one breath into each spot and consciously release on the exhale. This is a 90-second practice that travels anywhere — no equipment, no space required.`,
        '5pm': `Today's work is the hardest to measure but maybe the most important. Chronic tech neck is often chronic tension wearing a physical disguise. People who address the stress layer alongside the mechanical one tend to see faster and longer-lasting results. Tomorrow we put the whole week together into something you can actually keep.`,
      },
      5: {
        '8am': `Good morning — last day of the challenge. This week you've covered environment, release, strength, and nervous system reset. Today is about distilling that into something simple enough to actually do every day. Here's your 2-minute tech neck routine: chin tuck x5, scapular retractions x10, upper trap stretch x20 seconds each side, three slow breaths. That's it. Do it right now as a morning reset. Then do it twice more today.`,
        '10am': `The biggest predictor of whether a habit sticks isn't motivation — it's how easy it is to start. Two minutes, no equipment, can be done at your desk. The only real requirement is a trigger. For most people that's a time (like this text) or a context cue (every time you pour a coffee, every time you open your laptop). Pick yours today.`,
        '12pm': `You've now done versions of all four habits this week. Most people find one that resonates more than the others — a stretch that feels particularly good, a breathing reset that shifts something. That's the one to lead with in your daily routine. Build from your strongest point, not the full sequence.`,
        '3pm': `One more full reset before the end of the week. Run through the 2-minute routine. Think of this less as exercise and more as maintenance — the same logic as brushing your teeth. Tech neck doesn't go away permanently, but it becomes manageable when you have a daily practice that takes less time than your morning coffee.`,
        '5pm': `You finished. Five days, four habits, one problem you understand a lot better than you did Monday. The routine works. It just has to happen.\n\nKnow someone who'd benefit? Share the challenge — they start next Monday: go.summithealth.app/tech-neck`,
      },
    },

    // Email Day 5 5pm has more reflective copy than the SMS (which ends with a share CTA).
    emailMessageOverrides: {
      5: {
        '5pm': `You finished. Five days, four habits, one problem you understand a lot better than you did Monday. The routine you built this week works. The only question now is whether it becomes part of the day or fades by next week — and that's entirely a function of how simple you keep it. It doesn't have to be perfect. It just has to happen.`,
      },
    },

    landingPreview: [
      { dayLabel: 'Monday', theme: 'Environment', description: 'Fix your screen setup and workspace ergonomics' },
      { dayLabel: 'Tuesday', theme: 'Release', description: 'Stretch and release built-up neck and shoulder tension' },
      { dayLabel: 'Wednesday', theme: 'Strengthen', description: 'Build the muscles that prevent tech neck from returning' },
      { dayLabel: 'Thursday', theme: 'Breathe & Reset', description: 'Address the stress and nervous system tension underneath' },
      { dayLabel: 'Friday', theme: 'Your Routine', description: 'Combine everything into a 2-minute daily practice' },
    ],

    welcomePreview: [
      { dayLabel: 'Monday', theme: 'Environment', description: 'Fix your workspace setup' },
      { dayLabel: 'Tuesday', theme: 'Release', description: 'Stretch out neck and shoulder tension' },
      { dayLabel: 'Wednesday', theme: 'Strengthen', description: 'Build muscles that prevent tech neck' },
      { dayLabel: 'Thursday', theme: 'Breathe & Reset', description: 'Address the tension underneath' },
      { dayLabel: 'Friday', theme: 'Your Routine', description: 'Your 2-minute daily practice' },
    ],

    weekRecap: [
      { dayLabel: 'Monday', theme: 'Environment', description: 'raised your screen, fixed your setup' },
      { dayLabel: 'Tuesday', theme: 'Release', description: 'neck stretches, chin tucks, chest openers' },
      { dayLabel: 'Wednesday', theme: 'Strengthen', description: 'scapular retractions, wall angels' },
      { dayLabel: 'Thursday', theme: 'Breathe & Reset', description: 'breathing exercises, body scans' },
      { dayLabel: 'Friday', theme: 'Your Routine', description: 'put it all together' },
    ],

    routine: {
      title: 'Your 2-Minute Daily Routine',
      items: [
        'Chin tucks — 5 reps',
        'Scapular retractions — 10 reps',
        'Upper trap stretch — 20 seconds each side',
        'Three slow breaths',
      ],
      footer: 'Do this once or twice a day. No equipment needed.',
    },

    welcome: {
      intro: `You're one step away from joining the 5-Day Tech Neck Challenge. Over 5 days, you'll get evidence-based stretches, strengthening exercises, and posture tips — ending with a 2-minute daily routine you can keep forever.`,
      nextStep: `You're signed up! Next step: verify your phone and pay $1 to lock in your spot.`,
    },

    summary: {
      whatsNext: `The Tech Neck Challenge was a taste of what consistent, guided habit-building looks like. Summit takes this further — personalized habits, daily tracking via SMS, weekly reflection, and coaching support to help you reach your health goals.`,
      sharePromptHeading: `Know someone who needs this?`,
      sharePromptBody: `If you enjoyed the challenge, share it with a friend or coworker. They'll start next Monday — same 5 days, same $1.`,
    },
  },

  'movement': {
    slug: 'movement',
    displayName: 'Movement Challenge',
    shortName: 'Movement',
    brandLine: '5-Day Movement Challenge',
    routePath: '/movement',

    dayThemes: {
      1: { title: 'Awareness', subtitle: 'Break the sit' },
      2: { title: 'Mobility', subtitle: 'Open what\'s locked' },
      3: { title: 'Strength', subtitle: 'Anti-sitting micro-moves' },
      4: { title: 'Energy', subtitle: 'Walking is the unlock' },
      5: { title: 'Your Movement Snack', subtitle: 'Five minutes you\'ll actually do' },
    },

    messages: {
      1: {
        '8am': `Morning ☀️ This week we're tackling the real problem with desk life — not lack of exercise, but the hours of stillness in between. Today is about noticing. First task: stand up right now. Walk to the window or fill a glass of water. 60 seconds. The point is the interruption, not the activity. We're going to do that a lot today — and you're going to feel different by Friday.`,
        '10am': `Stand up. Walk to the kitchen, the bathroom, anywhere. Two minutes. What matters isn't the length of the break, it's the interruption — even brief standing shifts blood flow, glucose response, and back stiffness. This is the easiest habit you'll build all year, and it might be the most useful.`,
        '12pm': `Lunch is the best opportunity of the day to build a real movement break — and most people skip it. After you eat, walk for 5 minutes. That's it. Outside is best, but a hallway works. A 5-minute post-meal walk lowers blood sugar more than any supplement or biohack. Free, simple, and you'll feel sharper coming back to your desk.`,
        '3pm': `The 3pm slump usually isn't tiredness — it's stagnation. You've been sitting for 6+ hours. Stand up, take 50 steps (count them), stretch your arms overhead. 90 seconds. Then go ahead and have your coffee if you still want it. Bet you'll be surprised how much the movement alone wakes you up.`,
        '5pm': `Day one done 👏 The win today wasn't a workout — it was noticing how long you sit without thinking about it. The principle going forward: any movement counts, more is better than less, that's the whole game. Tomorrow we open up what's been locked from sitting all day. Get ready to feel some space in your hips. See you in the morning.`,
      },
      2: {
        '8am': `Morning ☀️ Yesterday was about interrupting the sit. Today we open what sitting locks down. Three places get tight: the front of your hips, your mid-back, and your chest. We'll hit all three. Start with this: kneel on one knee like you're proposing, tuck your tailbone under, gently push your hip forward. Hold 20 seconds, switch sides. That's the most underrated stretch on the planet.`,
        '10am': `Stand up. Reach both arms straight overhead, then lean to one side, then the other. Hold 10 seconds each way. Sitting compresses your spine and side body — this opens both. It looks like a stretch from a cheesy office video. It works.`,
        '12pm': `Mid-back time. Sit at the edge of your chair, twist gently to the right, hold the back of the chair with your left hand. Breathe deep into the stretch, hold 20 seconds, switch sides. Sitting all day rounds your upper back forward — this rotation undoes the day in 60 seconds. Bonus: it's the move your spine has been begging for.`,
        '3pm': `Combine. Stand up, walk for 30 seconds, do one hip opener, do one overhead reach. 90 seconds total. This is the pattern that beats sitting: interrupt, walk, open. Stack it once today and notice how your body responds — most people are surprised.`,
        '5pm': `Day two done 👏 The tightness you're feeling now is awareness, not damage — your body just paid attention to areas you hadn't asked about in a while. Tomorrow we shift again: from opening to building. The muscles that sitting weakens get a turn. See you in the morning.`,
      },
      3: {
        '8am': `Morning ☀️ Two days in: more aware (Day 1), more open (Day 2). Today we wake up what sitting puts to sleep. Three muscle groups: glutes, mid-back, deep core. First move: 10 glute bridges. Lie on your back, knees bent, lift your hips, squeeze your glutes hard, lower. The most-asleep muscle group in the modern body just got an alarm clock.`,
        '10am': `Try a scapular pull. Sit tall, pretend you're holding a pencil between your shoulder blades, squeeze them together for 3 seconds, release. Do 10 reps. This is the antidote to the rounded-shoulder posture sitting creates. Your upper back has been on a 6-hour vacation — time to bring it back.`,
        '12pm': `Dead bug — I know, the name is awful. Lie on your back, arms straight up, knees bent at 90 degrees. Lower your right arm overhead and your left leg toward the floor at the same time. Slowly. Switch. 8 reps total. This wakes up deep core in a way crunches never will, and your back will feel different by tomorrow.`,
        '3pm': `Combine. 5 glute bridges, 5 scap pulls, 5 dead bugs. 90 seconds — and you've hit all three sleeping muscle groups. Strength work is quieter than mobility — you won't feel an instant release. But this is the layer that holds everything else in place. Worth showing up for.`,
        '5pm': `Day three done 👏 The muscles that woke up today might feel a little tender tomorrow — that's the right kind of feedback, not soreness. You used something that hadn't been used. Tomorrow we get to walking, which sounds basic until you actually do it on purpose. See you in the morning.`,
      },
      4: {
        '8am': `Morning ☀️ Today is the easiest day of the challenge: walk. Not "go for a workout walk." Just walk. First task: a 10-minute walk before noon. Outside if possible, but treadmill, around the block, between meetings — all count. Walking does more for mood, blood sugar, focus, and creativity than almost anything else free, and we treat it like an afterthought.`,
        '10am': `If you haven't walked yet, this is your nudge. 10 minutes is the floor — you can do that. The data on walking is almost embarrassing: lower stress hormones, better blood pressure, more creative thinking. It's the one habit cardiologists, psychiatrists, and neuroscientists all recommend. Yet most of us sit through it.`,
        '12pm': `Post-meal walk, round two. (You did one on Day 1, right?) 5 minutes after lunch. The blood sugar effect is the headline — but the mental part might be bigger. A walk creates space between work and work, and your brain treats that as real rest. Leave the phone in your pocket. Notice what surfaces.`,
        '3pm': `Afternoon walk option: 5 minutes outside, no phone, no podcast. I know that sounds boring. It's not — it's how walking actually works on you. Natural light, movement, and zero input together create a nervous system reset that no app can replicate. Even 5 minutes in the parking lot counts.`,
        '5pm': `Day four done 👏 If you walked even once today, you crossed a line most desk workers never do — you used your body for something you didn't have to. Tomorrow we put this whole week into a 5-minute routine you can actually keep. Bring an open mind. See you in the morning.`,
      },
      5: {
        '8am': `Morning ☀️ Last day. This week you've covered awareness, mobility, strength, and energy. Today is about distilling that into one tiny daily practice you'll actually do forever. Here it is, the 5-minute movement snack: 1 minute mobility (hip opener + side reach), 1 minute strength (10 glute bridges + 10 scap pulls), 3 minutes walking. Do it now as your morning version. Then once more later today.`,
        '10am': `Habits don't stick because of motivation — they stick because of triggers. Pick yours today. The most reliable triggers are routines you already have: every morning coffee, every Zoom call ending, every time you walk into the kitchen. Attach the 5-minute snack to one of those, and it's already mostly done.`,
        '12pm': `Post-lunch walk one more time. 5 minutes. By now you've done this enough to know how you feel after. Most people start to actually want it, not as a chore but as a reset. That shift — from "should" to "want" — is the whole point of the week.`,
        '3pm': `Run through the 5-minute snack one more time. Do it now, even if you've already done it today. Repetition this week builds the muscle memory and the trigger-link. The goal isn't to crush it — it's to make it so easy that on a tired Tuesday in three weeks, you'll still do it.`,
        '5pm': `You finished 👏 Five days, four habits, one big shift: from "I should move more" to actually moving more. Keep it small, attach it to a trigger, and your future self will thank you. Genuinely glad you did this.\n\nWant to keep this going? Try Summit free — personalized habits, daily SMS check-ins, weekly reflection. Same kind of texts, dialed in for your goals: go.summithealth.app/pricing`,
      },
    },

    // Email Day 5 5pm has more reflective copy than the SMS (which ends with a trial CTA).
    emailMessageOverrides: {
      5: {
        '5pm': `You finished 👏 Five days, four habits, one big shift: from "I should move more" to actually moving more. The 5-minute snack works. The only question is whether it becomes part of your day or fades by Tuesday. Keep it small, attach it to a trigger, and your future self will thank you. Genuinely glad you did this.`,
      },
    },

    landingPreview: [
      { dayLabel: 'Monday', theme: 'Awareness', description: 'Break the sitting habit and interrupt the stillness' },
      { dayLabel: 'Tuesday', theme: 'Mobility', description: 'Open hips, mid-back, and chest in 60 seconds at a time' },
      { dayLabel: 'Wednesday', theme: 'Strength', description: 'Wake up the muscles sitting puts to sleep' },
      { dayLabel: 'Thursday', theme: 'Energy', description: 'Walking as the underrated tool for mood, focus, and blood sugar' },
      { dayLabel: 'Friday', theme: 'Your Snack', description: "A 5-minute daily routine you'll do for years" },
    ],

    welcomePreview: [
      { dayLabel: 'Monday', theme: 'Awareness', description: 'Break the sit, build the interrupt habit' },
      { dayLabel: 'Tuesday', theme: 'Mobility', description: 'Open hips, mid-back, and chest' },
      { dayLabel: 'Wednesday', theme: 'Strength', description: 'Wake up the muscles sitting puts to sleep' },
      { dayLabel: 'Thursday', theme: 'Energy', description: 'Walking as the underrated tool' },
      { dayLabel: 'Friday', theme: 'Your Snack', description: 'A 5-minute daily routine that sticks' },
    ],

    weekRecap: [
      { dayLabel: 'Monday', theme: 'Awareness', description: 'interrupted the sit, noticed the pattern' },
      { dayLabel: 'Tuesday', theme: 'Mobility', description: 'opened hips, side body, mid-back' },
      { dayLabel: 'Wednesday', theme: 'Strength', description: 'glute bridges, scap pulls, dead bugs' },
      { dayLabel: 'Thursday', theme: 'Energy', description: 'walked on purpose, not by accident' },
      { dayLabel: 'Friday', theme: 'Your Snack', description: 'packaged it into 5 minutes' },
    ],

    routine: {
      title: 'Your 5-Minute Movement Snack',
      items: [
        '1 minute mobility — hip opener + side reach',
        '1 minute strength — 10 glute bridges + 10 scap pulls',
        '3 minutes walking',
      ],
      footer: 'Do this once or twice a day. No equipment, no gym, just five minutes.',
    },

    welcome: {
      intro: `You're one step away from joining the 5-Day Movement Challenge. Over 5 days, you'll get small, science-backed prompts to break up the hours of stillness that come with desk life — ending with a 5-minute daily movement snack you can actually keep.`,
      nextStep: `You're signed up! Next step: verify your phone and pay $1 to lock in your spot.`,
    },

    summary: {
      whatsNext: `This week was a taste of what consistent SMS coaching looks like. Summit takes it further — personalized habits, daily check-ins, weekly reflection, and a coach who actually knows what you're working on. Try it free.`,
      sharePromptHeading: `Know someone who needs this?`,
      sharePromptBody: `If you enjoyed the challenge, share it with a friend or coworker. They'll start next Monday — same 5 days, same $1.`,
    },
  },
}

export function getLiteChallenge(slug: string): LiteChallenge | null {
  return LITE_CHALLENGES[slug] ?? null
}

export function getMessage(
  challenge: LiteChallenge,
  day: number,
  slot: string,
  channel: 'sms' | 'email',
): string | null {
  if (channel === 'email') {
    const override = challenge.emailMessageOverrides?.[day]?.[slot]
    if (override) return override
  }
  return challenge.messages[day]?.[slot] ?? null
}

export function welcomeSubject(challenge: LiteChallenge, firstName: string): string {
  return `Welcome to the ${challenge.displayName}, ${firstName}!`
}

export function dailySubject(challenge: LiteChallenge, day: number): string {
  return `Day ${day}: ${challenge.dayThemes[day].title} - ${challenge.displayName}`
}

export function summarySubject(challenge: LiteChallenge, firstName: string): string {
  return `Challenge Complete! Your 2-Minute ${challenge.shortName} Routine, ${firstName}`
}

export function isContentReady(challenge: LiteChallenge): boolean {
  for (let day = 1; day <= 5; day++) {
    for (const slot of ['8am', '10am', '12pm', '3pm', '5pm']) {
      if (!challenge.messages?.[day]?.[slot]) return false
    }
  }
  return true
}
