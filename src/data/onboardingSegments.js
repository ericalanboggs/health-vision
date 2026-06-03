// Marketing onboarding segments.
//
// Single source of truth for the acquisition-source slugs we tailor onboarding
// for. These match the `?source=` tags on the Framer landing pages (see
// src/lib/acquisition.js) and the value stored in profiles.acquisition_source.
//
// A user whose source matches one of these gets the segment welcome screen
// (/welcome, src/pages/SegmentWelcome.jsx) before the Vision flow — acknowledging
// why they came, then asking what change they want and why now. That answer seeds
// the Vision flow and the AI habit suggestions (src/utils/aiService.js).
//
// Three segments today: burnout, postpartum, lifestyle-changes (cholesterol /
// men's health are its primary themes). Keys must match the Framer ?source= tag
// exactly. To add or tune a segment, edit this file only. Organic / unknown-source
// users fall through to the generic /start screen.
//
// Copy reviewed against SUMMIT_COACH_VOICE.md (2026-06-03): direct openers, short
// sentences, no "thanks for sharing" restatement. Re-run the voice guide on any edit.

const SEGMENTS = {
  burnout: {
    label: 'Burnout',
    headline: "Burnout isn't a willpower problem.",
    ack: "It's a sign your days stopped matching what matters to you. You don't need another app barking orders — you need a few small things that put energy back. We'll start there. Tell us what's running you down.",
    whatPrompt: "What's draining you most right now — and what would you change?",
    whyPrompt: "Why does changing it matter right now?",
    // Personalizes the "Why Vision Matters" card on the Vision intro.
    visionIntro: {
      ack: "You've named what's draining you. Now the part that makes the fix hold.",
      heading: "Why vision matters when you're burned out",
      lead: "When you're running on empty, willpower goes first. A clear why holds when motivation doesn't — so the small habits survive the hard days. That's the anchor we build on.",
    },
  },
  postpartum: {
    label: 'Postpartum',
    headline: "You had a baby. Let's find you again.",
    ack: "Between the feeds, the nights, and caring for everyone else, it's easy to lose yourself. This isn't about \"bouncing back.\" It's about putting a little strength and steadiness back into the life you have now. Small steps, on your terms.",
    whatPrompt: "What would you most like to feel or get back for yourself?",
    whyPrompt: "Why does it matter to you right now?",
    visionIntro: {
      ack: "You said what you want back. Here's what makes it real.",
      heading: "Why vision matters in postpartum",
      lead: "This season runs on everyone else's needs. A clear why — for you — is what you'll come back to when the days blur together. It's also what makes a small habit actually stick.",
    },
  },
  'lifestyle-changes': {
    label: 'Lifestyle Changes',
    headline: "Lifestyle change? Smart move — let's make it stick.",
    ack: "Maybe there's a number you want to move — cholesterol, blood pressure, weight. Maybe you just want your energy back. Either way, lasting change doesn't come from an overhaul. It comes from a few small habits you'll actually keep. Tell us what you're after.",
    whatPrompt: "What would you like to change — and is there a number or goal behind it?",
    whyPrompt: "Why does it matter to you right now?",
    visionIntro: {
      ack: "You've got the goal. Now let's give it staying power.",
      heading: "Why vision matters when tackling lifestyle changes",
      lead: "Lifestyle change is hard, and most people start with the what — the diet, the plan. The ones who stick start with the why. Get that clear, and it's what you'll come back to when motivation dips.",
    },
  },
}

/** Segment config for an acquisition source, or null if not a tailored segment. */
export const getSegment = (source) => (source && SEGMENTS[source]) || null

export default SEGMENTS
