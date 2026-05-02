// Frontend mirror of supabase/functions/_shared/lite_challenges.ts
// Drives the slug-aware Landing / Status / Success pages.
// When adding a new lite challenge, add an entry here AND in the Deno registry.

export const LITE_CHALLENGES = {
  'tech-neck': {
    slug: 'tech-neck',
    displayName: 'Tech Neck Challenge',
    shortName: 'Tech Neck',
    brandLine: '5-Day Tech Neck Challenge',
    routePath: '/tech-neck',

    hero: {
      title: '5-Day Tech Neck Challenge',
      description: 'Fix your posture in 2 minutes a day. Get 5 daily coaching texts with evidence-based stretches, strengthening exercises, and a routine you can keep.',
      bannerText: 'Sign up today, start next Monday — 5 days of coaching texts',
    },

    benefits: [
      '25 coaching texts over 5 days (5/day)',
      'Evidence-based exercises and stretches',
      'A 2-minute daily routine you can keep forever',
      'Morning email overview each day',
    ],

    landingPreview: [
      { dayLabel: 'Monday', theme: 'Environment', description: 'Fix your screen setup and workspace ergonomics' },
      { dayLabel: 'Tuesday', theme: 'Release', description: 'Stretch and release built-up neck and shoulder tension' },
      { dayLabel: 'Wednesday', theme: 'Strengthen', description: 'Build the muscles that prevent tech neck from returning' },
      { dayLabel: 'Thursday', theme: 'Breathe & Reset', description: 'Address the stress and nervous system tension underneath' },
      { dayLabel: 'Friday', theme: 'Your Routine', description: 'Combine everything into a 2-minute daily practice' },
    ],

    dayThemes: {
      1: 'Environment',
      2: 'Release',
      3: 'Strengthen',
      4: 'Breathe & Reset',
      5: 'Your Daily Routine',
    },

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

    // What the user gets — used on Status (pending/pre-start) and Success pages
    expectations: {
      sms: [
        '5 coaching texts per day (8am - 5pm)',
        'A morning email overview each day',
        'End-of-challenge summary with your routine',
      ],
      emailOnly: [
        'A daily email with all 5 coaching cues',
        'End-of-challenge summary with your routine',
      ],
    },

    // Single-line outcome promise shown on the pending state (before payment)
    outcomePromise: 'Better posture, and awareness of your triggers',

    // SMS consent checkbox label
    smsConsentLabel: 'Get 5 daily texts with real-time coaching cues',
    smsConsentDescription: 'Strongly recommended for best results. Standard message rates apply.',

    completedTitle: 'Challenge Complete!',
    completedDescription: "You made it through all 5 days. Here's what to keep doing.",
  },

  'movement': {
    slug: 'movement',
    displayName: 'Movement Challenge',
    shortName: 'Movement',
    brandLine: '5-Day Movement Challenge',
    routePath: '/movement',

    hero: {
      title: '5-Day Movement Challenge',
      description: "Beat desk life with 2 minutes at a time. Five days of coaching texts that interrupt sitting, open what's tight, and build a 5-minute movement snack you'll actually keep.",
      bannerText: 'Sign up today, start next Monday — 5 days of coaching texts',
    },

    benefits: [
      '25 coaching texts over 5 days (5/day)',
      'Evidence-based mobility, strength, and walking cues',
      'A 5-minute daily movement snack you can keep forever',
      'Morning email overview each day',
    ],

    landingPreview: [
      { dayLabel: 'Monday', theme: 'Awareness', description: 'Break the sitting habit and interrupt the stillness' },
      { dayLabel: 'Tuesday', theme: 'Mobility', description: 'Open hips, mid-back, and chest in 60 seconds at a time' },
      { dayLabel: 'Wednesday', theme: 'Strength', description: 'Wake up the muscles sitting puts to sleep' },
      { dayLabel: 'Thursday', theme: 'Energy', description: 'Walking as the underrated tool for mood, focus, and blood sugar' },
      { dayLabel: 'Friday', theme: 'Your Snack', description: "A 5-minute daily routine you'll do for years" },
    ],

    dayThemes: {
      1: 'Awareness',
      2: 'Mobility',
      3: 'Strength',
      4: 'Energy',
      5: 'Your Movement Snack',
    },

    routine: {
      title: 'Your 5-Minute Movement Snack',
      items: [
        '1 minute mobility — hip opener + side reach',
        '1 minute strength — 10 glute bridges + 10 scap pulls',
        '3 minutes walking',
      ],
      footer: 'Do this once or twice a day. No equipment, no gym, just five minutes.',
    },

    expectations: {
      sms: [
        '5 coaching texts per day (8am - 5pm)',
        'A morning email overview each day',
        'End-of-challenge summary with your routine',
      ],
      emailOnly: [
        'A daily email with all 5 coaching cues',
        'End-of-challenge summary with your routine',
      ],
    },

    outcomePromise: 'More energy, less stiffness, and a daily practice that actually fits',

    smsConsentLabel: 'Get 5 daily texts with real-time movement cues',
    smsConsentDescription: 'Strongly recommended for best results. Standard message rates apply.',

    completedTitle: 'Challenge Complete!',
    completedDescription: "You made it through all 5 days. Here's the routine to keep doing.",
  },
}

export function getLiteChallenge(slug) {
  return LITE_CHALLENGES[slug] ?? null
}
